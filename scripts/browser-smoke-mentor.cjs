const { chromium } = require('playwright');
const path = require('node:path');

const baseUrl = process.env.MENTOR_SMOKE_URL || 'http://127.0.0.1:4175';
const screenshotPath = path.resolve(process.cwd(), 'artifacts', 'mentor-browser-smoke.png');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  const mentorNetwork = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('response', (response) => { if (/\/auth\/anonymous|\/mentor\//.test(response.url())) mentorNetwork.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', (request) => { if (/\/auth\/anonymous|\/mentor\//.test(request.url())) mentorNetwork.push(`FAILED ${request.url()} ${request.failure()?.errorText ?? ''}`); });
  await page.addInitScript(() => {
    localStorage.setItem('od-practice-state-v1', JSON.stringify({
      version: 1,
      drafts: {},
      attempts: [{
        id: 'browser-attempt-1', problemId: 'od-71a5033ee94c', language: 'java', mode: 'sample-submit',
        codeSnapshot: 'class Main { static int solve(int[] a) { for (int i = 0; i <= a.length; i++) { if (a[i] > 0) return a[i]; } return 0; } }',
        outcome: 'wrong-answer', summary: '公开样例 0/2 通过', passedCount: 0, totalCount: 2, createdAt: '2026-08-11T00:00:00Z',
      }],
    }));
  });
  // Mentor starts a model request immediately, so networkidle is not a valid
  // readiness signal. Wait for the document, then assert the actual UI states.
  await page.goto(`${baseUrl}/#/problem/od-71a5033ee94c`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.getByText('Mentor', { exact: true }).waitFor({ timeout: 15_000 });
  process.stdout.write('mentor-mounted\n');
  try { await page.getByText(/DeepSeek · deepseek-v4-flash/).waitFor({ timeout: 60_000 }); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ mentorNetwork, consoleErrors, body: (await page.locator('body').innerText()).slice(-2_000) })}\n`);
    throw error;
  }
  process.stdout.write('deepseek-timeline-visible\n');
  const prediction = page.getByLabel('你的状态预测');
  await prediction.fill('当 i 等于数组长度时会访问不存在的 length 下标并越界');
  await page.getByRole('button', { name: '提交预测' }).click();
  await page.getByText('awaiting-edit', { exact: true }).waitFor({ timeout: 35_000 });
  const facts = await page.evaluate(() => {
    const mentor = document.querySelector('.mentor-timeline');
    const problem = document.querySelector('.problem-pane');
    const color = mentor ? getComputedStyle(mentor).backgroundColor : '';
    return {
      title: document.querySelector('.problem-header h1')?.textContent?.trim(),
      hasCode: Boolean(document.querySelector('.editor-pane')),
      hasMentor: Boolean(mentor),
      hasProblem: Boolean(problem),
      aiCoachTabs: [...document.querySelectorAll('[role="tab"]')].filter((item) => item.textContent?.includes('AI 教练')).length,
      mentorBackground: color,
      timelineEvents: document.querySelectorAll('.mentor-event').length,
      phase: document.querySelector('.mentor-phase-row strong')?.textContent?.trim(),
      platform: document.querySelector('.mentor-platform-status')?.textContent?.trim(),
    };
  });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  if (!facts.hasCode || !facts.hasMentor || !facts.hasProblem || facts.aiCoachTabs !== 0 || facts.phase !== 'awaiting-edit' || facts.timelineEvents < 3 || facts.platform !== 'PostgreSQL 持久化 · 签名身份') {
    throw new Error(`Mentor workspace assertion failed: ${JSON.stringify(facts)}`);
  }
  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
  process.stdout.write(`${JSON.stringify({ ok: true, url: page.url(), screenshotPath, facts, consoleErrors })}\n`);
  } finally {
  await browser.close();
  }
})().catch(async (error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});

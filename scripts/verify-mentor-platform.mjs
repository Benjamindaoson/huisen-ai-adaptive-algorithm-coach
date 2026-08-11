import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const baseUrl = process.env.MENTOR_VERIFY_URL || 'http://127.0.0.1:8787';

async function post(path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function readSession(id, learnerId, token) {
  return fetch(`${baseUrl}/mentor/sessions/${id}?learnerId=${encodeURIComponent(learnerId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) return response.json();
    } catch {
      // Restart briefly closes the listener.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Gateway did not recover after restart');
}

const learnerA = `verify-a-${randomUUID()}`;
const learnerB = `verify-b-${randomUUID()}`;
const identityA = await post('/auth/anonymous', { version: 1, learnerId: learnerA });
const identityB = await post('/auth/anonymous', { version: 1, learnerId: learnerB });
const created = await post('/mentor/sessions', {
  version: 1,
  learnerId: learnerA,
  problem: {
    id: 'od-71a5033ee94c',
    title: '平台持久化验证题',
    description: '读取输入并输出结果。',
    input: '标准输入',
    output: '标准输出',
    skillIds: ['io'],
    publicInputs: ['1\n5\n1'],
  },
  attempt: {
    id: `attempt-${randomUUID()}`,
    language: 'javascript',
    outcome: 'wrong-answer',
    summary: '0/1',
    sourceCode: 'const n = 1; console.log(n + 1);',
    passedCount: 0,
    totalCount: 1,
  },
}, identityA.token);

const beforeResponse = await readSession(created.session.id, learnerA, identityA.token);
if (!beforeResponse.ok) throw new Error(`Owner read before restart returned ${beforeResponse.status}`);
const before = await beforeResponse.json();

execFileSync('docker', ['restart', 'runner-gateway-1'], { stdio: 'ignore' });
const health = await waitForHealth();

const afterResponse = await readSession(created.session.id, learnerA, identityA.token);
if (!afterResponse.ok) throw new Error(`Owner read after restart returned ${afterResponse.status}`);
const after = await afterResponse.json();
const crossOwner = await readSession(created.session.id, learnerB, identityB.token);

const evidence = {
  sessionIdStable: before.id === after.id,
  timelineStable: before.timeline.length === after.timeline.length,
  storage: created.platform.storage,
  identity: created.platform.identity,
  modelMode: created.provider.mode,
  crossOwnerStatus: crossOwner.status,
  health,
};

if (!evidence.sessionIdStable || !evidence.timelineStable) throw new Error('Session did not survive restart');
if (evidence.storage !== 'postgres' || evidence.identity !== 'signed') throw new Error('Durable signed platform is not active');
if (![401, 404].includes(evidence.crossOwnerStatus)) throw new Error(`Cross-owner read returned ${evidence.crossOwnerStatus}`);
console.log(JSON.stringify(evidence));

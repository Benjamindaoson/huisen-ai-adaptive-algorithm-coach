// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import type { ProblemRecord } from '../lib/catalog';
import type { PracticeAttempt } from '../lib/practice';
import { MentorTimeline } from './MentorTimeline';

const problem: ProblemRecord = {
  id: 'p1', title: '数组边界', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test', tags: [], completeness: 'complete', skills: ['array'],
  sections: { description: '描述', input: '输入', output: '输出', examples: [] }, solutions: { javascript: 'answer' },
};
const attempt: PracticeAttempt = { id: 'a1', problemId: 'p1', language: 'javascript', mode: 'sample-submit', codeSnapshot: 'for(let i=0;i<=a.length;i++){}', outcome: 'wrong-answer', summary: '公开样例 0/1', passedCount: 0, totalCount: 1, createdAt: '2026-08-11T00:00:00Z' };

function response(phase: 'awaiting-prediction' | 'awaiting-edit' | 'transfer') {
  return {
    version: 1,
    session: {
      version: 1, id: 'session-1', learnerId: 'learner-a', problemId: 'p1', phase, mode: 'deepseek', model: 'deepseek-v4-flash', judgeOutcome: 'wrong-answer', nextAction: phase === 'awaiting-prediction' ? '预测访问的下标' : phase === 'transfer' ? '完成一道同技能迁移题' : '只修改循环上界',
      timeline: [
        { id: 'e1', type: 'observation', title: '我观察到了什么', detail: '公开样例 0/1', at: '2026-08-11T00:00:00Z', evidenceRefs: ['judge:p1:public'], status: 'complete' },
        { id: 'e2', type: phase === 'awaiting-prediction' ? 'learner-question' : 'learner-action', title: phase === 'awaiting-prediction' ? '先预测，再修改' : '建议你下一步只改哪里', detail: phase === 'awaiting-prediction' ? '当 i 等于 length 时访问什么？' : '只修改循环上界', at: '2026-08-11T00:00:01Z', evidenceRefs: ['ast:line:1'], status: 'unverified' },
      ],
      ...(phase === 'awaiting-prediction' ? { pendingPrompt: { question: '当 i 等于 length 时访问什么？', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['ast:line:1'] } } : {}),
      ...(phase === 'transfer' ? { transferTask: { problemId: 'p2', title: '区间边界迁移题', skillIds: ['array'], evidenceRefs: ['problem:p2'] } } : {}),
      twin: { version: 1, learnerId: 'learner-a', updatedAt: '2026-08-11T00:00:00Z', skills: {}, lastChanges: phase === 'transfer' ? [{ skillId: 'array', prior: 0.25, posterior: 0.42, evidenceRef: 'judge:p1:a2', kind: 'assisted-pass' }] : [] },
    },
    executions: [], provider: { mode: 'deepseek', model: 'deepseek-v4-flash', calls: 2, inputTokens: 100, outputTokens: 30, latencyMs: 420 },
    platform: { storage: 'postgres', identity: 'signed' },
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('waits for a real run before showing a contextual diagnosis', () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);

  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} sampleCases={[]} />);

  expect(screen.getByText('先写、再运行，Mentor 才开始工作')).toBeTruthy();
  expect(screen.queryByLabelText('Mentor 分析提交')).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

it('keeps a live Mentor timeline beside the editor and closes the prediction loop', async () => {
  let mentorCall = 0;
  const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
    const url = String(_input);
    if (url.endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    mentorCall += 1;
    if (mentorCall === 1) return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    return Promise.resolve(new Response(JSON.stringify(response(mentorCall === 2 ? 'awaiting-prediction' : 'awaiting-edit')), { status: mentorCall === 2 ? 201 : 200 }));
  });
  vi.stubGlobal('fetch', fetcher);
  render(<StrictMode><MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} /></StrictMode>);
  expect(await screen.findByText('我观察到了什么')).toBeTruthy();
  expect(screen.getByText('DeepSeek 已动态规划')).toBeTruthy();
  expect(screen.getByLabelText('AI 决策凭据').textContent).toContain('DeepSeek 动态规划');
  expect(screen.getByLabelText('AI 决策凭据').textContent).toContain('2 次模型决策');
  expect(screen.getByLabelText('AI 决策凭据').textContent).toContain('判题仍由运行服务决定');
  expect(screen.getByLabelText('Mentor 本轮运行证据').textContent).toContain('已核对 0 个分析步骤');
  expect(screen.getByLabelText('Mentor 本轮运行证据').textContent).toContain('2 条可引用证据');
  expect(screen.getByText('等待你的状态预测')).toBeTruthy();
  expect(screen.getByLabelText('Mentor 教学闭环').querySelector('[aria-current="step"]')?.textContent).toBe('预测');
  expect(screen.getByLabelText('本轮训练技能').textContent).toContain('本轮训练：数组与序列');
  expect(screen.getByLabelText('本轮训练技能').textContent).toContain('答对只更新这一项能力证据');
  const predictionForm = screen.getByLabelText('你的状态预测').closest('form');
  const eventTimeline = screen.getByText('我观察到了什么').closest('.mentor-events');
  expect(predictionForm).toBeTruthy();
  expect(eventTimeline).toBeTruthy();
  expect(predictionForm!.compareDocumentPosition(eventTimeline!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const attemptBinding = screen.getByLabelText('Mentor 分析提交');
  const aiReceipt = screen.getByLabelText('AI 决策凭据');
  expect(predictionForm!.compareDocumentPosition(attemptBinding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(predictionForm!.compareDocumentPosition(aiReceipt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(predictionForm!.textContent).toContain('预测访问的下标');
  expect(screen.getByText('PostgreSQL 持久化 · 签名身份')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('你的状态预测'), { target: { value: '会访问 length 下标并越界' } });
  fireEvent.click(screen.getByRole('button', { name: '提交预测' }));
  expect(await screen.findByText('建议你下一步只改哪里')).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/mentor/sessions/session-1/turns'))).toBe(true);
});

it('explains a supported prediction as a limited increase instead of a downward update', async () => {
  const current = response('awaiting-edit');
  current.session.twin.lastChanges = [{ skillId: 'array', prior: 0.12, posterior: 0.14, evidenceRef: 'learner-response:1', kind: 'prediction-correct' }];
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify(current), { status: 201 }));
  }));

  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} />);

  const card = await screen.findByLabelText('能力档案刚刚更新');
  expect(card.textContent).toContain('12% → 14%');
  expect(card.textContent).toContain('关键判断得到支持');
  expect(card.textContent).toContain('独立完成和迁移验证');
  expect(card.textContent).not.toContain('系统只下调');
});

it('labels a zero-call learner-response projection without claiming new model work', async () => {
  const current = response('awaiting-edit');
  current.provider = { mode: 'deepseek', model: 'deepseek-v4-flash', calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 };
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify(current), { status: 201 }));
  }));

  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} />);

  const receipt = await screen.findByLabelText('AI 决策凭据');
  expect(receipt.textContent).toContain('本轮无需再次调用模型');
  expect(receipt.textContent).toContain('沿用上一步 AI 问题的验证标准');
  expect(receipt.textContent).not.toContain('AI 正在真实工作');
  expect(receipt.textContent).not.toContain('DeepSeek 动态规划');
});

it('binds analysis to the immutable attempt and labels later editor changes', async () => {
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify({
      ...response('awaiting-edit'),
      executions: [{ id: 'run-1', tool: 'verify_hypothesis', summary: '执行 2 个差分测试', evidenceRefs: ['execution:test-1'], durationMs: 18 }],
    }), { status: 201 }));
  }));
  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} currentSourceCode="for(let i=0;i<a.length;i++){}" sampleCases={[]} />);
  expect(await screen.findByText('分析提交 a1')).toBeTruthy();
  expect(screen.getByText('当前代码已修改')).toBeTruthy();
  expect(screen.getByText(/样例提交 · JavaScript · 2026/)).toBeTruthy();
  expect(screen.getByText('已验证')).toBeTruthy();
  expect(screen.getByText('待验证')).toBeTruthy();
  expect(screen.getByText(/verify_hypothesis · 18 ms/)).toBeTruthy();
  expect(screen.getByText(/-1 行 · \+1 行/)).toBeTruthy();
});

it('labels the non-model local fallback honestly when the service is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} />);
  expect(await screen.findByText('本地静态回退 · 未验证')).toBeTruthy();
  expect(screen.getByText(/没有伪造模型诊断/)).toBeTruthy();
});

it('runs the real mentor through the shared Mentor OS event stream when a run is available', async () => {
  const onCheckpoint = vi.fn();
  const fetcher = vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify({ id: 'run-os', learnerId: 'learner-a', sequence: 9, events: [], checkpoint: { sequence: 9, nextAction: '预测访问的下标', stopReason: 'awaiting-learner' }, mentorResult: response('awaiting-prediction') }), { status: 200 }));
  });
  vi.stubGlobal('fetch', fetcher);
  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 3 }} onMentorOSCheckpoint={onCheckpoint} />);
  expect(await screen.findByText('我观察到了什么')).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/mentor-os/runs/run-os/commands'))).toBe(true);
  expect(onCheckpoint).toHaveBeenCalledWith(expect.objectContaining({ sequence: 9 }));
  expect(screen.getByLabelText('Mentor 主动停止原因').textContent).toContain('等待你继续操作');
});

it('executes one durable Mentor action for one attempt under React StrictMode', async () => {
  const fetcher = vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify({ id: 'run-os', learnerId: 'learner-a', sequence: 9, events: [], checkpoint: { sequence: 9, nextAction: '预测访问的下标', stopReason: 'awaiting-learner' }, mentorResult: response('awaiting-prediction') }), { status: 200 }));
  });
  vi.stubGlobal('fetch', fetcher);

  render(<StrictMode><MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 3 }} mentorOSRequired /></StrictMode>);

  expect(await screen.findByText('我观察到了什么')).toBeTruthy();
  expect(fetcher.mock.calls.filter(([url]) => String(url).includes('/mentor-os/runs/run-os/commands'))).toHaveLength(1);
});

it('shows the current attempt cycle instead of stale hypotheses from an earlier run', async () => {
  const current = response('awaiting-prediction');
  current.session.timeline = [
    { id: 'old-hypothesis', type: 'hypothesis', title: '目前最可能的问题', detail: '调用 require 未解析到当前文件中的函数定义。', at: '2026-08-11T00:00:00Z', evidenceRefs: ['ast:old'], status: 'unverified' },
    { id: 'current-observation', type: 'observation', title: '判题器给出的确定事实', detail: '当前运行完成', at: '2026-08-11T00:01:00Z', evidenceRefs: ['attempt:a1'], status: 'complete' },
    { id: 'current-question', type: 'learner-question', title: '先预测，再修改', detail: '当前应该先比较哪个排序键？', at: '2026-08-11T00:01:01Z', evidenceRefs: ['attempt:a1'], status: 'unverified' },
  ];
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    return Promise.resolve(new Response(JSON.stringify(current), { status: 201 }));
  }));

  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} />);

  expect(await screen.findByText('当前应该先比较哪个排序键？')).toBeTruthy();
  expect(screen.queryByText('调用 require 未解析到当前文件中的函数定义。')).toBeNull();
  expect(screen.getByLabelText('Mentor 本轮运行证据').textContent).toContain('1 条可引用证据');
});

it('shows only a truthful working state while a new attempt is being analyzed', async () => {
  let commandCall = 0;
  let resolveSecond!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    commandCall += 1;
    if (commandCall === 1) return Promise.resolve(new Response(JSON.stringify({ id: 'run-os', learnerId: 'learner-a', sequence: 9, events: [], checkpoint: { sequence: 9, nextAction: '旧的下一步', stopReason: 'awaiting-learner' }, mentorResult: response('awaiting-prediction') }), { status: 200 }));
    return new Promise<Response>((resolve) => { resolveSecond = resolve; });
  }));
  const view = render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 3 }} mentorOSRequired />);
  expect(await screen.findByText('我观察到了什么')).toBeTruthy();

  const revised = { ...attempt, id: 'a2', summary: '新一次运行', createdAt: '2026-08-11T00:02:00Z' };
  view.rerender(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={revised} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 9 }} mentorOSRequired />);

  expect(await screen.findByText('分析提交 a2')).toBeTruthy();
  expect(screen.getByText('正在观察…')).toBeTruthy();
  expect(screen.queryByLabelText('AI 决策凭据')).toBeNull();
  expect(screen.queryByText('我观察到了什么')).toBeNull();

  resolveSecond(new Response(JSON.stringify({ id: 'run-os', learnerId: 'learner-a', sequence: 15, events: [], checkpoint: { sequence: 15, nextAction: '新的下一步', stopReason: 'awaiting-learner' }, mentorResult: response('awaiting-prediction') }), { status: 200 }));
  expect(await screen.findByLabelText('AI 决策凭据')).toBeTruthy();
});

it('waits for the route-scoped Mentor OS instead of sending an untracked direct request', async () => {
  const fetcher = vi.fn((input: string | URL | Request) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    if (String(input).includes('/mentor-os/runs/run-scoped/commands')) return Promise.resolve(new Response(JSON.stringify({ id: 'run-scoped', learnerId: 'learner-a', sequence: 5, events: [], checkpoint: { sequence: 5, nextAction: '预测访问下标', stopReason: 'awaiting-learner' }, mentorResult: response('awaiting-prediction') }), { status: 200 }));
    return Promise.resolve(new Response(JSON.stringify(response('awaiting-prediction')), { status: 201 }));
  });
  vi.stubGlobal('fetch', fetcher);
  const view = render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} mentorOSRequired />);

  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/mentor/sessions'))).toBe(false);
  expect(screen.getByText('正在建立可恢复的分析记录…')).toBeTruthy();

  view.rerender(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} mentorOSRequired mentorOS={{ runId: 'run-scoped', cursor: 2 }} />);
  expect(await screen.findByText('我观察到了什么')).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/mentor-os/runs/run-scoped/commands'))).toBe(true);
});

it('keeps the same Mentor session when a revised submission verifies the intervention', async () => {
  const commandBodies: Array<Record<string, unknown>> = [];
  let mentorCall = 0;
  vi.stubGlobal('fetch', vi.fn((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-13T00:00:00Z', mode: 'signed' }), { status: 201 }));
    commandBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>);
    mentorCall += 1;
    const phase = mentorCall === 1 ? 'awaiting-prediction' : mentorCall === 2 ? 'awaiting-edit' : 'transfer';
    return Promise.resolve(new Response(JSON.stringify({ id: 'run-os', learnerId: 'learner-a', sequence: 3 + mentorCall, events: [], checkpoint: { sequence: 3 + mentorCall, nextAction: phase === 'transfer' ? '完成一道同技能迁移题' : '继续' }, mentorResult: response(phase) }), { status: 200 }));
  }));
  const onCheckpoint = vi.fn();
  const onOpenTransfer = vi.fn();
  const onRevisionVerified = vi.fn();
  const view = render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} currentSourceCode={attempt.codeSnapshot} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 3 }} onMentorOSCheckpoint={onCheckpoint} onOpenTransfer={onOpenTransfer} onRevisionVerified={onRevisionVerified} />);
  expect(await screen.findByLabelText('你的状态预测')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('你的状态预测'), { target: { value: '边界会越界' } });
  fireEvent.click(screen.getByRole('button', { name: '提交预测' }));
  expect(await screen.findByText('建议你下一步只改哪里')).toBeTruthy();
  expect(commandBodies[1]?.idempotencyKey).toMatch(/^prediction:a1:\d+$/);
  const revised: PracticeAttempt = { ...attempt, id: 'a2', codeSnapshot: 'for(let i=0;i<a.length;i++){}', outcome: 'passed', summary: '隐藏用例 2/2', passedCount: 2, totalCount: 2 };
  view.rerender(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={revised} currentSourceCode={revised.codeSnapshot} sampleCases={[]} mentorOS={{ runId: 'run-os', cursor: 5 }} onMentorOSCheckpoint={onCheckpoint} onOpenTransfer={onOpenTransfer} onRevisionVerified={onRevisionVerified} />);
  expect(await screen.findByText('完成一道同技能迁移题')).toBeTruthy();
  expect(onRevisionVerified).toHaveBeenCalledWith('a2');
  expect(commandBodies.at(-1)).toMatchObject({ kind: 'act', mentorSessionId: 'session-1' });
  expect(screen.getByLabelText('能力档案刚刚更新').textContent).toContain('array');
  fireEvent.click(screen.getByRole('button', { name: '开始独立迁移' }));
  expect(onOpenTransfer).toHaveBeenCalledWith(expect.objectContaining({ problemId: 'p2', title: '区间边界迁移题' }));
});

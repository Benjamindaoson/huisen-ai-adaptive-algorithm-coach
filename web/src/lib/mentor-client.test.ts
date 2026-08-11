import { describe, expect, it, vi } from 'vitest';
import type { ProblemRecord } from './catalog';
import type { PracticeAttempt } from './practice';
import { buildMentorRequest, continueMentorSession, startMentorSession } from './mentor-client';

const problem: ProblemRecord = {
  id: 'p1', title: '数组边界', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test', tags: [], completeness: 'complete', skills: ['array'],
  sections: { description: '描述', input: '输入', output: '输出', examples: [] }, solutions: { javascript: 'reference' },
};
const attempt: PracticeAttempt = {
  id: 'a1', problemId: 'p1', language: 'javascript', mode: 'sample-submit', codeSnapshot: 'for(let i=0;i<=a.length;i++){}', outcome: 'wrong-answer', summary: '0/1', passedCount: 0, totalCount: 1, createdAt: '2026-08-11T00:00:00Z',
};
const response = {
  version: 1,
  session: { version: 1, id: 'session-1', learnerId: 'learner-a', problemId: 'p1', phase: 'awaiting-prediction', mode: 'deepseek', model: 'deepseek-v4-flash', judgeOutcome: 'wrong-answer', nextAction: '预测下标', timeline: [{ id: 'e1', type: 'observation', title: '我观察到了什么', detail: '公开样例 0/1', at: '2026-08-11T00:00:00Z', evidenceRefs: ['judge:p1:public'], status: 'complete' }], twin: { version: 1, learnerId: 'learner-a', updatedAt: '2026-08-11T00:00:00Z', skills: {}, lastChanges: [] } },
  executions: [], provider: { mode: 'deepseek', model: 'deepseek-v4-flash', calls: 2, inputTokens: 100, outputTokens: 30, latencyMs: 400 },
};
const localIdentity = { headers: async () => ({}) };

describe('Mentor client', () => {
  it('builds a bounded request from public learner evidence only', () => {
    const request = buildMentorRequest('learner-a', problem, attempt, [{ id: 's1', name: '示例', stdin: '1\n0', expectedOutput: '0' }]);
    expect(request).toMatchObject({ learnerId: 'learner-a', problem: { skillIds: ['array'], publicInputs: ['1\n0'] }, attempt: { sourceCode: attempt.codeSnapshot } });
    expect(JSON.stringify(request)).not.toContain('reference');
    expect(request).not.toHaveProperty('hiddenTests');
  });

  it('starts and continues a parsed Mentor session', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...response, session: { ...response.session, phase: 'awaiting-edit', nextAction: '只改上界' } }), { status: 200 }));
    const request = buildMentorRequest('learner-a', problem, attempt, []);
    expect((await startMentorSession('http://localhost:8787', request, fetcher, undefined, localIdentity))?.session.id).toBe('session-1');
    expect((await continueMentorSession('http://localhost:8787', 'session-1', { ...request, learnerResponse: '越界' }, fetcher, undefined, localIdentity))?.session.phase).toBe('awaiting-edit');
    expect(fetcher.mock.calls[1][0]).toContain('/mentor/sessions/session-1/turns');
  });

  it('fails closed on malformed or unavailable responses', async () => {
    expect(await startMentorSession('http://localhost:8787', buildMentorRequest('learner-a', problem, attempt, []), async () => new Response('{}'), undefined, localIdentity)).toBeNull();
  });

  it('attaches the signed learner credential to Mentor requests', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify(response), { status: 201 }));
    const identity = { headers: async () => ({ authorization: 'Bearer signed-token' }) };
    await startMentorSession('http://localhost:8787', buildMentorRequest('learner-a', problem, attempt, []), fetcher, undefined, identity);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer signed-token' });
  });
});

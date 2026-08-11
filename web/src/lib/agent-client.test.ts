import { describe, expect, it, vi } from 'vitest';
import type { ProblemRecord } from './catalog';
import type { PracticeAttempt } from './practice';
import { buildAgentRequest, requestAgentRun } from './agent-client';

const problem: ProblemRecord = {
  id: 'p1', title: '数组题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test',
  sections: { description: '连续数组', input: '第一行数量，第二行数组', output: '最大值', examples: [] },
  solutions: { python: 'reference' }, tags: [], completeness: 'complete', skills: ['array'],
};
const attempt: PracticeAttempt = {
  id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(1)',
  outcome: 'wrong-answer', summary: '公开样例 0/1 通过', passedCount: 0, totalCount: 1, createdAt: '2026-08-11T00:00:00Z',
};

const response = {
  version: 1, traceId: 'trace-1', mode: 'deterministic', judgeOutcome: 'failed',
  hypothesis: { message: '输入解析可能有误', confidence: 0.82, proven: false, evidenceRefs: ['judge:p1:public'] },
  evidence: [{ ref: 'problem:p1', kind: 'problem', title: '数组题', text: '连续数组', skillIds: ['array'], verification: 'candidate', score: 0.8, excerpt: '连续数组' }],
  nextAction: '逐行检查输入结构',
  masteryImpact: { probability: 0.15, confidence: 0.22, effectiveEvidence: 0.75, needsTransfer: false, evidenceRefs: ['attempt:a1'], observations: [{ kind: 'failure', evidenceRef: 'attempt:a1' }] },
  tools: [{ id: 'tool-1', role: 'diagnostician', name: 'inspect_code', status: 'completed', startedAt: 1, endedAt: 2, durationMs: 1, input: { problemId: 'p1' }, summary: '执行静态检查', evidenceRefs: ['judge:p1:public'] }],
  handoffs: [{ traceId: 'trace-1', from: 'diagnostician', to: 'tutor', task: '选择教学动作', allowedTools: ['select_tutor_action'], evidenceRefs: ['judge:p1:public'], remainingBudget: 2, result: '输入解析可能有误', confidence: 0.82 }],
};

describe('agent client', () => {
  it('builds a judge-authoritative request from a practice attempt', () => {
    expect(buildAgentRequest(problem, attempt, [], 1)).toMatchObject({
      version: 1, hintLevel: 1, problem: { id: 'p1', skillIds: ['array'] },
      attempt: { outcome: 'failed', code: 'print(1)' },
      judge: { outcome: 'failed', passedCount: 0, totalCount: 1, evidenceRef: 'judge:p1:public-samples' },
      mastery: { prior: 0.25, observations: [{ kind: 'failure', evidenceRef: 'attempt:a1' }] },
    });
  });

  it('parses a complete Agent trace', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    const result = await requestAgentRun('http://127.0.0.1:8787', buildAgentRequest(problem, attempt, [], 1), fetcher);
    expect(result).toMatchObject({ traceId: 'trace-1', mode: 'deterministic', nextAction: '逐行检查输入结构' });
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/agent/run', expect.objectContaining({ method: 'POST' }));
  });

  it('fails closed on malformed or unavailable responses', async () => {
    const malformed = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...response, tools: [{ name: 'fabricated' }] }), { status: 200 }));
    expect(await requestAgentRun('http://127.0.0.1:8787', buildAgentRequest(problem, attempt, [], 1), malformed)).toBeNull();
    const unavailable = vi.fn().mockRejectedValue(new Error('offline'));
    expect(await requestAgentRun('http://127.0.0.1:8787', buildAgentRequest(problem, attempt, [], 1), unavailable)).toBeNull();
  });
});

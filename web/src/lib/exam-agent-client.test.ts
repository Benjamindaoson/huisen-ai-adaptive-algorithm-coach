import { describe, expect, it, vi } from 'vitest';
import { runExamAgentTurn } from './exam-agent-client';

describe('exam agent client', () => {
  const request = {
    version: 1 as const,
    sessionId: 'exam-1',
    phase: 'test' as const,
    problem: { id: 'p1', title: 'Two sum', description: 'Find a pair.', input: 'numbers', output: 'indices' },
    answer: { language: 'python' as const, sourceCode: 'print(1)' },
    learnerPrompt: '请运行一个边界用例。',
  };

  it('returns only a validated runtime turn', async () => {
    const payload = {
      version: 1, runId: 'exam-agent-r1', mode: 'deepseek', model: 'deepseek-chat', message: '已运行测试。',
      executions: [{ id: 'e1', tool: 'run_test', summary: 'success', evidenceRefs: ['exam-agent:r1:test'], durationMs: 3 }],
      evidence: [{ id: 'v1', kind: 'test', summary: 'Executed.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:test' }],
      usage: { inputTokens: 10, outputTokens: 4, latencyMs: 20 },
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    await expect(runExamAgentTurn('http://127.0.0.1:8787', request, fetcher)).resolves.toEqual(payload);
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/exam-agent/turn', expect.objectContaining({ method: 'POST' }));
  });

  it('fails closed for an invalid or unavailable response', async () => {
    await expect(runExamAgentTurn('', request)).resolves.toMatchObject({ mode: 'unavailable', evidence: [], executions: [] });
    await expect(runExamAgentTurn('http://local', request, async () => new Response('{"message":"fake"}'))).resolves.toMatchObject({ mode: 'unavailable' });
  });
});

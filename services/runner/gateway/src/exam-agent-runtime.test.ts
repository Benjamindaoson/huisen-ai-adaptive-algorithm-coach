import { describe, expect, it, vi } from 'vitest';
import type { MentorModelAdapter, MentorModelResult } from './mentor/deepseek-provider.js';
import { runExamAgentTurn } from './exam-agent-runtime.js';

function modelResult(overrides: Partial<MentorModelResult>): MentorModelResult {
  return {
    model: 'deepseek-test', content: '', finishReason: 'tool_calls', toolCalls: [],
    usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 }, latencyMs: 5, ...overrides,
  };
}

const request = {
  version: 1 as const,
  sessionId: 'exam-1',
  phase: 'review' as const,
  problem: { id: 'p1', title: '数组求和', description: '输出数组和', input: '整数数组', output: '总和' },
  answer: { language: 'python' as const, sourceCode: 'print(0)' },
  learnerPrompt: '请审查我的代码并用测试证明问题。',
};

describe('bounded exam collaboration agent', () => {
  it('executes model-selected tests, returns a bounded diff proposal and preserves the full tool trace', async () => {
    const responses = [
      modelResult({ toolCalls: [{ id: 'call-test', name: 'run_test', arguments: { stdin: '1 2\n' } }] }),
      modelResult({ toolCalls: [{ id: 'call-diff', name: 'propose_diff', arguments: { replacementSource: 'print(sum(map(int, input().split())))', rationale: '读取全部数字后求和' } }] }),
      modelResult({ content: '测试证明原程序忽略了输入。请先检查 diff，再决定接受或拒绝。', finishReason: 'stop' }),
    ];
    const model: MentorModelAdapter = { mode: 'deepseek', model: 'deepseek-test', complete: vi.fn(async () => responses.shift()!) };
    const execute = vi.fn(async () => ({ kind: 'success' as const, stdout: '0\n', stderr: '', timeMs: 3 }));

    const result = await runExamAgentTurn(request, { model, execute, now: (() => { let value = 100; return () => value += 5; })() });

    expect(result.mode).toBe('deepseek');
    expect(result.executions.map((item) => item.tool)).toEqual(['inspect_code', 'run_test', 'propose_diff']);
    expect(execute).toHaveBeenCalledWith({ language: 'python', sourceCode: 'print(0)', stdin: '1 2\n' });
    expect(result.proposedDiff).toMatchObject({ replacementSource: 'print(sum(map(int, input().split())))', rationale: '读取全部数字后求和' });
    expect(result.evidence.every((item) => item.source === 'agent-runtime' && item.artifactRef.startsWith('exam-agent:'))).toBe(true);
    expect(result.message).toContain('接受或拒绝');
  });

  it('returns unavailable without fabricated collaboration evidence when no model is configured', async () => {
    const result = await runExamAgentTurn(request, { execute: async () => ({ kind: 'success', stdout: '', stderr: '' }) });
    expect(result).toMatchObject({ mode: 'unavailable', executions: [], evidence: [] });
    expect(result).not.toHaveProperty('proposedDiff');
  });
});

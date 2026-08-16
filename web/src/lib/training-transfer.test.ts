import { describe, expect, it, vi } from 'vitest';
import type { RunRequest, RunResult } from './runner-client';
import { evaluateImmediateTransfer, getImmediateTransferChallenge } from './training-transfer';

describe('immediate training transfer', () => {
  const challenge = getImmediateTransferChallenge('starter-array-traversal')!;

  it('contains only the taught traversal skill and two distinct executions', () => {
    expect(challenge).toMatchObject({ lessonId: 'starter-array-traversal', skillIds: ['array'], language: 'python' });
    expect(challenge.cases).toHaveLength(2);
    expect(challenge.cases[0]?.invocation).not.toBe(challenge.cases[1]?.invocation);
    expect(challenge.unintroducedSkillIds).toEqual([]);
  });

  it('passes only after both runner executions match', async () => {
    const execute = vi.fn<(baseUrl: string, request: RunRequest) => Promise<RunResult>>()
      .mockResolvedValueOnce({ kind: 'success', stdout: '12\n7\n9\n', stderr: '' })
      .mockResolvedValueOnce({ kind: 'success', stdout: '3\n3\n1\n5\n', stderr: '' });

    const result = await evaluateImmediateTransfer('http://runner', challenge, 'def show_each(weights):\n    for weight in weights:\n        print(weight)', execute);

    expect(result).toMatchObject({ status: 'passed', passedCount: 2, totalCount: 2 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0]?.[1]).toMatchObject({ language: 'python', stdin: '' });
    expect(execute.mock.calls[0]?.[1].sourceCode).toContain('show_each([12, 7, 9])');
    expect(execute.mock.calls[1]?.[1].sourceCode).toContain('show_each([3, 3, 1, 5])');
  });

  it('stops on wrong output without treating string presence as success', async () => {
    const execute = vi.fn<(baseUrl: string, request: RunRequest) => Promise<RunResult>>().mockResolvedValue({ kind: 'success', stdout: '12 7 9\n', stderr: '' });
    await expect(evaluateImmediateTransfer('http://runner', challenge, 'print("12 7 9")', execute)).resolves.toMatchObject({
      status: 'failed', passedCount: 0, totalCount: 2, failureKind: 'wrong-output',
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ kind: 'runtime-error', stdout: '', stderr: 'NameError' } as RunResult, 'failed'],
    [{ kind: 'unavailable', stdout: '', stderr: '无法连接运行服务。', unavailableReason: 'network-error' } as RunResult, 'unavailable'],
  ])('does not advance on %s', async (runnerResult, status) => {
    const execute = vi.fn<(baseUrl: string, request: RunRequest) => Promise<RunResult>>().mockResolvedValue(runnerResult);
    await expect(evaluateImmediateTransfer('http://runner', challenge, 'def show_each(weights):\n    pass', execute)).resolves.toMatchObject({ status, passedCount: 0 });
  });
});

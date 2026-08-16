import { describe, expect, it, vi } from 'vitest';
import { validateContentExecution } from './content-execution.js';

describe('generated content execution validation', () => {
  const request = {
    language: 'python' as const, solution: 'print(input())',
    tests: [{ input: 'a\n', expectedOutput: 'a\n' }, { input: 'b\n', expectedOutput: 'b\n' }],
    constraints: { timeLimitMs: 1000, memoryLimitMb: 128 },
  };

  it('executes every generated test through the configured runner', async () => {
    const execute = vi.fn(async ({ stdin }: { stdin: string }) => ({ kind: 'success' as const, stdout: stdin, stderr: '', timeMs: 8 }));
    const result = await validateContentExecution(request, execute);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ passed: true, executedCount: 2 });
    expect(result.results.every((item) => item.artifactRef.startsWith('content-validation:'))).toBe(true);
  });

  it('fails closed on output mismatch, timeout, or invalid resource bounds', async () => {
    const mismatch = await validateContentExecution(request, async () => ({ kind: 'success', stdout: 'wrong', stderr: '', timeMs: 8 }));
    expect(mismatch.passed).toBe(false);
    await expect(validateContentExecution({ ...request, constraints: { ...request.constraints, timeLimitMs: Number.NaN } }, async () => ({ kind: 'success', stdout: '', stderr: '' }))).rejects.toThrow(/invalid/i);
  });
});

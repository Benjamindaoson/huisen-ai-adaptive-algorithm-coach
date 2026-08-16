import { expect, it, vi } from 'vitest';
import { validateGeneratedExecution } from './content-execution-client';

it('uses the gateway execution validator and exposes per-test artifacts', async () => {
  const payload = { version: 1, validationId: 'v1', solutionHash: 'abc', passed: true, executedCount: 1, results: [{ index: 0, passed: true, kind: 'success', output: 'a\n', durationMs: 3, artifactRef: 'content-validation:v1:test:0' }] };
  const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
  await expect(validateGeneratedExecution('http://127.0.0.1:8787', { language: 'python', solution: 'print(input())', tests: [{ input: 'a\n', expectedOutput: 'a\n' }], constraints: { timeLimitMs: 1000, memoryLimitMb: 128 } }, fetcher)).resolves.toEqual(payload);
  expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8787/content/validate-execution', expect.objectContaining({ method: 'POST' }));
});

it('fails closed when the gateway is absent', async () => {
  await expect(validateGeneratedExecution('', { language: 'python', solution: 'x', tests: [], constraints: { timeLimitMs: 1, memoryLimitMb: 1 } })).resolves.toBeNull();
});

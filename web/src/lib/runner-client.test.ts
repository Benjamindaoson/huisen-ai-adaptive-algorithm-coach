import { afterEach, expect, it, vi } from 'vitest';
import { hasRunnableSource, resolveRunnerUrl, runCode } from './runner-client';

const request = { language: 'python' as const, sourceCode: 'print("ok")', stdin: '' };

afterEach(() => vi.unstubAllGlobals());

it('uses the public Judge0 endpoint when no private runner is configured', () => {
  expect(resolveRunnerUrl()).toBe('https://ce.judge0.com');
  expect(resolveRunnerUrl('http://127.0.0.1:8787/')).toBe('http://127.0.0.1:8787');
});

it('enables execution only when the editor contains code', () => {
  expect(hasRunnableSource('print(1)')).toBe(true);
  expect(hasRunnableSource('   \n')).toBe(false);
});

it('normalizes a non-200 runner response into an unavailable result', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 429 })));
  await expect(runCode('http://localhost:8787', request)).resolves.toMatchObject({ kind: 'unavailable' });
});

it('normalizes a public Judge0 success response for the learning workspace', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ stdout: 'b2sK', stderr: null, status: { id: 3 }, time: '0.01' }), { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  await expect(runCode('https://ce.judge0.com', request)).resolves.toMatchObject({ kind: 'success', stdout: 'ok\n', timeMs: 10 });
  expect(fetchMock).toHaveBeenCalledWith('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', expect.objectContaining({
    body: JSON.stringify({ language_id: 71, source_code: 'cHJpbnQoIm9rIik=', stdin: '' }),
  }));
});

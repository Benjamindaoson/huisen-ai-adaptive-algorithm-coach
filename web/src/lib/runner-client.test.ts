import { afterEach, expect, it, vi } from 'vitest';
import { hasRunnableSource, resolveRunnerUrl, runCode } from './runner-client';

const request = { language: 'python' as const, sourceCode: 'print("ok")', stdin: '' };

afterEach(() => vi.unstubAllGlobals());

it('fails closed when no private runner is configured', () => {
  expect(resolveRunnerUrl()).toBe('');
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

it('does not send source code anywhere when the private runner URL is absent', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(runCode('', request)).resolves.toMatchObject({ kind: 'unavailable' });
  expect(fetchMock).not.toHaveBeenCalled();
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeRun } from './judge0.js';

const previous = { url: process.env.JUDGE0_URL, language: process.env.JUDGE0_LANGUAGE_JAVASCRIPT };
afterEach(() => {
  vi.unstubAllGlobals();
  if (previous.url === undefined) delete process.env.JUDGE0_URL; else process.env.JUDGE0_URL = previous.url;
  if (previous.language === undefined) delete process.env.JUDGE0_LANGUAGE_JAVASCRIPT; else process.env.JUDGE0_LANGUAGE_JAVASCRIPT = previous.language;
});

describe('Judge0 execution adapter', () => {
  it('uses Docker-Desktop-safe bounded limits and preserves the normalized result', async () => {
    process.env.JUDGE0_URL = 'http://judge0';
    process.env.JUDGE0_LANGUAGE_JAVASCRIPT = '63';
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify({ stdout: 'ok\n', stderr: null, time: '0.02', status: { id: 3 } }), { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(executeRun({ language: 'javascript', sourceCode: 'console.log(1)', stdin: '' })).resolves.toMatchObject({ kind: 'success', stdout: 'ok\n', timeMs: 20 });
    const payload = JSON.parse(String(fetcher.mock.calls[0][1]?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({ cpu_time_limit: 5, wall_time_limit: 10, memory_limit: 2_048_000, enable_network: false });
  });
});

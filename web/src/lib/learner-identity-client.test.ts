import { describe, expect, it, vi } from 'vitest';
import { createLearnerIdentityClient } from './learner-identity-client';

function storage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); } };
}

describe('learner identity client', () => {
  it('obtains and caches a signed credential for authorization headers', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ version: 1, learnerId: 'device-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    const client = createLearnerIdentityClient({ storage: storage(), fetcher, now: () => new Date('2026-08-11T00:00:00Z') });
    expect(await client.headers('http://localhost:8787', 'device-a')).toEqual({ authorization: 'Bearer signed-token' });
    expect(await client.headers('http://localhost:8787', 'device-a')).toEqual({ authorization: 'Bearer signed-token' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('refreshes an expired credential and sends no bearer token in permissive-local mode', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1, learnerId: 'device-a', token: 'old', expiresAt: '2026-08-11T00:01:00Z', mode: 'signed' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: 1, learnerId: 'device-a', token: '', expiresAt: '2026-08-12T00:00:00Z', mode: 'permissive-local' }), { status: 201 }));
    let now = new Date('2026-08-11T00:00:00Z');
    const client = createLearnerIdentityClient({ storage: storage(), fetcher, now: () => now, refreshWindowMs: 0 });
    expect(await client.headers('http://localhost:8787', 'device-a')).toEqual({ authorization: 'Bearer old' });
    now = new Date('2026-08-11T00:02:00Z');
    expect(await client.headers('http://localhost:8787', 'device-a')).toEqual({});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the credential response is unavailable or belongs to another learner', async () => {
    const client = createLearnerIdentityClient({ storage: storage(), fetcher: async () => new Response(JSON.stringify({ version: 1, learnerId: 'device-b', token: 'x', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }) });
    await expect(client.headers('http://localhost:8787', 'device-a')).rejects.toThrow('Learner credential unavailable');
  });
});

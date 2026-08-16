import { describe, expect, it, vi } from 'vitest';
import { createPlatformClient, PlatformApiError } from './platform-client';

function json(status: number, value: unknown, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
}

describe('PlatformClient', () => {
  it('uses cookie credentials, keeps CSRF only in memory and binds learning routes to the signed-in account', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      const url = String(input);
      if (url.endsWith('/api/v1/auth/sessions')) return json(201, { account: { id: 'user-1', roles: ['learner'] }, csrfToken: 'csrf-1', expiresAt: '2026-08-20T00:00:00Z' });
      if (url.endsWith('/api/v1/learners/user-1/bootstrap')) return json(200, { events: [], attempts: [], states: [], cursor: 0 });
      if (url.endsWith('/api/v1/learners/user-1/states/progress')) return json(200, { learnerId: 'user-1', kind: 'progress', version: 1, payload: {}, updatedAt: '2026-08-13T00:00:00Z' });
      if (url.endsWith('/api/v1/submissions')) return json(202, { id: 'submission-1', problemId: 'od-1', problemVersionId: 'od-1@starter-v1', status: 'queued', submittedAt: 1, passedCount: 0, totalCount: 2 });
      if (url.endsWith('/api/v1/submissions/submission-1')) return json(200, { id: 'submission-1', problemId: 'od-1', problemVersionId: 'od-1@starter-v1', status: 'passed', submittedAt: 1, completedAt: 2, passedCount: 2, totalCount: 2, revision: 3 });
      if (url.endsWith('/api/v1/judge-packs/available')) return json(200, { packs: [{ problemId: 'od-1', problemVersionId: 'od-1@starter-v1', trustLevel: 'starter' }] });
      throw new Error(`unexpected ${url}`);
    });
    const client = createPlatformClient({ baseUrl: 'http://127.0.0.1:8787/', fetcher });
    await client.signIn({ email: 'learner@example.com', password: 'correct horse battery staple' });
    await client.bootstrap('user-1');
    await client.putState('user-1', 'progress', { expectedVersion: 0, payload: {}, updatedAt: '2026-08-13T00:00:00Z' });
    await client.createSubmission({ problemVersionId: 'od-1@starter-v1', language: 'python', sourceCode: 'print(1)', idempotencyKey: 'submit-1' });
    await expect(client.getSubmission('submission-1')).resolves.toMatchObject({ status: 'passed' });
    await expect(client.availableJudgePacks()).resolves.toEqual([{ problemId: 'od-1', problemVersionId: 'od-1@starter-v1', trustLevel: 'starter' }]);

    expect(fetcher.mock.calls.every(([, init]) => init?.credentials === 'include')).toBe(true);
    expect(fetcher.mock.calls[2][1]?.headers).toMatchObject({ 'x-csrf-token': 'csrf-1' });
    expect(fetcher.mock.calls[3][1]?.headers).toMatchObject({ 'x-csrf-token': 'csrf-1' });
    expect(JSON.stringify(client)).not.toContain('csrf-1');
  });

  it('surfaces a typed conflict with authoritative state', async () => {
    const fetcher = vi.fn(async () => json(409, { error: { code: 'version-conflict', currentVersion: 2 }, state: { version: 2, payload: { completed: ['od-1'] } } }));
    const client = createPlatformClient({ baseUrl: 'http://api', fetcher, csrfToken: 'csrf' });
    await expect(client.putState('user-1', 'progress', { expectedVersion: 1, payload: {}, updatedAt: '2026-08-13T00:00:00Z' }))
      .rejects.toEqual(expect.objectContaining<Partial<PlatformApiError>>({ name: 'PlatformApiError', status: 409, code: 'version-conflict' }));
  });

  it('refreshes a stale in-memory CSRF token and retries the write once', async () => {
    let eventCalls = 0;
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/sessions/csrf')) return json(200, { csrfToken: 'csrf-new' });
      if (url.endsWith('/api/v1/learners/user-1/events')) {
        eventCalls += 1;
        return eventCalls === 1 ? json(403, { error: { code: 'invalid-session-or-csrf' } }) : json(201, { id: 'event-1' });
      }
      throw new Error(`unexpected ${url} ${init?.method}`);
    });
    const client = createPlatformClient({ baseUrl: 'http://api', fetcher, csrfToken: 'csrf-old' });

    await expect(client.appendEvent('user-1', { id: 'event-1' })).resolves.toEqual({ id: 'event-1' });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ 'x-csrf-token': 'csrf-old' });
    expect(fetcher.mock.calls[2][1]?.headers).toMatchObject({ 'x-csrf-token': 'csrf-new' });
  });

  it('does not retry unsafe writes implicitly', async () => {
    const fetcher = vi.fn(async () => { throw new TypeError('offline'); });
    const client = createPlatformClient({ baseUrl: 'http://api', fetcher, csrfToken: 'csrf' });
    await expect(client.appendEvent('user-1', { id: 'event-1' })).rejects.toThrow('offline');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

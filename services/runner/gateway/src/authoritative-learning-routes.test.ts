import { newDb } from 'pg-mem';
import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from './server.js';
import { createAccountIdentityService } from './identity/account-identity.js';
import { createInMemoryAccountStore } from './identity/account-store.js';
import { createPostgresLearningStore } from './postgres-learning-store.js';

const apps: ReturnType<typeof buildServer>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function cookieValue(header: string | string[] | undefined): string {
  const match = /od_session=([^;]+)/.exec(Array.isArray(header) ? header.join(';') : header ?? '');
  if (!match) throw new Error('missing session cookie'); return `od_session=${match[1]}`;
}

async function signedInApp() {
  const accountStore = createInMemoryAccountStore(); const deliveries: string[] = []; let token = 0;
  const accountIdentity = createAccountIdentityService({ store: accountStore, createToken: () => `learning-route-token-${++token}`, notify: async (item) => { deliveries.push(item.token); } });
  const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); const pool = new adapter.Pool();
  const authoritativeLearningStore = createPostgresLearningStore({ pool, schema: `routes_${token}` });
  const app = buildServer({ accountIdentity, authoritativeLearningStore }); apps.push(app);
  const registration = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'learner@example.com', password: 'correct horse battery staple' } });
  const userId = registration.json().account.id as string;
  await app.inject({ method: 'POST', url: '/api/v1/auth/verify', payload: { token: deliveries[0] } });
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sessions', payload: { email: 'learner@example.com', password: 'correct horse battery staple' } });
  return { app, pool, userId, cookie: cookieValue(login.headers['set-cookie']), csrf: login.json().csrfToken as string, accountStore };
}

describe('server-authoritative learning routes', () => {
  it('bootstraps and incrementally synchronizes only the authenticated owner', async () => {
    const { app, pool, userId, cookie, csrf } = await signedInApp();
    const profile = { target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-13T00:00:00.000Z' };
    expect((await app.inject({ method: 'PUT', url: `/api/v1/learners/${userId}/profile`, headers: { cookie, 'x-csrf-token': csrf }, payload: profile })).statusCode).toBe(200);
    const event = { id: 'event-1', kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' }, createdAt: '2026-08-13T00:01:00.000Z' };
    expect((await app.inject({ method: 'POST', url: `/api/v1/learners/${userId}/events`, headers: { cookie, 'x-csrf-token': csrf }, payload: event })).statusCode).toBe(201);

    const bootstrap = await app.inject({ method: 'GET', url: `/api/v1/learners/${userId}/bootstrap`, headers: { cookie } });
    expect(bootstrap.json()).toMatchObject({ profile: { learnerId: userId }, events: [{ id: 'event-1' }], cursor: 1 });
    expect((await app.inject({ method: 'GET', url: '/api/v1/learners/another-user/bootstrap', headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/v1/learners/${userId}/sync?after=1`, headers: { cookie } })).json()).toEqual({ cursor: 1, events: [] });
    await pool.end();
  });

  it('returns 409 with the authoritative state on stale writes and persists attempts', async () => {
    const { app, pool, userId, cookie, csrf } = await signedInApp();
    const headers = { cookie, 'x-csrf-token': csrf };
    const first = await app.inject({ method: 'PUT', url: `/api/v1/learners/${userId}/states/progress`, headers, payload: { expectedVersion: 0, updatedAt: '2026-08-13T00:00:00.000Z', payload: { completed: ['od-1'] } } });
    expect(first.json()).toMatchObject({ version: 1 });
    const conflict = await app.inject({ method: 'PUT', url: `/api/v1/learners/${userId}/states/progress`, headers, payload: { expectedVersion: 0, updatedAt: '2026-08-13T00:01:00.000Z', payload: { completed: [] } } });
    expect(conflict.statusCode).toBe(409); expect(conflict.json()).toMatchObject({ error: { code: 'version-conflict', currentVersion: 1 }, state: { version: 1 } });
    const attempt = { id: 'attempt-1', problemId: 'od-1', language: 'python', outcome: 'wrong-answer', assisted: false, sourceHash: 'a'.repeat(64), createdAt: '2026-08-13T00:02:00.000Z' };
    expect((await app.inject({ method: 'POST', url: `/api/v1/learners/${userId}/attempts`, headers, payload: attempt })).statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: `/api/v1/learners/${userId}/attempts`, headers, payload: attempt })).statusCode).toBe(200);
    await pool.end();
  });

  it('exports and deletes the authenticated learner data with CSRF protection', async () => {
    const { app, pool, userId, cookie, csrf } = await signedInApp();
    const exported = await app.inject({ method: 'GET', url: `/api/v1/learners/${userId}/export`, headers: { cookie } });
    expect(exported.statusCode).toBe(200); expect(exported.headers['content-disposition']).toContain('attachment');
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/learners/${userId}`, headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/learners/${userId}`, headers: { cookie, 'x-csrf-token': csrf } })).statusCode).toBe(204);
    await pool.end();
  });
});

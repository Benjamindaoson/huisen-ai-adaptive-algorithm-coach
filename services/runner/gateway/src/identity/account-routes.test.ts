import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { createAccountIdentityService } from './account-identity.js';
import { createInMemoryAccountStore } from './account-store.js';

const apps: ReturnType<typeof buildServer>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function cookieValue(header: string | string[] | undefined, name: string): string {
  const text = Array.isArray(header) ? header.join(';') : header ?? '';
  const match = new RegExp(`${name}=([^;]+)`).exec(text);
  if (!match) throw new Error(`Missing ${name} cookie`);
  return decodeURIComponent(match[1]);
}

describe('account identity routes', () => {
  it('supports register, verify, cookie login, CSRF rotation and logout without exposing token hashes', async () => {
    const deliveries: Array<{ purpose: string; token: string }> = [];
    let token = 0;
    const accountIdentity = createAccountIdentityService({
      store: createInMemoryAccountStore(), createToken: () => `opaque-token-${++token}-with-enough-entropy`,
      notify: async (delivery) => { deliveries.push(delivery); },
    });
    const app = buildServer({ accountIdentity }); apps.push(app);

    const registered = await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'Learner@example.com', password: 'correct horse battery staple' } });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toMatchObject({ account: { email: 'learner@example.com', emailVerified: false, roles: ['learner'] } });
    expect(registered.body).not.toContain('passwordHash');

    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/verify', payload: { token: deliveries[0].token } })).statusCode).toBe(200);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sessions', payload: { email: 'learner@example.com', password: 'correct horse battery staple', deviceName: 'Chrome Windows' } });
    expect(login.statusCode).toBe(201);
    expect(login.headers['set-cookie']).toContain('od_session=');
    expect(login.headers['set-cookie']).toContain('HttpOnly');
    expect(login.headers['set-cookie']).toContain('SameSite=Strict');
    const firstCookie = `od_session=${cookieValue(login.headers['set-cookie'], 'od_session')}`;
    const csrf = login.json().csrfToken;

    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: firstCookie } })).json())
      .toMatchObject({ authenticated: true, account: { roles: ['learner'] } });
    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/sessions/refresh', headers: { cookie: firstCookie } })).statusCode).toBe(403);

    const refreshed = await app.inject({ method: 'POST', url: '/api/v1/auth/sessions/refresh', headers: { cookie: firstCookie, 'x-csrf-token': csrf } });
    expect(refreshed.statusCode).toBe(200);
    const secondCookie = `od_session=${cookieValue(refreshed.headers['set-cookie'], 'od_session')}`;
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: firstCookie } })).json()).toEqual({ authenticated: false });
    expect((await app.inject({ method: 'DELETE', url: '/api/v1/auth/sessions/current', headers: { cookie: secondCookie, 'x-csrf-token': refreshed.json().csrfToken } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/session', headers: { cookie: secondCookie } })).json()).toEqual({ authenticated: false });
  });

  it('keeps recovery enumeration-safe and requires an authenticated owner for anonymous claims', async () => {
    const deliveries: Array<{ purpose: string; token: string }> = [];
    let token = 0;
    const accountIdentity = createAccountIdentityService({
      store: createInMemoryAccountStore(), createToken: () => `route-token-${++token}-with-enough-entropy`,
      notify: async (delivery) => { deliveries.push(delivery); },
    });
    const app = buildServer({ accountIdentity }); apps.push(app);
    await app.inject({ method: 'POST', url: '/api/v1/auth/register', payload: { email: 'owner@example.com', password: 'correct horse battery staple' } });
    await app.inject({ method: 'POST', url: '/api/v1/auth/verify', payload: { token: deliveries[0].token } });
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/sessions', payload: { email: 'owner@example.com', password: 'correct horse battery staple', deviceName: 'Browser' } });
    const cookie = `od_session=${cookieValue(login.headers['set-cookie'], 'od_session')}`;

    const missing = await app.inject({ method: 'POST', url: '/api/v1/auth/recovery', payload: { email: 'missing@example.com' } });
    const known = await app.inject({ method: 'POST', url: '/api/v1/auth/recovery', payload: { email: 'owner@example.com' } });
    expect(missing.json()).toEqual(known.json());
    expect(missing.json()).toEqual({ accepted: true });

    expect((await app.inject({ method: 'POST', url: '/api/v1/auth/anonymous/claim', payload: { anonymousLearnerId: 'anonymous-a', idempotencyKey: 'claim-key-123' } })).statusCode).toBe(401);
    const claimed = await app.inject({ method: 'POST', url: '/api/v1/auth/anonymous/claim', headers: { cookie }, payload: { anonymousLearnerId: 'anonymous-a', idempotencyKey: 'claim-key-123' } });
    expect(claimed.statusCode).toBe(200);
    expect(claimed.json()).toMatchObject({ anonymousLearnerId: 'anonymous-a' });
  });
});

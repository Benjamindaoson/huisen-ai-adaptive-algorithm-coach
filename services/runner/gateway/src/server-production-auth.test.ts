import { afterEach, describe, expect, it } from 'vitest';
import { buildServer } from './server.js';
import { createAccountIdentityService } from './identity/account-identity.js';
import { createInMemoryAccountStore } from './identity/account-store.js';

const apps: ReturnType<typeof buildServer>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

function sessionCookie(header: string | string[] | undefined) { const match = /od_session=([^;]+)/.exec(Array.isArray(header) ? header.join(';') : header ?? ''); if (!match) throw new Error('missing cookie'); return `od_session=${match[1]}`; }

async function identityFor(role: 'learner' | 'reviewer') {
  const store = createInMemoryAccountStore(); const deliveries: string[] = []; let token = 0;
  const identity = createAccountIdentityService({ store, createToken: () => `production-auth-token-${++token}`, notify: async (item) => { deliveries.push(item.token); } });
  const account = await identity.register({ email: `${role}@example.com`, password: 'correct horse battery staple' });
  if (role === 'reviewer') await store.putAccount({ ...account, roles: ['reviewer'], updatedAt: new Date().toISOString() });
  await identity.verifyEmail(deliveries[0]); const session = await identity.signIn({ email: account.email, password: 'correct horse battery staple', deviceName: 'test' });
  return { identity, account, cookie: `od_session=${session.sessionToken}` };
}

describe('production route authorization', () => {
  it('disables self-issued legacy bearer credentials and accepts only the account owner', async () => {
    const { identity, account, cookie } = await identityFor('learner');
    const app = buildServer({ accountIdentity: identity, productionMode: true }); apps.push(app);
    expect((await app.inject({ method: 'POST', url: '/auth/anonymous', payload: { version: 1, learnerId: account.id } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/learners/${account.id}/profile` })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: `/learners/another-user/profile`, headers: { cookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/learners/${account.id}/profile`, headers: { cookie } })).statusCode).toBe(404);
  });

  it('restricts the teacher quality workbench to reviewer or admin roles', async () => {
    const learner = await identityFor('learner');
    const learnerApp = buildServer({ accountIdentity: learner.identity, productionMode: true }); apps.push(learnerApp);
    expect((await learnerApp.inject({ method: 'GET', url: '/quality/workbench', headers: { cookie: learner.cookie } })).statusCode).toBe(403);

    const reviewer = await identityFor('reviewer');
    const reviewerApp = buildServer({ accountIdentity: reviewer.identity, productionMode: true }); apps.push(reviewerApp);
    expect((await reviewerApp.inject({ method: 'GET', url: '/quality/workbench', headers: { cookie: reviewer.cookie } })).statusCode).toBe(200);
  });
});

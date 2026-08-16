import { describe, expect, it } from 'vitest';
import { createAccountIdentityService } from './account-identity.js';
import { createInMemoryAccountStore } from './account-store.js';

function setup() {
  let sequence = 0;
  const deliveries: Array<{ purpose: string; recipient: string; token: string }> = [];
  const service = createAccountIdentityService({
    store: createInMemoryAccountStore(),
    now: () => new Date('2026-08-13T00:00:00.000Z'),
    createToken: () => `secure-token-${++sequence}-${'x'.repeat(32)}`,
    notify: async (delivery) => { deliveries.push(delivery); },
  });
  return { service, deliveries };
}

describe('production account identity', () => {
  it('registers with Argon2id, verifies email, signs in and never stores raw secrets', async () => {
    const { service, deliveries } = setup();
    const registered = await service.register({ email: 'Learner@Example.com', password: 'correct horse battery staple' });
    expect(registered).toMatchObject({ email: 'learner@example.com', emailVerified: false, roles: ['learner'] });
    expect(deliveries).toHaveLength(1);
    expect(await service.inspectCredential(registered.id)).toMatchObject({ algorithm: 'argon2id' });
    expect(JSON.stringify(await service.inspectCredential(registered.id))).not.toContain('correct horse battery staple');

    await expect(service.signIn({ email: 'learner@example.com', password: 'correct horse battery staple', deviceName: 'Chrome' })).rejects.toThrow('Email verification required');
    await service.verifyEmail(deliveries[0].token);
    const session = await service.signIn({ email: 'learner@example.com', password: 'correct horse battery staple', deviceName: 'Chrome' });
    expect(session).toMatchObject({ userId: registered.id, csrfToken: expect.any(String), sessionToken: expect.any(String) });
    expect(await service.authenticate(session.sessionToken)).toMatchObject({ userId: registered.id, roles: ['learner'] });
    expect((await service.listAudit(registered.id)).map((event) => event.action)).toEqual(['account-registered', 'email-verified', 'session-created']);
    expect(JSON.stringify(await service.listAudit(registered.id))).not.toContain('secure-token');
  });

  it('rotates and revokes sessions so old tokens cannot be replayed', async () => {
    const { service, deliveries } = setup();
    await service.register({ email: 'a@example.com', password: 'a-secure-password-123' });
    await service.verifyEmail(deliveries[0].token);
    const first = await service.signIn({ email: 'a@example.com', password: 'a-secure-password-123', deviceName: 'Edge' });
    const rotated = await service.rotate(first.sessionToken, first.csrfToken);
    expect(await service.authenticate(first.sessionToken)).toBeNull();
    expect(await service.authenticate(rotated.sessionToken)).toMatchObject({ userId: first.userId });
    await service.revoke(rotated.sessionToken, rotated.csrfToken);
    expect(await service.authenticate(rotated.sessionToken)).toBeNull();
  });

  it('recovers a password without revealing whether an account exists', async () => {
    const { service, deliveries } = setup();
    await service.register({ email: 'recover@example.com', password: 'old-secure-password' });
    await service.verifyEmail(deliveries[0].token);
    expect(await service.requestRecovery('missing@example.com')).toEqual({ accepted: true });
    expect(await service.requestRecovery('recover@example.com')).toEqual({ accepted: true });
    const recovery = deliveries.find((item) => item.purpose === 'recovery');
    expect(recovery).toBeDefined();
    await service.completeRecovery(recovery!.token, 'new-secure-password');
    await expect(service.signIn({ email: 'recover@example.com', password: 'old-secure-password', deviceName: 'old' })).rejects.toThrow('Invalid credentials');
    await expect(service.signIn({ email: 'recover@example.com', password: 'new-secure-password', deviceName: 'new' })).resolves.toMatchObject({ userId: expect.any(String) });
  });

  it('claims an anonymous learner once and enforces owner or role authorization', async () => {
    const { service, deliveries } = setup();
    const account = await service.register({ email: 'owner@example.com', password: 'secure-owner-password' });
    await service.verifyEmail(deliveries[0].token);
    const first = await service.claimAnonymous(account.id, 'anonymous-device-1', 'claim-key-0001');
    const replay = await service.claimAnonymous(account.id, 'anonymous-device-1', 'claim-key-0001');
    expect(replay).toEqual(first);
    await expect(service.claimAnonymous('different-user', 'anonymous-device-1', 'claim-key-0002')).rejects.toThrow('Anonymous identity already claimed');
    expect(service.authorize({ userId: account.id, roles: ['learner'] }, account.id)).toBe(true);
    expect(service.authorize({ userId: account.id, roles: ['learner'] }, 'other')).toBe(false);
    expect(service.authorize({ userId: 'reviewer', roles: ['reviewer'] }, 'other', ['reviewer'])).toBe(true);
  });
});

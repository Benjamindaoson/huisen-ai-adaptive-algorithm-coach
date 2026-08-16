import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import type { Account, AccountCredential, AnonymousClaim } from './account-store.js';
import { createPostgresAccountStore } from './postgres-account-store.js';

const account: Account = {
  id: 'user-1', email: 'learner@example.com', emailVerified: false, roles: ['learner'],
  createdAt: '2026-08-13T00:00:00.000Z', updatedAt: '2026-08-13T00:00:00.000Z',
};
const credential: AccountCredential = {
  userId: account.id, algorithm: 'argon2id', passwordHash: '$argon2id$stored-only', updatedAt: account.updatedAt,
};

function memoryPool() {
  const memory = newDb({ noAstCoverageCheck: true });
  const adapter = memory.adapters.createPg();
  return new adapter.Pool();
}

describe('PostgreSQL account store', () => {
  it('persists accounts, credentials and sessions across store instances', async () => {
    const pool = memoryPool();
    const first = createPostgresAccountStore({ pool, schema: 'identity_test' });
    await first.createAccount(account, credential);
    await first.putSession({
      id: 'session-1', userId: account.id, tokenHash: 'token-hash', csrfHash: 'csrf-hash', deviceName: 'Chrome',
      createdAt: account.createdAt, expiresAt: '2026-08-20T00:00:00.000Z',
    });

    const restarted = createPostgresAccountStore({ pool, schema: 'identity_test' });
    expect(await restarted.findAccountByEmail('LEARNER@EXAMPLE.COM')).toEqual(account);
    expect(await restarted.getCredential(account.id)).toEqual(credential);
    expect((await restarted.getSessionByTokenHash('token-hash'))?.deviceName).toBe('Chrome');

    await restarted.revokeSession('session-1', '2026-08-13T01:00:00.000Z');
    expect((await first.getSessionByTokenHash('token-hash'))?.revokedAt).toBe('2026-08-13T01:00:00.000Z');
    await pool.end();
  });

  it('consumes purpose tokens exactly once', async () => {
    const pool = memoryPool();
    const store = createPostgresAccountStore({ pool, schema: 'identity_tokens' });
    await store.createAccount(account, credential);
    await store.putToken({ tokenHash: 'verify-hash', userId: account.id, purpose: 'verification', expiresAt: '2026-08-14T00:00:00.000Z' });
    expect(await store.useToken('verify-hash', '2026-08-13T01:00:00.000Z')).toBe(true);
    expect(await store.useToken('verify-hash', '2026-08-13T02:00:00.000Z')).toBe(false);
    expect((await store.getToken('verify-hash', 'verification'))?.usedAt).toBe('2026-08-13T01:00:00.000Z');
    await pool.end();
  });

  it('makes anonymous claims idempotent and rejects cross-account takeover', async () => {
    const pool = memoryPool();
    const store = createPostgresAccountStore({ pool, schema: 'identity_claims' });
    await store.createAccount(account, credential);
    const claim: AnonymousClaim = {
      idempotencyKey: 'claim-key-123', userId: account.id, anonymousLearnerId: 'anonymous-1', claimedAt: account.createdAt,
    };
    expect(await store.claimAnonymous(claim)).toEqual(claim);
    expect(await store.claimAnonymous(claim)).toEqual(claim);
    await expect(store.claimAnonymous({ ...claim, idempotencyKey: 'claim-key-456', userId: 'user-2' }))
      .rejects.toThrow('Anonymous identity already claimed');
    await pool.end();
  });
});

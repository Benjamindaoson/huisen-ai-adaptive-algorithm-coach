import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { hashPassword, verifyPassword } from './password.js';
import type { AccountRole, AccountStore } from './account-store.js';

type Delivery = { purpose: 'verification' | 'recovery'; recipient: string; token: string };
type SessionResult = { userId: string; roles: AccountRole[]; sessionToken: string; csrfToken: string; expiresAt: string };
export type AuthenticatedAccount = { userId: string; roles: AccountRole[]; sessionId: string };

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid email');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return email;
}
export function createAccountIdentityService(options: {
  store: AccountStore;
  now?: () => Date;
  createToken?: () => string;
  notify?: (delivery: Delivery) => Promise<void>;
  tokenPepper?: string;
}) {
  const { store } = options;
  const now = options.now ?? (() => new Date());
  const createToken = options.createToken ?? (() => randomBytes(32).toString('base64url'));
  const notify = options.notify ?? (async () => undefined);
  const hashToken = (value: string) => options.tokenPepper
    ? createHmac('sha256', options.tokenPepper).update(value).digest('hex')
    : createHash('sha256').update(value).digest('hex');
  const secureEqualHash = (raw: string, expectedHash: string) => {
    const actual = Buffer.from(hashToken(raw)); const expected = Buffer.from(expectedHash);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  };
  const at = (seconds: number) => new Date(now().getTime() + seconds * 1_000).toISOString();
  const audit = (userId: string, action: string, evidence: Record<string, string | number | boolean> = {}) => store.appendAudit({ id: `audit-${randomUUID()}`, userId, action, occurredAt: now().toISOString(), evidence });

  async function issuePurpose(userId: string, email: string, purpose: Delivery['purpose'], ttl: number) {
    const raw = createToken();
    await store.putToken({ tokenHash: hashToken(raw), userId, purpose, expiresAt: at(ttl) });
    await notify({ purpose, recipient: email, token: raw });
  }

  async function createSession(userId: string, roles: AccountRole[], deviceName: string): Promise<SessionResult> {
    const sessionToken = createToken(); const csrfToken = createToken(); const expiresAt = at(7 * 24 * 60 * 60);
    await store.putSession({ id: `session-${randomUUID()}`, userId, tokenHash: hashToken(sessionToken), csrfHash: hashToken(csrfToken), deviceName: deviceName.slice(0, 120), createdAt: now().toISOString(), expiresAt });
    await audit(userId, 'session-created', { deviceName: deviceName.slice(0, 120) });
    return { userId, roles, sessionToken, csrfToken, expiresAt };
  }

  async function authenticate(sessionToken: string): Promise<AuthenticatedAccount | null> {
    if (!sessionToken) return null;
    const session = await store.getSessionByTokenHash(hashToken(sessionToken));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= now().getTime()) return null;
    const account = await store.getAccount(session.userId);
    return account ? { userId: account.id, roles: account.roles, sessionId: session.id } : null;
  }

  async function requireSession(sessionToken: string, csrfToken: string) {
    const session = await store.getSessionByTokenHash(hashToken(sessionToken));
    if (!session || session.revokedAt || Date.parse(session.expiresAt) <= now().getTime() || !secureEqualHash(csrfToken, session.csrfHash)) throw new Error('Invalid session');
    const account = await store.getAccount(session.userId);
    if (!account) throw new Error('Invalid session');
    return { session, account };
  }

  return {
    mode: store.mode,
    async register(input: { email: string; password: string }) {
      const email = normalizeEmail(input.email);
      if (await store.findAccountByEmail(email)) throw new Error('Account already exists');
      const createdAt = now().toISOString();
      const account = { id: `user-${randomUUID()}`, email, emailVerified: false, roles: ['learner'] as AccountRole[], createdAt, updatedAt: createdAt };
      const passwordHash = await hashPassword(input.password);
      await store.createAccount(account, { userId: account.id, algorithm: 'argon2id', passwordHash, updatedAt: createdAt });
      await issuePurpose(account.id, account.email, 'verification', 24 * 60 * 60);
      await audit(account.id, 'account-registered');
      return account;
    },
    async verifyEmail(raw: string) {
      const token = await store.getToken(hashToken(raw), 'verification');
      if (!token || token.usedAt || Date.parse(token.expiresAt) <= now().getTime() || !await store.useToken(token.tokenHash, now().toISOString())) throw new Error('Invalid verification token');
      const account = await store.getAccount(token.userId); if (!account) throw new Error('Invalid verification token');
      const updated = { ...account, emailVerified: true, updatedAt: now().toISOString() }; await store.putAccount(updated); await audit(account.id, 'email-verified'); return updated;
    },
    async signIn(input: { email: string; password: string; deviceName: string }) {
      const account = await store.findAccountByEmail(normalizeEmail(input.email));
      const credential = account ? await store.getCredential(account.id) : null;
      if (!account || !credential || !await verifyPassword(input.password, credential.passwordHash)) throw new Error('Invalid credentials');
      if (!account.emailVerified) throw new Error('Email verification required');
      return createSession(account.id, account.roles, input.deviceName);
    },
    authenticate,
    async issueCsrf(sessionToken: string) {
      const session = await store.getSessionByTokenHash(hashToken(sessionToken));
      if (!session || session.revokedAt || Date.parse(session.expiresAt) <= now().getTime()) throw new Error('Invalid session');
      const csrfToken = createToken(); await store.putSessionCsrf(session.id, hashToken(csrfToken)); return { csrfToken };
    },
    async authenticateWithCsrf(sessionToken: string, csrfToken: string) {
      const { session, account } = await requireSession(sessionToken, csrfToken);
      return { userId: account.id, roles: account.roles, sessionId: session.id } satisfies AuthenticatedAccount;
    },
    async rotate(sessionToken: string, csrfToken: string) {
      const { session, account } = await requireSession(sessionToken, csrfToken);
      await store.revokeSession(session.id, now().toISOString());
      return createSession(account.id, account.roles, session.deviceName);
    },
    async revoke(sessionToken: string, csrfToken: string) { const { session } = await requireSession(sessionToken, csrfToken); await store.revokeSession(session.id, now().toISOString()); },
    async requestRecovery(rawEmail: string) {
      const email = normalizeEmail(rawEmail); const account = await store.findAccountByEmail(email);
      if (account) await issuePurpose(account.id, account.email, 'recovery', 60 * 60);
      return { accepted: true as const };
    },
    async completeRecovery(raw: string, password: string) {
      const token = await store.getToken(hashToken(raw), 'recovery');
      if (!token || token.usedAt || Date.parse(token.expiresAt) <= now().getTime() || !await store.useToken(token.tokenHash, now().toISOString())) throw new Error('Invalid recovery token');
      await store.putCredential({ userId: token.userId, algorithm: 'argon2id', passwordHash: await hashPassword(password), updatedAt: now().toISOString() });
      await store.revokeUserSessions(token.userId, now().toISOString());
      return { completed: true as const };
    },
    async inspectCredential(userId: string) { const credential = await store.getCredential(userId); return credential ? { algorithm: credential.algorithm, updatedAt: credential.updatedAt } : null; },
    listAudit: (userId: string) => store.listAudit(userId),
    async listSessions(userId: string) { return (await store.listSessions(userId)).map(({ tokenHash: _token, csrfHash: _csrf, ...session }) => session); },
    async claimAnonymous(userId: string, anonymousLearnerId: string, idempotencyKey: string) {
      if (!/^[A-Za-z0-9._:-]{1,200}$/.test(anonymousLearnerId) || !/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey)) throw new Error('Invalid anonymous claim');
      return store.claimAnonymous({ userId, anonymousLearnerId, idempotencyKey, claimedAt: now().toISOString() });
    },
    authorize(identity: Pick<AuthenticatedAccount, 'userId' | 'roles'>, ownerId: string, allowedRoles: AccountRole[] = []) {
      return identity.userId === ownerId || identity.roles.some((role) => allowedRoles.includes(role));
    },
  };
}
export type AccountIdentityService = ReturnType<typeof createAccountIdentityService>;

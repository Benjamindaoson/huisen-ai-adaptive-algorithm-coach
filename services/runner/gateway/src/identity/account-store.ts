export type AccountRole = 'learner' | 'reviewer' | 'admin';
export type Account = { id: string; email: string; emailVerified: boolean; roles: AccountRole[]; createdAt: string; updatedAt: string };
export type AccountCredential = { userId: string; algorithm: 'argon2id'; passwordHash: string; updatedAt: string };
export type AccountToken = { tokenHash: string; userId: string; purpose: 'verification' | 'recovery'; expiresAt: string; usedAt?: string };
export type AccountSession = { id: string; userId: string; tokenHash: string; csrfHash: string; deviceName: string; createdAt: string; expiresAt: string; revokedAt?: string };
export type AnonymousClaim = { idempotencyKey: string; userId: string; anonymousLearnerId: string; claimedAt: string };
export type AccountAuditEvent = { id: string; userId: string; action: string; occurredAt: string; evidence: Record<string, string | number | boolean> };

export type AccountStore = {
  readonly mode: 'memory' | 'postgres';
  createAccount(account: Account, credential: AccountCredential): Promise<void>;
  getAccount(id: string): Promise<Account | null>;
  findAccountByEmail(email: string): Promise<Account | null>;
  putAccount(account: Account): Promise<void>;
  getCredential(userId: string): Promise<AccountCredential | null>;
  putCredential(credential: AccountCredential): Promise<void>;
  putToken(token: AccountToken): Promise<void>;
  getToken(tokenHash: string, purpose: AccountToken['purpose']): Promise<AccountToken | null>;
  useToken(tokenHash: string, usedAt: string): Promise<boolean>;
  putSession(session: AccountSession): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<AccountSession | null>;
  putSessionCsrf(id: string, csrfHash: string): Promise<void>;
  revokeSession(id: string, revokedAt: string): Promise<void>;
  revokeUserSessions(userId: string, revokedAt: string): Promise<void>;
  listSessions(userId: string): Promise<AccountSession[]>;
  claimAnonymous(claim: AnonymousClaim): Promise<AnonymousClaim>;
  appendAudit(event: AccountAuditEvent): Promise<void>;
  listAudit(userId: string): Promise<AccountAuditEvent[]>;
};

function clone<T>(value: T): T { return structuredClone(value); }

export function createInMemoryAccountStore(): AccountStore {
  const accounts = new Map<string, Account>();
  const emailIndex = new Map<string, string>();
  const credentials = new Map<string, AccountCredential>();
  const tokens = new Map<string, AccountToken>();
  const sessions = new Map<string, AccountSession>();
  const claimsByKey = new Map<string, AnonymousClaim>();
  const claimsByAnonymous = new Map<string, AnonymousClaim>();
  const audit: AccountAuditEvent[] = [];
  return {
    mode: 'memory',
    async createAccount(account, credential) {
      if (accounts.has(account.id) || emailIndex.has(account.email)) throw new Error('Account already exists');
      accounts.set(account.id, clone(account)); emailIndex.set(account.email, account.id); credentials.set(account.id, clone(credential));
    },
    async getAccount(id) { const value = accounts.get(id); return value ? clone(value) : null; },
    async findAccountByEmail(email) { const id = emailIndex.get(email); const value = id ? accounts.get(id) : undefined; return value ? clone(value) : null; },
    async putAccount(account) { if (!accounts.has(account.id)) throw new Error('Account not found'); accounts.set(account.id, clone(account)); emailIndex.set(account.email, account.id); },
    async getCredential(userId) { const value = credentials.get(userId); return value ? clone(value) : null; },
    async putCredential(credential) { if (!accounts.has(credential.userId)) throw new Error('Account not found'); credentials.set(credential.userId, clone(credential)); },
    async putToken(token) { tokens.set(`${token.purpose}:${token.tokenHash}`, clone(token)); },
    async getToken(tokenHash, purpose) { const value = tokens.get(`${purpose}:${tokenHash}`); return value ? clone(value) : null; },
    async useToken(tokenHash, usedAt) {
      for (const [key, token] of tokens) if (token.tokenHash === tokenHash && !token.usedAt) { tokens.set(key, { ...token, usedAt }); return true; }
      return false;
    },
    async putSession(session) { sessions.set(session.id, clone(session)); },
    async getSessionByTokenHash(tokenHash) { const value = [...sessions.values()].find((session) => session.tokenHash === tokenHash); return value ? clone(value) : null; },
    async putSessionCsrf(id, csrfHash) { const value = sessions.get(id); if (!value) throw new Error('Invalid session'); sessions.set(id, { ...value, csrfHash }); },
    async revokeSession(id, revokedAt) { const value = sessions.get(id); if (value) sessions.set(id, { ...value, revokedAt }); },
    async revokeUserSessions(userId, revokedAt) { for (const [id, value] of sessions) if (value.userId === userId) sessions.set(id, { ...value, revokedAt }); },
    async listSessions(userId) { return [...sessions.values()].filter((session) => session.userId === userId).map(clone); },
    async claimAnonymous(claim) {
      const replay = claimsByKey.get(claim.idempotencyKey);
      if (replay) {
        if (replay.userId !== claim.userId || replay.anonymousLearnerId !== claim.anonymousLearnerId) throw new Error('Invalid anonymous claim replay');
        return clone(replay);
      }
      const prior = claimsByAnonymous.get(claim.anonymousLearnerId);
      if (prior && prior.userId !== claim.userId) throw new Error('Anonymous identity already claimed');
      const result = prior ?? clone(claim);
      claimsByKey.set(claim.idempotencyKey, result); claimsByAnonymous.set(claim.anonymousLearnerId, result);
      return clone(result);
    },
    async appendAudit(event) { audit.push(clone(event)); },
    async listAudit(userId) { return audit.filter((event) => event.userId === userId).map(clone); },
  };
}

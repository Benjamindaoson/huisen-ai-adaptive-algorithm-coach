import type {
  Account, AccountAuditEvent, AccountCredential, AccountRole, AccountSession, AccountStore, AccountToken, AnonymousClaim,
} from './account-store.js';

type QueryResult = { rows: Array<Record<string, unknown>>; rowCount?: number | null };
type PgClientLike = { query(text: string, values?: unknown[]): Promise<QueryResult>; release(): void };
export type IdentityPgPool = { query(text: string, values?: unknown[]): Promise<QueryResult>; connect(): Promise<PgClientLike> };

function schemaName(value: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value)) throw new Error('Invalid identity database schema');
  return value;
}

function iso(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid identity timestamp');
  return date.toISOString();
}

function roles(value: unknown): AccountRole[] {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(parsed) || !parsed.every((role) => ['learner', 'reviewer', 'admin'].includes(String(role)))) {
    throw new Error('Invalid account roles');
  }
  return [...new Set(parsed as AccountRole[])];
}

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: String(row.id), email: String(row.email), emailVerified: Boolean(row.email_verified), roles: roles(row.roles),
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapCredential(row: Record<string, unknown>): AccountCredential {
  return { userId: String(row.user_id), algorithm: 'argon2id', passwordHash: String(row.password_hash), updatedAt: iso(row.updated_at) };
}

function mapToken(row: Record<string, unknown>): AccountToken {
  return {
    tokenHash: String(row.token_hash), userId: String(row.user_id), purpose: row.purpose as AccountToken['purpose'],
    expiresAt: iso(row.expires_at), ...(row.used_at ? { usedAt: iso(row.used_at) } : {}),
  };
}

function mapSession(row: Record<string, unknown>): AccountSession {
  return {
    id: String(row.id), userId: String(row.user_id), tokenHash: String(row.token_hash), csrfHash: String(row.csrf_hash),
    deviceName: String(row.device_name), createdAt: iso(row.created_at), expiresAt: iso(row.expires_at),
    ...(row.revoked_at ? { revokedAt: iso(row.revoked_at) } : {}),
  };
}

function mapClaim(row: Record<string, unknown>): AnonymousClaim {
  return {
    idempotencyKey: String(row.idempotency_key), userId: String(row.user_id),
    anonymousLearnerId: String(row.anonymous_learner_id), claimedAt: iso(row.claimed_at),
  };
}

export function createPostgresAccountStore(options: { pool: IdentityPgPool; schema?: string }): AccountStore {
  const schema = schemaName(options.schema ?? 'identity');
  const table = (name: string) => `"${schema}"."${name}"`;
  const initialized = (async () => {
    await options.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('accounts')} (
      id text PRIMARY KEY, email text NOT NULL UNIQUE, email_verified boolean NOT NULL DEFAULT false,
      roles jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`);
    await options.pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS "${schema}_accounts_email_lower" ON ${table('accounts')} (lower(email))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('credentials')} (
      user_id text PRIMARY KEY REFERENCES ${table('accounts')}(id) ON DELETE CASCADE,
      algorithm text NOT NULL CHECK (algorithm = 'argon2id'), password_hash text NOT NULL, updated_at timestamptz NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('tokens')} (
      token_hash text NOT NULL, purpose text NOT NULL CHECK (purpose IN ('verification', 'recovery')),
      user_id text NOT NULL REFERENCES ${table('accounts')}(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL, used_at timestamptz, PRIMARY KEY (purpose, token_hash))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('sessions')} (
      id text PRIMARY KEY, user_id text NOT NULL REFERENCES ${table('accounts')}(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE, csrf_hash text NOT NULL, device_name text NOT NULL,
      created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz)`);
    await options.pool.query(`CREATE INDEX IF NOT EXISTS "${schema}_sessions_user" ON ${table('sessions')} (user_id, created_at DESC)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('anonymous_claims')} (
      anonymous_learner_id text PRIMARY KEY, idempotency_key text NOT NULL UNIQUE,
      user_id text NOT NULL REFERENCES ${table('accounts')}(id) ON DELETE CASCADE, claimed_at timestamptz NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('audit')} (id text PRIMARY KEY, user_id text NOT NULL, action text NOT NULL, occurred_at timestamptz NOT NULL, evidence jsonb NOT NULL)`);
  })();

  async function transaction<T>(operation: (client: PgClientLike) => Promise<T>): Promise<T> {
    await initialized;
    const client = await options.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }

  return {
    mode: 'postgres',
    async createAccount(account, credential) {
      await transaction(async (client) => {
        await client.query(`INSERT INTO ${table('accounts')} (id, email, email_verified, roles, created_at, updated_at)
          VALUES ($1, lower($2), $3, $4::jsonb, $5, $6)`, [account.id, account.email, account.emailVerified, JSON.stringify(account.roles), account.createdAt, account.updatedAt]);
        await client.query(`INSERT INTO ${table('credentials')} (user_id, algorithm, password_hash, updated_at) VALUES ($1, $2, $3, $4)`,
          [credential.userId, credential.algorithm, credential.passwordHash, credential.updatedAt]);
      });
    },
    async getAccount(id) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('accounts')} WHERE id = $1`, [id]); return result.rows[0] ? mapAccount(result.rows[0]) : null; },
    async findAccountByEmail(email) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('accounts')} WHERE lower(email) = lower($1)`, [email]); return result.rows[0] ? mapAccount(result.rows[0]) : null; },
    async putAccount(account) {
      await initialized; const result = await options.pool.query(`UPDATE ${table('accounts')} SET email = lower($2), email_verified = $3, roles = $4::jsonb, updated_at = $5 WHERE id = $1 RETURNING id`,
        [account.id, account.email, account.emailVerified, JSON.stringify(account.roles), account.updatedAt]);
      if (!result.rows[0]) throw new Error('Account not found');
    },
    async getCredential(userId) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('credentials')} WHERE user_id = $1`, [userId]); return result.rows[0] ? mapCredential(result.rows[0]) : null; },
    async putCredential(credential) {
      await initialized; const result = await options.pool.query(`UPDATE ${table('credentials')} SET algorithm = $2, password_hash = $3, updated_at = $4 WHERE user_id = $1 RETURNING user_id`,
        [credential.userId, credential.algorithm, credential.passwordHash, credential.updatedAt]);
      if (!result.rows[0]) throw new Error('Account not found');
    },
    async putToken(token) { await initialized; await options.pool.query(`INSERT INTO ${table('tokens')} (token_hash, purpose, user_id, expires_at, used_at) VALUES ($1, $2, $3, $4, $5)`, [token.tokenHash, token.purpose, token.userId, token.expiresAt, token.usedAt ?? null]); },
    async getToken(tokenHash, purpose) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('tokens')} WHERE token_hash = $1 AND purpose = $2`, [tokenHash, purpose]); return result.rows[0] ? mapToken(result.rows[0]) : null; },
    async useToken(tokenHash, usedAt) { await initialized; const result = await options.pool.query(`UPDATE ${table('tokens')} SET used_at = $2 WHERE token_hash = $1 AND used_at IS NULL RETURNING token_hash`, [tokenHash, usedAt]); return Boolean(result.rows[0]); },
    async putSession(session) { await initialized; await options.pool.query(`INSERT INTO ${table('sessions')} (id, user_id, token_hash, csrf_hash, device_name, created_at, expires_at, revoked_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [session.id, session.userId, session.tokenHash, session.csrfHash, session.deviceName, session.createdAt, session.expiresAt, session.revokedAt ?? null]); },
    async getSessionByTokenHash(tokenHash) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('sessions')} WHERE token_hash = $1`, [tokenHash]); return result.rows[0] ? mapSession(result.rows[0]) : null; },
    async putSessionCsrf(id, csrfHash) { await initialized; const result = await options.pool.query(`UPDATE ${table('sessions')} SET csrf_hash = $2 WHERE id = $1 AND revoked_at IS NULL RETURNING id`, [id, csrfHash]); if (!result.rows[0]) throw new Error('Invalid session'); },
    async revokeSession(id, revokedAt) { await initialized; await options.pool.query(`UPDATE ${table('sessions')} SET revoked_at = COALESCE(revoked_at, $2) WHERE id = $1`, [id, revokedAt]); },
    async revokeUserSessions(userId, revokedAt) { await initialized; await options.pool.query(`UPDATE ${table('sessions')} SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1`, [userId, revokedAt]); },
    async listSessions(userId) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('sessions')} WHERE user_id = $1 ORDER BY created_at DESC`, [userId]); return result.rows.map(mapSession); },
    async claimAnonymous(claim) {
      return transaction(async (client) => {
        const byKey = await client.query(`SELECT * FROM ${table('anonymous_claims')} WHERE idempotency_key = $1`, [claim.idempotencyKey]);
        if (byKey.rows[0]) {
          const replay = mapClaim(byKey.rows[0]);
          if (replay.userId !== claim.userId || replay.anonymousLearnerId !== claim.anonymousLearnerId) throw new Error('Invalid anonymous claim replay');
          return replay;
        }
        const byAnonymous = await client.query(`SELECT * FROM ${table('anonymous_claims')} WHERE anonymous_learner_id = $1`, [claim.anonymousLearnerId]);
        if (byAnonymous.rows[0]) {
          const prior = mapClaim(byAnonymous.rows[0]);
          if (prior.userId !== claim.userId) throw new Error('Anonymous identity already claimed');
          return prior;
        }
        const inserted = await client.query(`INSERT INTO ${table('anonymous_claims')} (anonymous_learner_id, idempotency_key, user_id, claimed_at) VALUES ($1, $2, $3, $4) RETURNING *`,
          [claim.anonymousLearnerId, claim.idempotencyKey, claim.userId, claim.claimedAt]);
        return mapClaim(inserted.rows[0]);
      });
    },
    async appendAudit(event) { await initialized; await options.pool.query(`INSERT INTO ${table('audit')} (id,user_id,action,occurred_at,evidence) VALUES ($1,$2,$3,$4,$5::jsonb)`, [event.id,event.userId,event.action,event.occurredAt,JSON.stringify(event.evidence)]); },
    async listAudit(userId) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('audit')} WHERE user_id = $1 ORDER BY occurred_at, id`, [userId]); return result.rows.map((row) => ({ id: String(row.id), userId: String(row.user_id), action: String(row.action), occurredAt: iso(row.occurred_at), evidence: (typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence) as AccountAuditEvent['evidence'] })); },
  };
}

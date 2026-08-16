import type { LearningStore } from './learning-store.js';
import type { LearnerProfile, LearningEvent } from './learning-validation.js';
import { projectAuthoritativeLearning } from './learning-projection-server.js';

type QueryResult = { rows: Array<Record<string, unknown>> };
type PgClientLike = { query(text: string, values?: unknown[]): Promise<QueryResult>; release(): void };
export type LearningPgPool = { query(text: string, values?: unknown[]): Promise<QueryResult>; connect(): Promise<PgClientLike> };
export const LEARNING_STATE_KINDS = ['drafts', 'progress', 'practice', 'exam', 'mastery', 'delayed-reviews'] as const;
export type LearningStateKind = typeof LEARNING_STATE_KINDS[number];
export type LearningState = { learnerId: string; kind: LearningStateKind; version: number; payload: Record<string, unknown>; updatedAt: string };
export type AttemptRecord = { id: string; learnerId: string; problemId: string; language: string; outcome: string; assisted: boolean; sourceHash: string; createdAt: string };
export type ClaimReceipt = { idempotencyKey: string; sourceLearnerId: string; targetLearnerId: string; moved: { profile: number; events: number; states: number; attempts: number }; claimedAt: string };

export class LearningConflictError extends Error {
  override readonly name = 'LearningConflictError';
  constructor(public readonly currentVersion: number) { super('Learning state version conflict'); }
}

export type AuthoritativeLearningStore = LearningStore & {
  getState(learnerId: string, kind: LearningStateKind): Promise<LearningState | null>;
  putState(input: Omit<LearningState, 'version'> & { expectedVersion: number }): Promise<LearningState>;
  putAttempt(attempt: AttemptRecord): Promise<{ attempt: AttemptRecord; created: boolean }>;
  listAttempts(learnerId: string): Promise<AttemptRecord[]>;
  bootstrap(learnerId: string): Promise<{ profile?: LearnerProfile; events: LearningEvent[]; attempts: AttemptRecord[]; states: LearningState[]; cursor: number }>;
  listEventsAfter(learnerId: string, after: number): Promise<{ cursor: number; events: LearningEvent[] }>;
  claimLearner(sourceLearnerId: string, targetLearnerId: string, idempotencyKey: string, claimedAt: string): Promise<ClaimReceipt>;
  exportLearner(learnerId: string): Promise<Record<string, unknown>>;
  deleteLearner(learnerId: string, requestedAt: string): Promise<void>;
};

function schemaName(value: string): string { if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value)) throw new Error('Invalid learning database schema'); return value; }
function json<T>(value: unknown): T { return structuredClone((typeof value === 'string' ? JSON.parse(value) : value) as T); }
function iso(value: unknown): string { const date = value instanceof Date ? value : new Date(String(value)); return date.toISOString(); }
function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}
function same(left: unknown, right: unknown): boolean { return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right)); }

function mapState(row: Record<string, unknown>): LearningState {
  return { learnerId: String(row.learner_id), kind: row.kind as LearningStateKind, version: Number(row.version), payload: json(row.payload), updatedAt: iso(row.updated_at) };
}
function mapAttempt(row: Record<string, unknown>): AttemptRecord {
  return { id: String(row.id), learnerId: String(row.learner_id), problemId: String(row.problem_id), language: String(row.language), outcome: String(row.outcome), assisted: Boolean(row.assisted), sourceHash: String(row.source_hash), createdAt: iso(row.created_at) };
}

export function createPostgresLearningStore(options: { pool: LearningPgPool; schema?: string }): AuthoritativeLearningStore {
  const schema = schemaName(options.schema ?? 'learning'); const table = (name: string) => `"${schema}"."${name}"`;
  const initialized = (async () => {
    await options.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('profiles')} (learner_id text PRIMARY KEY, updated_at timestamptz NOT NULL, payload jsonb NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('events')} (sequence bigserial PRIMARY KEY, learner_id text NOT NULL, event_id text NOT NULL, created_at timestamptz NOT NULL, payload jsonb NOT NULL, UNIQUE (learner_id, event_id))`);
    await options.pool.query(`CREATE INDEX IF NOT EXISTS "${schema}_events_learner_sequence" ON ${table('events')} (learner_id, sequence)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('states')} (learner_id text NOT NULL, kind text NOT NULL CHECK (kind IN ('drafts','progress','practice','exam','mastery','delayed-reviews')), version integer NOT NULL CHECK (version > 0), updated_at timestamptz NOT NULL, payload jsonb NOT NULL, PRIMARY KEY (learner_id, kind))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('attempts')} (id text PRIMARY KEY, learner_id text NOT NULL, problem_id text NOT NULL, language text NOT NULL, outcome text NOT NULL, assisted boolean NOT NULL, source_hash text NOT NULL, created_at timestamptz NOT NULL, payload jsonb NOT NULL)`);
    await options.pool.query(`CREATE INDEX IF NOT EXISTS "${schema}_attempts_learner_created" ON ${table('attempts')} (learner_id, created_at DESC)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('claims')} (idempotency_key text PRIMARY KEY, source_learner_id text NOT NULL UNIQUE, target_learner_id text NOT NULL, claimed_at timestamptz NOT NULL, receipt jsonb NOT NULL)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('audit')} (id bigserial PRIMARY KEY, learner_id text NOT NULL, action text NOT NULL, occurred_at timestamptz NOT NULL, evidence jsonb NOT NULL)`);
  })();

  async function transaction<T>(operation: (client: PgClientLike) => Promise<T>): Promise<T> {
    await initialized; const client = await options.pool.connect();
    try { await client.query('BEGIN'); const result = await operation(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async function append(client: PgClientLike, event: LearningEvent): Promise<boolean> {
    const prior = await client.query(`SELECT payload FROM ${table('events')} WHERE learner_id = $1 AND event_id = $2`, [event.learnerId, event.id]);
    if (prior.rows[0]) {
      if (!same(json(prior.rows[0].payload), event)) throw new Error('Invalid learning event replay');
      return false;
    }
    await client.query(`INSERT INTO ${table('events')} (learner_id, event_id, created_at, payload) VALUES ($1, $2, $3, $4::jsonb)`, [event.learnerId, event.id, event.createdAt, JSON.stringify(event)]);
    return true;
  }

  async function rebuildProjection(client: PgClientLike, learnerId: string, updatedAt: string) {
    const rows = await client.query(`SELECT payload FROM ${table('events')} WHERE learner_id = $1 ORDER BY sequence`, [learnerId]);
    const projected = projectAuthoritativeLearning(rows.rows.map((row) => json<LearningEvent>(row.payload)));
    const outputs: Array<[LearningStateKind, Record<string, unknown>]> = [['mastery', projected.mastery], ['delayed-reviews', projected.delayedReviews]];
    for (const [kind, payload] of outputs) {
      const prior = await client.query(`SELECT version, payload FROM ${table('states')} WHERE learner_id = $1 AND kind = $2 FOR UPDATE`, [learnerId, kind]);
      if (prior.rows[0] && same(json(prior.rows[0].payload), payload)) continue;
      const version = prior.rows[0] ? Number(prior.rows[0].version) + 1 : 1;
      await client.query(`INSERT INTO ${table('states')} (learner_id,kind,version,updated_at,payload) VALUES ($1,$2,$3,$4,$5::jsonb)
        ON CONFLICT (learner_id,kind) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at, payload = excluded.payload`,
      [learnerId, kind, version, updatedAt, JSON.stringify(payload)]);
    }
  }

  const store: AuthoritativeLearningStore = {
    mode: 'postgres',
    async getProfile(learnerId) { await initialized; const result = await options.pool.query(`SELECT payload FROM ${table('profiles')} WHERE learner_id = $1`, [learnerId]); return result.rows[0] ? json<LearnerProfile>(result.rows[0].payload) : undefined; },
    async putProfile(profile) {
      await initialized;
      await options.pool.query(`INSERT INTO ${table('profiles')} (learner_id, updated_at, payload) VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (learner_id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload WHERE ${table('profiles')}.updated_at <= excluded.updated_at`,
      [profile.learnerId, profile.updatedAt, JSON.stringify(profile)]);
      return (await store.getProfile(profile.learnerId)) ?? profile;
    },
    async listEvents(learnerId) { await initialized; const result = await options.pool.query(`SELECT payload FROM ${table('events')} WHERE learner_id = $1 ORDER BY sequence`, [learnerId]); return result.rows.map((row) => json<LearningEvent>(row.payload)); },
    async appendEvent(event) { return transaction(async (client) => { const created = await append(client, event); if (created) await rebuildProjection(client, event.learnerId, event.createdAt); return { event, created }; }); },
    async appendEvents(events) {
      if (!events.length) return { accepted: 0, created: 0 };
      if (events.some((event) => event.learnerId !== events[0].learnerId)) throw new Error('Invalid learner event owner');
      return transaction(async (client) => { let created = 0; for (const event of events) if (await append(client, event)) created += 1; if (created) await rebuildProjection(client, events[0].learnerId, events[events.length - 1].createdAt); return { accepted: events.length, created }; });
    },
    async getState(learnerId, kind) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('states')} WHERE learner_id = $1 AND kind = $2`, [learnerId, kind]); return result.rows[0] ? mapState(result.rows[0]) : null; },
    async putState(input) {
      if (input.kind === 'mastery' || input.kind === 'delayed-reviews') throw new Error('Unsupported client-owned projection state');
      return transaction(async (client) => {
        const current = await client.query(`SELECT version FROM ${table('states')} WHERE learner_id = $1 AND kind = $2 FOR UPDATE`, [input.learnerId, input.kind]);
        const currentVersion = current.rows[0] ? Number(current.rows[0].version) : 0;
        if (currentVersion !== input.expectedVersion) throw new LearningConflictError(currentVersion);
        const next: LearningState = { learnerId: input.learnerId, kind: input.kind, version: currentVersion + 1, payload: structuredClone(input.payload), updatedAt: input.updatedAt };
        await client.query(`INSERT INTO ${table('states')} (learner_id, kind, version, updated_at, payload) VALUES ($1, $2, $3, $4, $5::jsonb)
          ON CONFLICT (learner_id, kind) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at, payload = excluded.payload`,
        [next.learnerId, next.kind, next.version, next.updatedAt, JSON.stringify(next.payload)]);
        return next;
      });
    },
    async putAttempt(attempt) {
      return transaction(async (client) => {
        const current = await client.query(`SELECT payload FROM ${table('attempts')} WHERE id = $1`, [attempt.id]);
        if (current.rows[0]) {
          const stored = json<AttemptRecord>(current.rows[0].payload);
          if (!same(stored, attempt)) throw new Error('Invalid attempt replay');
          return { attempt: stored, created: false };
        }
        await client.query(`INSERT INTO ${table('attempts')} (id, learner_id, problem_id, language, outcome, assisted, source_hash, created_at, payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
          [attempt.id, attempt.learnerId, attempt.problemId, attempt.language, attempt.outcome, attempt.assisted, attempt.sourceHash, attempt.createdAt, JSON.stringify(attempt)]);
        return { attempt: structuredClone(attempt), created: true };
      });
    },
    async listAttempts(learnerId) { await initialized; const result = await options.pool.query(`SELECT * FROM ${table('attempts')} WHERE learner_id = $1 ORDER BY created_at, id`, [learnerId]); return result.rows.map(mapAttempt); },
    async bootstrap(learnerId) {
      await initialized;
      const [profile, events, attempts, states, cursor] = await Promise.all([
        store.getProfile(learnerId), store.listEvents(learnerId), store.listAttempts(learnerId),
        options.pool.query(`SELECT * FROM ${table('states')} WHERE learner_id = $1 ORDER BY kind`, [learnerId]),
        options.pool.query(`SELECT COALESCE(max(sequence), 0) AS cursor FROM ${table('events')} WHERE learner_id = $1`, [learnerId]),
      ]);
      return { ...(profile ? { profile } : {}), events, attempts, states: states.rows.map(mapState), cursor: Number(cursor.rows[0]?.cursor ?? 0) };
    },
    async listEventsAfter(learnerId, after) {
      await initialized;
      const result = await options.pool.query(`SELECT sequence, payload FROM ${table('events')} WHERE learner_id = $1 AND sequence > $2 ORDER BY sequence LIMIT 500`, [learnerId, after]);
      return { cursor: result.rows.length ? Number(result.rows[result.rows.length - 1].sequence) : after, events: result.rows.map((row) => json<LearningEvent>(row.payload)) };
    },
    async claimLearner(sourceLearnerId, targetLearnerId, idempotencyKey, claimedAt) {
      return transaction(async (client) => {
        const replay = await client.query(`SELECT receipt FROM ${table('claims')} WHERE idempotency_key = $1`, [idempotencyKey]);
        if (replay.rows[0]) {
          const receipt = json<ClaimReceipt>(replay.rows[0].receipt);
          if (receipt.sourceLearnerId !== sourceLearnerId || receipt.targetLearnerId !== targetLearnerId) throw new Error('Invalid learning claim replay');
          return receipt;
        }
        const claimed = await client.query(`SELECT target_learner_id FROM ${table('claims')} WHERE source_learner_id = $1`, [sourceLearnerId]);
        if (claimed.rows[0]) throw new Error('Anonymous learning data already claimed');
        const sourceProfile = await client.query(`SELECT payload, updated_at FROM ${table('profiles')} WHERE learner_id = $1`, [sourceLearnerId]);
        const sourceEvents = await client.query(`SELECT event_id, payload, created_at FROM ${table('events')} WHERE learner_id = $1 ORDER BY sequence`, [sourceLearnerId]);
        const sourceStates = await client.query(`SELECT * FROM ${table('states')} WHERE learner_id = $1`, [sourceLearnerId]);
        const sourceAttempts = await client.query(`SELECT * FROM ${table('attempts')} WHERE learner_id = $1`, [sourceLearnerId]);
        if (sourceProfile.rows[0]) {
          const migrated = { ...json<LearnerProfile>(sourceProfile.rows[0].payload), learnerId: targetLearnerId };
          await client.query(`INSERT INTO ${table('profiles')} (learner_id, updated_at, payload) VALUES ($1,$2,$3::jsonb) ON CONFLICT (learner_id) DO NOTHING`, [targetLearnerId, sourceProfile.rows[0].updated_at, JSON.stringify(migrated)]);
          await client.query(`DELETE FROM ${table('profiles')} WHERE learner_id = $1`, [sourceLearnerId]);
        }
        for (const row of sourceEvents.rows) {
          const migrated = { ...json<LearningEvent>(row.payload), learnerId: targetLearnerId };
          const prior = await client.query(`SELECT payload FROM ${table('events')} WHERE learner_id = $1 AND event_id = $2`, [targetLearnerId, row.event_id]);
          if (!prior.rows[0]) await client.query(`INSERT INTO ${table('events')} (learner_id,event_id,created_at,payload) VALUES ($1,$2,$3,$4::jsonb)`, [targetLearnerId, row.event_id, row.created_at, JSON.stringify(migrated)]);
        }
        await client.query(`DELETE FROM ${table('events')} WHERE learner_id = $1`, [sourceLearnerId]);
        for (const row of sourceStates.rows) {
          const prior = await client.query(`SELECT version FROM ${table('states')} WHERE learner_id = $1 AND kind = $2`, [targetLearnerId, row.kind]);
          if (!prior.rows[0]) await client.query(`INSERT INTO ${table('states')} (learner_id,kind,version,updated_at,payload) VALUES ($1,$2,$3,$4,$5::jsonb)`, [targetLearnerId,row.kind,row.version,row.updated_at,JSON.stringify(json(row.payload))]);
        }
        await client.query(`DELETE FROM ${table('states')} WHERE learner_id = $1`, [sourceLearnerId]);
        for (const row of sourceAttempts.rows) await client.query(`UPDATE ${table('attempts')} SET learner_id = $2, payload = $3::jsonb WHERE id = $1`, [row.id, targetLearnerId, JSON.stringify({ ...json<AttemptRecord>(row.payload), learnerId: targetLearnerId })]);
        const receipt: ClaimReceipt = { idempotencyKey, sourceLearnerId, targetLearnerId, moved: { profile: sourceProfile.rows.length, events: sourceEvents.rows.length, states: sourceStates.rows.length, attempts: sourceAttempts.rows.length }, claimedAt };
        await client.query(`INSERT INTO ${table('claims')} (idempotency_key,source_learner_id,target_learner_id,claimed_at,receipt) VALUES ($1,$2,$3,$4,$5::jsonb)`, [idempotencyKey,sourceLearnerId,targetLearnerId,claimedAt,JSON.stringify(receipt)]);
        await client.query(`INSERT INTO ${table('audit')} (learner_id,action,occurred_at,evidence) VALUES ($1,'anonymous-claim',$2,$3::jsonb)`, [targetLearnerId,claimedAt,JSON.stringify(receipt)]);
        return receipt;
      });
    },
    async exportLearner(learnerId) { return { version: 1, learnerId, exportedAt: new Date().toISOString(), ...(await store.bootstrap(learnerId)) }; },
    async deleteLearner(learnerId, requestedAt) {
      await transaction(async (client) => {
        const evidence = JSON.stringify({ requestedAt });
        for (const name of ['profiles', 'events', 'states', 'attempts']) await client.query(`DELETE FROM ${table(name)} WHERE learner_id = $1`, [learnerId]);
        await client.query(`INSERT INTO ${table('audit')} (learner_id,action,occurred_at,evidence) VALUES ($1,'learner-deleted',$2,$3::jsonb)`, [learnerId,requestedAt,evidence]);
      });
    },
  };
  return store;
}

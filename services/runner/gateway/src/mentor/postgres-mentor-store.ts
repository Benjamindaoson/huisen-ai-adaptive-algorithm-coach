import type { LearningEvent } from '../learning-validation.js';
import type { MentorSession } from './mentor-engine.js';
import { createLearnerTwin, projectLearnerTwin, type LearnerTwin } from './learner-twin.js';
import { twinObservationsFromLearningEvents, type MentorStore } from './mentor-store.js';

const MAX_TIMELINE = 200;

type QueryResult = { rows: Array<Record<string, unknown>> };
type PgClientLike = { query(text: string, values?: unknown[]): Promise<QueryResult>; release(): void };
export type PgPoolLike = { query(text: string, values?: unknown[]): Promise<QueryResult>; connect(): Promise<PgClientLike> };

function validId(value: string): boolean {
  return /^[a-zA-Z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
}

function payload<T>(value: unknown): T {
  return structuredClone((typeof value === 'string' ? JSON.parse(value) : value) as T);
}

export function createPostgresMentorStore(options: { pool: PgPoolLike; schema?: string; maxSessions?: number }): MentorStore {
  const schema = options.schema ?? 'mentor';
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid Mentor database schema');
  const maxSessions = Math.max(1, Math.min(options.maxSessions ?? 200, 10_000));
  const table = (name: string) => `"${schema}"."${name}"`;
  const initialized = (async () => {
    await options.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('sessions')} (id text PRIMARY KEY, learner_id text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL)`);
    await options.pool.query(`CREATE INDEX IF NOT EXISTS "${schema}_sessions_learner_updated" ON ${table('sessions')} (learner_id, updated_at DESC, id DESC)`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('twins')} (learner_id text PRIMARY KEY, updated_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL)`);
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

  async function upsertTwin(client: PgClientLike, twin: LearnerTwin): Promise<void> {
    await client.query(`INSERT INTO ${table('twins')} (learner_id, updated_at, payload) VALUES ($1, now(), $2::jsonb)
      ON CONFLICT (learner_id) DO UPDATE SET updated_at = excluded.updated_at, payload = excluded.payload`, [twin.learnerId, JSON.stringify(twin)]);
  }

  return {
    mode: 'postgres',
    async getSession(id, learnerId) {
      if (!validId(id) || !validId(learnerId)) return undefined;
      await initialized;
      const result = await options.pool.query(`SELECT payload FROM ${table('sessions')} WHERE id = $1 AND learner_id = $2`, [id, learnerId]);
      return result.rows[0] ? payload<MentorSession>(result.rows[0].payload) : undefined;
    },
    async putSession(session) {
      if (!validId(session.id) || !validId(session.learnerId) || session.version !== 1) throw new Error('Invalid Mentor session');
      const stored = structuredClone({ ...session, timeline: session.timeline.slice(-MAX_TIMELINE) });
      return transaction(async (client) => {
        await client.query(`INSERT INTO ${table('sessions')} (id, learner_id, updated_at, payload) VALUES ($1, $2, now(), $3::jsonb)
          ON CONFLICT (id) DO UPDATE SET learner_id = excluded.learner_id, updated_at = excluded.updated_at, payload = excluded.payload`, [stored.id, stored.learnerId, JSON.stringify(stored)]);
        await upsertTwin(client, stored.twin);
        const retained = await client.query(`SELECT id FROM ${table('sessions')} ORDER BY updated_at DESC, id DESC`);
        for (const row of retained.rows.slice(maxSessions)) await client.query(`DELETE FROM ${table('sessions')} WHERE id = $1`, [row.id]);
        return structuredClone(stored);
      });
    },
    async getTwin(learnerId) {
      if (!validId(learnerId)) return undefined;
      await initialized;
      const result = await options.pool.query(`SELECT payload FROM ${table('twins')} WHERE learner_id = $1`, [learnerId]);
      return result.rows[0] ? payload<LearnerTwin>(result.rows[0].payload) : undefined;
    },
    async putTwin(twin) {
      if (!validId(twin.learnerId) || twin.version !== 1) throw new Error('Invalid learner twin');
      return transaction(async (client) => { await upsertTwin(client, twin); return structuredClone(twin); });
    },
    async migrateLearningEvents(learnerId: string, events: LearningEvent[], now = new Date()) {
      if (!validId(learnerId)) throw new Error('Invalid learner id');
      return transaction(async (client) => {
        const existing = await client.query(`SELECT payload FROM ${table('twins')} WHERE learner_id = $1 FOR UPDATE`, [learnerId]);
        const current = existing.rows[0] ? payload<LearnerTwin>(existing.rows[0].payload) : createLearnerTwin(learnerId, now);
        const twin = projectLearnerTwin(current, twinObservationsFromLearningEvents(events), now);
        await upsertTwin(client, twin);
        return structuredClone(twin);
      });
    },
  };
}

import { randomUUID } from 'node:crypto';
import type { MentorLifecycleType, MentorStopReason } from './contracts.js';
import type { MentorOSCommit, MentorOSEvent, MentorOSEventMetadata, MentorOSRun, MentorOSStart, MentorOSStore } from './store.js';

type QueryResult = { rows: Array<Record<string, unknown>> };
type PgClientLike = { query(text: string, values?: unknown[]): Promise<QueryResult>; release(): void };
export type MentorOSPgPool = { query(text: string, values?: unknown[]): Promise<QueryResult>; connect(): Promise<PgClientLike> };

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
const asJson = <T>(value: unknown): T => structuredClone((typeof value === 'string' ? JSON.parse(value) : value) as T);
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();

function eventFrom(row: Record<string, unknown>): MentorOSEvent {
  return {
    id: String(row.id), sequence: Number(row.sequence), type: String(row.type) as MentorLifecycleType,
    detail: String(row.detail), evidenceRefs: asJson<string[]>(row.evidence_refs), at: iso(row.occurred_at),
    ...(row.stop_reason ? { stopReason: String(row.stop_reason) as MentorStopReason } : {}),
    ...(row.metadata && Object.keys(asJson<Record<string, unknown>>(row.metadata)).length ? { metadata: asJson<MentorOSEventMetadata>(row.metadata) } : {}),
  };
}

export function createPostgresMentorOSStore(options: { pool: MentorOSPgPool; schema?: string }): MentorOSStore {
  const schema = options.schema ?? 'mentor_os';
  if (!IDENTIFIER.test(schema)) throw new Error('Invalid Mentor OS database schema');
  const table = (name: string) => `"${schema}"."${name}"`;
  const initialized = (async () => {
    await options.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('runs')} (
      id text PRIMARY KEY, learner_id text NOT NULL, idempotency_key text NOT NULL, goal text NOT NULL, route jsonb NOT NULL,
      status text NOT NULL, sequence integer NOT NULL, checkpoint jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (learner_id, idempotency_key))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('events')} (
      run_id text NOT NULL REFERENCES ${table('runs')}(id), sequence integer NOT NULL, id text NOT NULL UNIQUE,
      type text NOT NULL, detail text NOT NULL, evidence_refs jsonb NOT NULL, occurred_at timestamptz NOT NULL,
      stop_reason text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, PRIMARY KEY (run_id, sequence))`);
    await options.pool.query(`CREATE TABLE IF NOT EXISTS ${table('commands')} (
      run_id text NOT NULL REFERENCES ${table('runs')}(id), idempotency_key text NOT NULL, result jsonb NOT NULL,
      PRIMARY KEY (run_id, idempotency_key))`);
  })();

  async function transaction<T>(operation: (client: PgClientLike) => Promise<T>): Promise<T> {
    await initialized; const client = await options.pool.connect();
    try { await client.query('BEGIN'); const result = await operation(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async function getWith(client: Pick<PgClientLike, 'query'>, runId: string, lock = false): Promise<MentorOSRun | null> {
    const result = await client.query(`SELECT * FROM ${table('runs')} WHERE id = $1${lock ? ' FOR UPDATE' : ''}`, [runId]);
    const row = result.rows[0]; if (!row) return null;
    const eventRows = await client.query(`SELECT * FROM ${table('events')} WHERE run_id = $1 ORDER BY sequence`, [runId]);
    return {
      version: 1, id: String(row.id), learnerId: String(row.learner_id), goal: String(row.goal), route: asJson<MentorOSRun['route']>(row.route),
      status: String(row.status) as MentorOSRun['status'], sequence: Number(row.sequence), events: eventRows.rows.map(eventFrom),
      checkpoint: asJson<MentorOSRun['checkpoint']>(row.checkpoint),
    };
  }

  return {
    mode: 'postgres',
    async start(input: MentorOSStart) {
      return transaction(async (client) => {
        const existing = await client.query(`SELECT id FROM ${table('runs')} WHERE learner_id = $1 AND idempotency_key = $2`, [input.learnerId, input.idempotencyKey]);
        if (existing.rows[0]) return (await getWith(client, String(existing.rows[0].id)))!;
        const id = `mentor-os-${randomUUID()}`; const at = new Date().toISOString();
        const event: MentorOSEvent = { id: `${id}:1`, sequence: 1, type: 'run-started', detail: input.goal, evidenceRefs: [`goal:${id}`], at };
        const checkpoint = { sequence: 1, nextAction: '编译当前学习上下文' };
        await client.query(`INSERT INTO ${table('runs')} (id,learner_id,idempotency_key,goal,route,status,sequence,checkpoint) VALUES ($1,$2,$3,$4,$5::jsonb,'active',1,$6::jsonb)`, [id, input.learnerId, input.idempotencyKey, input.goal, JSON.stringify(input.route), JSON.stringify(checkpoint)]);
        await client.query(`INSERT INTO ${table('events')} (run_id,sequence,id,type,detail,evidence_refs,occurred_at,metadata) VALUES ($1,1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)`, [id, event.id, event.type, event.detail, JSON.stringify(event.evidenceRefs), at, '{}']);
        return { version: 1, id, learnerId: input.learnerId, goal: input.goal, route: input.route, status: 'active', sequence: 1, events: [event], checkpoint };
      });
    },
    async commit(runId: string, input: MentorOSCommit) {
      return transaction(async (client) => {
        const replay = await client.query(`SELECT result FROM ${table('commands')} WHERE run_id = $1 AND idempotency_key = $2`, [runId, input.idempotencyKey]);
        if (replay.rows[0]) return asJson<{ run: MentorOSRun; event: MentorOSEvent }>(replay.rows[0].result);
        const run = await getWith(client, runId, true); if (!run) throw new Error('Mentor OS run not found');
        // A concurrent retry can pass the first lookup before the winning
        // transaction commits. Recheck after the run row lock so identical
        // browser retries replay instead of surfacing a sequence conflict.
        const replayAfterLock = await client.query(`SELECT result FROM ${table('commands')} WHERE run_id = $1 AND idempotency_key = $2`, [runId, input.idempotencyKey]);
        if (replayAfterLock.rows[0]) return asJson<{ run: MentorOSRun; event: MentorOSEvent }>(replayAfterLock.rows[0].result);
        if (run.sequence !== input.expectedSequence) throw new Error(`Mentor OS sequence conflict: expected ${run.sequence}`);
        const sequence = run.sequence + 1; const at = new Date().toISOString();
        const event: MentorOSEvent = {
          id: `${runId}:${sequence}`, sequence, type: input.type, detail: input.detail.slice(0, 2_000),
          evidenceRefs: [...new Set(input.evidenceRefs)].slice(0, 20), at,
          ...(input.stopReason ? { stopReason: input.stopReason } : {}), ...(input.metadata ? { metadata: structuredClone(input.metadata) } : {}),
        };
        const stopped = input.type === 'stopped' || input.type === 'policy-denied';
        const status: MentorOSRun['status'] = stopped ? (input.stopReason === 'completed' ? 'complete' : 'paused') : 'active';
        const checkpoint: MentorOSRun['checkpoint'] = { sequence, ...(input.stopReason ? { stopReason: input.stopReason } : {}), nextAction: event.detail };
        await client.query(`INSERT INTO ${table('events')} (run_id,sequence,id,type,detail,evidence_refs,occurred_at,stop_reason,metadata) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9::jsonb)`, [runId, sequence, event.id, event.type, event.detail, JSON.stringify(event.evidenceRefs), at, event.stopReason ?? null, JSON.stringify(event.metadata ?? {})]);
        await client.query(`UPDATE ${table('runs')} SET status=$2,sequence=$3,checkpoint=$4::jsonb WHERE id=$1`, [runId, status, sequence, JSON.stringify(checkpoint)]);
        const next: MentorOSRun = { ...run, status, sequence, events: [...run.events, event], checkpoint };
        const result = { run: next, event };
        await client.query(`INSERT INTO ${table('commands')} (run_id,idempotency_key,result) VALUES ($1,$2,$3::jsonb)`, [runId, input.idempotencyKey, JSON.stringify(result)]);
        return structuredClone(result);
      });
    },
    async get(runId) { await initialized; return getWith(options.pool as unknown as Pick<PgClientLike, 'query'>, runId); },
    async eventsAfter(runId, cursor) {
      await initialized; const result = await options.pool.query(`SELECT * FROM ${table('events')} WHERE run_id=$1 AND sequence>$2 ORDER BY sequence`, [runId, cursor]);
      return result.rows.map(eventFrom);
    },
    async claimOperation(runId, idempotencyKey) {
      await initialized;
      const key = `operation:${idempotencyKey}`;
      const pending = { status: 'pending', claimedAt: new Date().toISOString(), claimId: randomUUID() };
      await options.pool.query(`INSERT INTO ${table('commands')} (run_id,idempotency_key,result) VALUES ($1,$2,$3::jsonb) ON CONFLICT (run_id,idempotency_key) DO NOTHING`, [runId, key, JSON.stringify(pending)]);
      const selected = await options.pool.query(`SELECT result FROM ${table('commands')} WHERE run_id=$1 AND idempotency_key=$2`, [runId, key]);
      const existing = asJson<{ status: 'pending'; claimedAt: string; claimId?: string } | { status: 'completed'; value: unknown }>(selected.rows[0]?.result);
      if (existing.status === 'completed') return { status: 'completed' as const, value: structuredClone(existing.value) };
      if (existing.claimId === pending.claimId) return { status: 'claimed' as const };
      if (Date.now() - new Date(existing.claimedAt).getTime() < 120_000) return { status: 'pending' as const };
      const reclaimed = await options.pool.query(`UPDATE ${table('commands')} SET result=$3::jsonb WHERE run_id=$1 AND idempotency_key=$2 AND result=$4::jsonb RETURNING result`, [runId, key, JSON.stringify(pending), JSON.stringify(existing)]);
      return reclaimed.rows.length ? { status: 'claimed' as const } : { status: 'pending' as const };
    },
    async completeOperation(runId, idempotencyKey, value) {
      await initialized;
      await options.pool.query(`UPDATE ${table('commands')} SET result=$3::jsonb WHERE run_id=$1 AND idempotency_key=$2`, [runId, `operation:${idempotencyKey}`, JSON.stringify({ status: 'completed', value })]);
    },
    async abandonOperation(runId, idempotencyKey) {
      await initialized;
      await options.pool.query(`DELETE FROM ${table('commands')} WHERE run_id=$1 AND idempotency_key=$2 AND result->>'status'='pending'`, [runId, `operation:${idempotencyKey}`]);
    },
  };
}

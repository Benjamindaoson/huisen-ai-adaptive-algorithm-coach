import { readFile } from 'node:fs/promises';
import { Pool, type PoolConfig } from 'pg';
import type { MentorSession } from './mentor-engine.js';
import type { LearnerTwin } from './learner-twin.js';
import { createMentorStore, type MentorStore } from './mentor-store.js';
import { createPostgresMentorStore, type PgPoolLike } from './postgres-mentor-store.js';

const PG_KEYS = ['MENTOR_PG_HOST', 'MENTOR_PG_PORT', 'MENTOR_PG_DATABASE', 'MENTOR_PG_USER', 'MENTOR_PG_PASSWORD'] as const;

export function resolveMentorDatabaseConfig(env: Record<string, string | undefined>): PoolConfig | null {
  if (env.MENTOR_DATABASE_URL?.trim()) return { connectionString: env.MENTOR_DATABASE_URL.trim() };
  const present = PG_KEYS.some((key) => Boolean(env[key]?.trim()));
  if (!present) return null;
  const host = env.MENTOR_PG_HOST?.trim();
  const database = env.MENTOR_PG_DATABASE?.trim() || env.POSTGRES_DB?.trim();
  const user = env.MENTOR_PG_USER?.trim() || env.POSTGRES_USER?.trim();
  const password = env.MENTOR_PG_PASSWORD ?? env.POSTGRES_PASSWORD;
  if (!host || !database || !user || !password?.trim()) throw new Error('Incomplete Mentor PostgreSQL configuration');
  const portValue = env.MENTOR_PG_PORT?.trim() || env.POSTGRES_PORT?.trim();
  const port = portValue ? Number(portValue) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('Invalid Mentor PostgreSQL port');
  return { host, port, database, user, password };
}

function withFileMigration(target: MentorStore, filePath?: string): MentorStore {
  if (!filePath) return target;
  let migration: Promise<void> | undefined;
  const ensure = () => migration ??= (async () => {
    let value: unknown;
    try { value = JSON.parse(await readFile(filePath, 'utf8')); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return;
    const raw = value as { sessions?: Record<string, MentorSession>; twins?: Record<string, LearnerTwin> };
    for (const session of Object.values(raw.sessions ?? {})) {
      if (!session || session.version !== 1 || await target.getSession(session.id, session.learnerId)) continue;
      await target.putSession(session);
    }
    for (const twin of Object.values(raw.twins ?? {})) {
      if (!twin || twin.version !== 1 || await target.getTwin(twin.learnerId)) continue;
      await target.putTwin(twin);
    }
  })();
  return {
    mode: target.mode,
    async getSession(id, learnerId) { await ensure(); return target.getSession(id, learnerId); },
    async putSession(session) { await ensure(); return target.putSession(session); },
    async getTwin(learnerId) { await ensure(); return target.getTwin(learnerId); },
    async putTwin(twin) { await ensure(); return target.putTwin(twin); },
    async migrateLearningEvents(learnerId, events, now) { await ensure(); return target.migrateLearningEvents(learnerId, events, now); },
  };
}

export function createConfiguredMentorStore(options: {
  env?: Record<string, string | undefined>;
  filePath?: string;
  poolFactory?: (config: PoolConfig) => PgPoolLike;
} = {}): MentorStore {
  const config = resolveMentorDatabaseConfig(options.env ?? process.env);
  if (!config) return createMentorStore({ filePath: options.filePath });
  const pool = (options.poolFactory ?? ((value) => new Pool(value) as unknown as PgPoolLike))(config);
  return withFileMigration(createPostgresMentorStore({ pool, schema: 'mentor' }), options.filePath);
}

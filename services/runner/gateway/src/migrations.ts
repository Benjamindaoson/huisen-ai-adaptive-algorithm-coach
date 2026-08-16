import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { LearningPgPool } from './postgres-learning-store.js';

export type Migration = { id: string; sql: string; checksum: string };

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const files = (await readdir(directory)).filter((file) => /^\d+_[a-z0-9_-]+\.sql$/.test(file)).sort();
  return Promise.all(files.map(async (file) => {
    const sql = await readFile(join(directory, file), 'utf8');
    return { id: basename(file, '.sql'), sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export async function applyMigrations(pool: LearningPgPool, migrations: Migration[]) {
  await pool.query('CREATE SCHEMA IF NOT EXISTS platform');
  await pool.query('CREATE TABLE IF NOT EXISTS platform.schema_migrations (id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied: string[] = []; const skipped: string[] = [];
  for (const migration of migrations) {
    const prior = await pool.query('SELECT checksum FROM platform.schema_migrations WHERE id = $1', [migration.id]);
    if (prior.rows[0]) {
      if (prior.rows[0].checksum !== migration.checksum) throw new Error(`Migration checksum mismatch: ${migration.id}`);
      skipped.push(migration.id); continue;
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query(migration.sql);
      await client.query('INSERT INTO platform.schema_migrations (id, checksum) VALUES ($1, $2)', [migration.id, migration.checksum]);
      await client.query('COMMIT'); applied.push(migration.id);
    } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
    finally { client.release(); }
  }
  return { applied, skipped };
}

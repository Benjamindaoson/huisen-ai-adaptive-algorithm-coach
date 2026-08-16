import { createHash } from 'node:crypto';
import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import { applyMigrations, type Migration } from './migrations.js';

describe('database migrations', () => {
  it('applies ordered migrations once and records immutable checksums', async () => {
    const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); const pool = new adapter.Pool();
    const migrations: Migration[] = [
      { id: '001_test', sql: 'CREATE TABLE public.first_table (id text PRIMARY KEY);', checksum: createHash('sha256').update('CREATE TABLE public.first_table (id text PRIMARY KEY);').digest('hex') },
      { id: '002_test', sql: 'CREATE TABLE public.second_table (id text PRIMARY KEY);', checksum: createHash('sha256').update('CREATE TABLE public.second_table (id text PRIMARY KEY);').digest('hex') },
    ];
    expect(await applyMigrations(pool, migrations)).toEqual({ applied: ['001_test', '002_test'], skipped: [] });
    expect(await applyMigrations(pool, migrations)).toEqual({ applied: [], skipped: ['001_test', '002_test'] });
    await expect(applyMigrations(pool, [{ ...migrations[0], checksum: 'f'.repeat(64) }])).rejects.toThrow('checksum mismatch');
    await pool.end();
  });
});

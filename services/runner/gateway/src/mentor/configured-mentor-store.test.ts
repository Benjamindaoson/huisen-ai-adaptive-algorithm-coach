import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { newDb } from 'pg-mem';
import { afterEach, describe, expect, it } from 'vitest';
import type { MentorSession } from './mentor-engine.js';
import { createConfiguredMentorStore, resolveMentorDatabaseConfig } from './configured-mentor-store.js';
import { createLearnerTwin } from './learner-twin.js';
import { createMentorStore } from './mentor-store.js';

const temporary: string[] = [];
afterEach(async () => Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

function session(): MentorSession {
  return { version: 1, id: 'session-1', learnerId: 'learner-a', problemId: 'od-1', phase: 'observing', mode: 'deterministic', judgeOutcome: 'failed', nextAction: '观察', timeline: [], twin: createLearnerTwin('learner-a') };
}

describe('configured Mentor store', () => {
  it('selects explicit file-local mode when database settings are absent and rejects partial settings', () => {
    expect(createConfiguredMentorStore({ env: {}, filePath: undefined }).mode).toBe('file-local');
    expect(() => resolveMentorDatabaseConfig({ MENTOR_PG_HOST: 'db' })).toThrow('Incomplete Mentor PostgreSQL configuration');
    expect(resolveMentorDatabaseConfig({ MENTOR_PG_HOST: 'db', POSTGRES_DB: 'judge0', POSTGRES_USER: 'judge0', POSTGRES_PASSWORD: 'secret' })).toMatchObject({ host: 'db', database: 'judge0', user: 'judge0' });
  });

  it('migrates an existing file session once into PostgreSQL', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mentor-configured-')); temporary.push(directory);
    const filePath = join(directory, 'mentor.json');
    await createMentorStore({ filePath }).putSession(session());
    const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); const pool = new adapter.Pool();
    const store = createConfiguredMentorStore({
      env: { MENTOR_DATABASE_URL: 'postgres://configured' }, filePath,
      poolFactory: () => pool,
    });
    expect(store.mode).toBe('postgres');
    expect((await store.getSession('session-1', 'learner-a'))?.id).toBe('session-1');
    expect(await store.getSession('session-1', 'learner-b')).toBeUndefined();
    await pool.end();
  });
});

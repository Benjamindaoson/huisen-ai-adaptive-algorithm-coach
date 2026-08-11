import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import type { MentorSession } from './mentor-engine.js';
import { createLearnerTwin } from './learner-twin.js';
import { createPostgresMentorStore } from './postgres-mentor-store.js';

function session(id: string, learnerId = 'learner-a'): MentorSession {
  return {
    version: 1, id, learnerId, problemId: 'od-1', phase: 'awaiting-prediction', mode: 'deterministic',
    judgeOutcome: 'wrong-answer', nextAction: '预测边界', twin: createLearnerTwin(learnerId),
    timeline: Array.from({ length: 205 }, (_, index) => ({
      id: `${id}:event:${index}`, type: 'observation' as const, title: '观察', detail: `证据 ${index}`,
      at: new Date(1_700_000_000_000 + index).toISOString(), evidenceRefs: [`ref:${index}`], status: 'complete' as const,
    })),
  };
}

describe('PostgreSQL Mentor store', () => {
  it('persists owner-scoped sessions and twins across store instances with bounded retention', async () => {
    const memory = newDb({ noAstCoverageCheck: true });
    const adapter = memory.adapters.createPg();
    const pool = new adapter.Pool();
    const first = createPostgresMentorStore({ pool, schema: 'mentor_test', maxSessions: 2 });
    await first.putSession(session('session-1'));
    await first.putSession(session('session-2'));
    await first.putSession(session('session-3'));
    expect(first.mode).toBe('postgres');
    expect(await first.getSession('session-1', 'learner-a')).toBeUndefined();
    expect((await first.getSession('session-3', 'learner-a'))?.timeline).toHaveLength(200);
    expect(await first.getSession('session-3', 'learner-b')).toBeUndefined();

    const afterRestart = createPostgresMentorStore({ pool, schema: 'mentor_test', maxSessions: 2 });
    expect((await afterRestart.getTwin('learner-a'))?.learnerId).toBe('learner-a');
    const stored = await afterRestart.getSession('session-3', 'learner-a');
    if (!stored) throw new Error('missing stored session');
    stored.nextAction = 'mutated copy';
    expect((await afterRestart.getSession('session-3', 'learner-a'))?.nextAction).toBe('预测边界');
    await pool.end();
  });

  it('projects migrated learning events into durable twin evidence', async () => {
    const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); const pool = new adapter.Pool();
    const store = createPostgresMentorStore({ pool, schema: 'mentor_migration' });
    const twin = await store.migrateLearningEvents('learner-a', [{
      id: 'event-1', learnerId: 'learner-a', kind: 'attempt-recorded', problemId: 'od-1', attemptId: 'a1',
      data: { outcome: 'passed', assisted: true, skillIds: ['array'] }, createdAt: '2026-08-11T00:00:00Z',
    }], new Date('2026-08-11T01:00:00Z'));
    expect(twin.skills.array.assistedPasses).toBe(1);
    expect((await store.getTwin('learner-a'))?.skills.array.assistedPasses).toBe(1);
    await pool.end();
  });
});

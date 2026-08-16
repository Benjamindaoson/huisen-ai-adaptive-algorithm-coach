import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import type { LearnerProfile, LearningEvent } from './learning-validation.js';
import { LearningConflictError, createPostgresLearningStore } from './postgres-learning-store.js';

const profile: LearnerProfile = {
  learnerId: 'learner-a', target: 'foundation', examDate: null, dailyMinutes: 45,
  preferredLanguage: 'python', updatedAt: '2026-08-13T00:00:00.000Z',
};
const event: LearningEvent = {
  id: 'event-1', learnerId: profile.learnerId, kind: 'attempt-recorded', problemId: 'od-1', attemptId: 'attempt-1',
  data: { outcome: 'wrong-answer', assisted: false, skillIds: ['array'] }, createdAt: '2026-08-13T00:01:00.000Z',
};

function memoryPool() { const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); return new adapter.Pool(); }

describe('authoritative PostgreSQL learning store', () => {
  it('persists profiles and idempotent semantic events across restarts', async () => {
    const pool = memoryPool();
    const first = createPostgresLearningStore({ pool, schema: 'learning_test' });
    await first.putProfile(profile);
    expect(await first.appendEvent(event)).toMatchObject({ created: true });
    expect(await first.appendEvent(event)).toMatchObject({ created: false });
    await expect(first.appendEvent({ ...event, data: { ...event.data, outcome: 'passed' } })).rejects.toThrow('Invalid learning event replay');

    const restarted = createPostgresLearningStore({ pool, schema: 'learning_test' });
    expect(restarted.mode).toBe('postgres');
    expect(await restarted.getProfile(profile.learnerId)).toEqual(profile);
    expect(await restarted.listEvents(profile.learnerId)).toEqual([event]);
    await pool.end();
  });

  it('treats JSONB key reordering as the same idempotent event', async () => {
    const pool = memoryPool();
    const store = createPostgresLearningStore({ pool, schema: 'learning_jsonb_order' });
    await store.appendEvent(event);
    const reordered = {
      createdAt: event.createdAt,
      data: { skillIds: ['array'], assisted: false, outcome: 'wrong-answer' },
      attemptId: event.attemptId,
      problemId: event.problemId,
      kind: event.kind,
      learnerId: event.learnerId,
      id: event.id,
    };
    await pool.query('UPDATE learning_jsonb_order.events SET payload = $1::jsonb WHERE event_id = $2', [JSON.stringify(reordered), event.id]);

    await expect(store.appendEvent(event)).resolves.toMatchObject({ created: false });
    await pool.end();
  });

  it('uses monotonic optimistic versions for server-authoritative state', async () => {
    const pool = memoryPool();
    const store = createPostgresLearningStore({ pool, schema: 'learning_versions' });
    const created = await store.putState({ learnerId: 'learner-a', kind: 'progress', expectedVersion: 0, payload: { completed: ['od-1'] }, updatedAt: '2026-08-13T00:00:00.000Z' });
    expect(created).toMatchObject({ version: 1, kind: 'progress', payload: { completed: ['od-1'] } });
    await expect(store.putState({ learnerId: 'learner-a', kind: 'progress', expectedVersion: 0, payload: { completed: [] }, updatedAt: '2026-08-13T00:01:00.000Z' }))
      .rejects.toEqual(expect.objectContaining<Partial<LearningConflictError>>({ name: 'LearningConflictError', currentVersion: 1 }));
    expect((await store.putState({ learnerId: 'learner-a', kind: 'progress', expectedVersion: 1, payload: { completed: ['od-1', 'od-2'] }, updatedAt: '2026-08-13T00:02:00.000Z' })).version).toBe(2);
    await pool.end();
  });

  it('stores immutable attempts and returns a complete bootstrap snapshot', async () => {
    const pool = memoryPool();
    const store = createPostgresLearningStore({ pool, schema: 'learning_bootstrap' });
    await store.putProfile(profile); await store.appendEvent(event);
    const attempt = {
      id: 'attempt-1', learnerId: 'learner-a', problemId: 'od-1', language: 'python', outcome: 'wrong-answer',
      assisted: false, sourceHash: 'a'.repeat(64), createdAt: '2026-08-13T00:01:00.000Z',
    } as const;
    expect(await store.putAttempt(attempt)).toMatchObject({ created: true });
    expect(await store.putAttempt(attempt)).toMatchObject({ created: false });
    await store.putState({ learnerId: 'learner-a', kind: 'exam', expectedVersion: 0, payload: { sessionId: 'exam-1' }, updatedAt: '2026-08-13T00:02:00.000Z' });
    const bootstrap = await store.bootstrap('learner-a');
    expect(bootstrap).toMatchObject({ profile, events: [event], attempts: [attempt], cursor: 1 });
    expect(bootstrap.states.map((state) => state.kind)).toEqual(['delayed-reviews', 'exam', 'mastery']);
    expect(bootstrap.states.find((state) => state.kind === 'mastery')?.payload).toMatchObject({ skills: { array: { observations: 1, evidenceEventIds: ['event-1'] } } });
    await pool.end();
  });

  it('keeps the complete authoritative event history for browser-side longitudinal recovery', async () => {
    const pool = memoryPool();
    const store = createPostgresLearningStore({ pool, schema: 'learning_longitudinal_bootstrap' });
    const mission: LearningEvent = {
      id: 'mission-old', learnerId: 'learner-a', kind: 'first-minute-mission-seen',
      data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-01T00:00:00.000Z',
    };
    const recent: LearningEvent[] = Array.from({ length: 520 }, (_, index) => ({
      id: `recent-${index}`, learnerId: 'learner-a', kind: 'hint-requested', problemId: 'od-a', attemptId: `attempt-${index}`,
      data: { hintLevel: 1 }, createdAt: new Date(Date.parse('2026-08-02T00:00:00Z') + index * 1_000).toISOString(),
    }));

    await store.appendEvents([mission, ...recent]);
    const bootstrap = await store.bootstrap('learner-a');

    expect(bootstrap.events).toHaveLength(521);
    expect(bootstrap.events[0]).toEqual(mission);
    expect(bootstrap.events.at(-1)?.id).toBe('recent-519');
    await pool.end();
  });

  it('transactionally claims anonymous learning data once and records reconciliation evidence', async () => {
    const pool = memoryPool();
    const store = createPostgresLearningStore({ pool, schema: 'learning_claim' });
    await store.putProfile({ ...profile, learnerId: 'anonymous-a' });
    await store.appendEvent({ ...event, learnerId: 'anonymous-a' });
    await store.putState({ learnerId: 'anonymous-a', kind: 'practice', expectedVersion: 0, payload: { current: 'od-1' }, updatedAt: profile.updatedAt });
    const first = await store.claimLearner('anonymous-a', 'user-1', 'claim-key-123', '2026-08-13T01:00:00.000Z');
    expect(first).toMatchObject({ sourceLearnerId: 'anonymous-a', targetLearnerId: 'user-1', moved: { profile: 1, events: 1, states: 3 } });
    expect(await store.claimLearner('anonymous-a', 'user-1', 'claim-key-123', '2026-08-13T01:00:00.000Z')).toEqual(first);
    expect((await store.bootstrap('user-1')).profile?.learnerId).toBe('user-1');
    expect((await store.bootstrap('anonymous-a')).events).toEqual([]);
    await pool.end();
  });
});

import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import { createPostgresMentorOSStore } from './postgres-store.js';

describe('PostgreSQL Mentor OS store', () => {
  it('persists immutable ordered runtime evidence across store instances', async () => {
    const memory = newDb({ noAstCoverageCheck: true });
    const adapter = memory.adapters.createPg();
    const pool = new adapter.Pool();
    const first = createPostgresMentorOSStore({ pool, schema: 'mentor_os_test' });
    const run = await first.start({
      learnerId: 'learner-1', goal: '独立掌握双指针', route: { kind: 'practice', ref: 'od-1' }, idempotencyKey: 'start-1',
    });
    const committed = await first.commit(run.id, {
      idempotencyKey: 'act-1', expectedSequence: 1, type: 'tool-completed', detail: '差分测试支持边界假设',
      evidenceRefs: ['attempt:a1', 'execution:test-1'],
      metadata: {
        tool: 'verify_hypothesis', argumentsHash: 'a'.repeat(64), resultHash: 'b'.repeat(64),
        provider: 'deepseek', model: 'deepseek-chat', inputTokens: 120, outputTokens: 30,
        latencyMs: 85, estimatedCostMicros: 42,
      },
    });
    expect(committed.event.metadata).toMatchObject({ tool: 'verify_hypothesis', estimatedCostMicros: 42 });

    const restored = await createPostgresMentorOSStore({ pool, schema: 'mentor_os_test' }).get(run.id);
    expect(restored).toMatchObject({ learnerId: 'learner-1', sequence: 2, status: 'active' });
    expect(restored?.events[1]).toMatchObject({ sequence: 2, type: 'tool-completed', evidenceRefs: ['attempt:a1', 'execution:test-1'] });
    expect(await first.claimOperation(run.id, 'attempt:a1')).toEqual({ status: 'claimed' });
    expect(await first.claimOperation(run.id, 'attempt:a1')).toEqual({ status: 'pending' });
    await first.completeOperation(run.id, 'attempt:a1', { answer: 42 });
    expect(await createPostgresMentorOSStore({ pool, schema: 'mentor_os_test' }).claimOperation(run.id, 'attempt:a1')).toEqual({ status: 'completed', value: { answer: 42 } });
    await pool.end();
  });

  it('is idempotent and rejects stale concurrent commands', async () => {
    const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); const pool = new adapter.Pool();
    const store = createPostgresMentorOSStore({ pool, schema: 'mentor_os_conflict' });
    const run = await store.start({ learnerId: 'learner-1', goal: 'goal', route: { kind: 'today', ref: 'today' }, idempotencyKey: 'start-1' });
    const first = await store.commit(run.id, { idempotencyKey: 'stop-1', expectedSequence: 1, type: 'stopped', detail: '等待学生预测', evidenceRefs: ['prompt:p1'], stopReason: 'awaiting-learner' });
    expect(await store.commit(run.id, { idempotencyKey: 'stop-1', expectedSequence: 1, type: 'stopped', detail: 'ignored replay', evidenceRefs: [] })).toEqual(first);
    await expect(store.commit(run.id, { idempotencyKey: 'stale', expectedSequence: 1, type: 'tool-started', detail: 'x', evidenceRefs: [] })).rejects.toThrow(/sequence/i);
    await pool.end();
  });
});

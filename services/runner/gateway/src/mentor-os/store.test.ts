import { describe, expect, it } from 'vitest';
import { createMentorOSStore } from './store.js';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Mentor OS event store', () => {
  it('commits ordered events and returns the same result for an idempotent retry', async () => {
    const store = createMentorOSStore();
    const run = await store.start({ learnerId: 'learner-1', goal: '掌握双指针', route: { kind: 'learn', ref: 'two-pointer' }, idempotencyKey: 'start-1' });
    const first = await store.commit(run.id, { idempotencyKey: 'cmd-1', expectedSequence: 1, type: 'context-compiled', detail: '3 items', evidenceRefs: ['context:c1'] });
    const retry = await store.commit(run.id, { idempotencyKey: 'cmd-1', expectedSequence: 1, type: 'context-compiled', detail: 'different ignored', evidenceRefs: [] });
    expect(retry).toEqual(first);
    expect((await store.get(run.id))?.events).toHaveLength(2);
  });

  it('rejects stale sequence writes and resumes events after a cursor', async () => {
    const store = createMentorOSStore();
    const run = await store.start({ learnerId: 'learner-1', goal: 'goal', route: { kind: 'today', ref: 'today' }, idempotencyKey: 'start-2' });
    await expect(store.commit(run.id, { idempotencyKey: 'bad', expectedSequence: 0, type: 'tool-started', detail: 'x', evidenceRefs: [] })).rejects.toThrow(/sequence/i);
    const committed = await store.commit(run.id, { idempotencyKey: 'ok', expectedSequence: 1, type: 'stopped', detail: '等待学生', evidenceRefs: [], stopReason: 'awaiting-learner' });
    expect((await store.eventsAfter(run.id, 1))[0].sequence).toBe(committed.event.sequence);
  });

  it('restores committed checkpoints from the file-local adapter', async () => {
    const filePath = join(mkdtempSync(join(tmpdir(), 'mentor-os-')), 'runs.json');
    const first = createMentorOSStore({ filePath });
    const run = await first.start({ learnerId: 'learner-1', goal: 'persist me', route: { kind: 'today', ref: 'today' }, idempotencyKey: 'persistent-start' });
    await first.commit(run.id, { idempotencyKey: 'pause', expectedSequence: 1, type: 'stopped', detail: '等待回答', evidenceRefs: [], stopReason: 'awaiting-learner' });
    const restored = await createMentorOSStore({ filePath }).get(run.id);
    expect(restored?.checkpoint).toMatchObject({ sequence: 2, stopReason: 'awaiting-learner' });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { PlatformApiError, type PlatformClient } from './platform-client';
import { createImmutableAcknowledgementLedger } from './platform-acknowledgements';
import { PlatformOutboxCapacityError, createPlatformOutbox, planLocalMigration } from './platform-outbox';

function storage(): Storage {
  const values = new Map<string, string>();
  return { length: 0, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: () => null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); } };
}

describe('platform outbox and local migration', () => {
  it('refuses operation 1,001 without evicting any older unsent operation', () => {
    const local = storage();
    const operations = Array.from({ length: 1_000 }, (_, index) => ({
      id: `op-${index}`, learnerId: 'user-1', kind: 'event' as const,
      payload: { id: `event-${index}` }, createdAt: '2026-08-15T00:00:00.000Z', attempts: 0,
    }));
    local.setItem('od-platform-outbox-v1', JSON.stringify({ version: 1, operations }));
    const outbox = createPlatformOutbox(local);

    expect(() => outbox.enqueue({
      id: 'op-1000', learnerId: 'user-1', kind: 'event', payload: { id: 'event-1000' }, createdAt: '2026-08-15T00:01:00.000Z',
    })).toThrow(PlatformOutboxCapacityError);
    expect(outbox.list()).toEqual(operations);
  });

  it('allows exact duplicates and mutable replacement without consuming a slot at capacity', () => {
    const local = storage();
    const operations = [
      { id: 'profile-old', learnerId: 'user-1', kind: 'profile' as const, payload: { dailyMinutes: 20 }, createdAt: '2026-08-15T00:00:00.000Z', attempts: 0 },
      ...Array.from({ length: 999 }, (_, index) => ({
        id: `op-${index}`, learnerId: 'user-1', kind: 'event' as const,
        payload: { id: `event-${index}` }, createdAt: '2026-08-15T00:00:00.000Z', attempts: 0,
      })),
    ];
    local.setItem('od-platform-outbox-v1', JSON.stringify({ version: 1, operations }));
    const outbox = createPlatformOutbox(local);

    expect(() => outbox.enqueue(operations[1])).not.toThrow();
    expect(() => outbox.enqueue({
      id: 'profile-new', learnerId: 'user-1', kind: 'profile', payload: { dailyMinutes: 45 }, createdAt: '2026-08-15T00:01:00.000Z',
    })).not.toThrow();
    expect(outbox.list()).toHaveLength(1_000);
    expect(outbox.list().slice(0, -1)).toEqual(operations.slice(1));
    expect(outbox.list().at(-1)).toEqual(expect.objectContaining({ id: 'profile-new', payload: { dailyMinutes: 45 } }));
  });

  it('reads and drains every valid operation from an oversized persisted queue', async () => {
    const local = storage(); const calls: string[] = [];
    const operations = Array.from({ length: 1_001 }, (_, index) => ({
      id: `op-${index}`, learnerId: 'user-1', kind: 'event' as const,
      payload: { id: `event-${index}` }, createdAt: '2026-08-15T00:00:00.000Z', attempts: 0,
    }));
    local.setItem('od-platform-outbox-v1', JSON.stringify({ version: 1, operations }));
    const outbox = createPlatformOutbox(local);
    const client = { appendEvent: vi.fn(async (_learnerId, payload) => { calls.push(String(payload.id)); return payload; }) } as unknown as PlatformClient;

    expect(outbox.list()).toHaveLength(1_001);
    await expect(outbox.flush(client)).resolves.toMatchObject({ sent: 1_001, remaining: 0 });
    expect(calls).toEqual(operations.map((operation) => String(operation.payload.id)));
  });

  it('flushes an already queued immutable operation even when an exact acknowledgement exists', async () => {
    const local = storage(); const event = { id: 'event-1', outcome: 'passed' };
    await createImmutableAcknowledgementLedger(local, { hashText: async () => 'a'.repeat(64) })
      .acknowledge({ learnerId: 'user-1', kind: 'event', payload: event }, new Date('2026-08-15T00:00:00Z'));
    const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'sync-event-1', learnerId: 'user-1', kind: 'event', payload: event, createdAt: '2026-08-15T00:00:00Z' });
    const client = { appendEvent: vi.fn(async (_learnerId, payload) => payload) } as unknown as PlatformClient;

    await expect(outbox.flush(client)).resolves.toMatchObject({ sent: 1, remaining: 0 });
    expect(client.appendEvent).toHaveBeenCalledTimes(1);
  });

  it('does not block an accepted outbox write when only acknowledgement persistence fails', async () => {
    const values = new Map<string, string>();
    const local = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === 'od-platform-immutable-acks-v1') throw new Error('ack-quota');
        values.set(key, value);
      },
    };
    const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'sync-event-1', learnerId: 'user-1', kind: 'event', payload: { id: 'event-1' }, createdAt: '2026-08-15T00:00:00Z' });
    const client = { appendEvent: vi.fn(async (_learnerId, payload) => payload) } as unknown as PlatformClient;

    await expect(outbox.flush(client)).resolves.toMatchObject({ sent: 1, remaining: 0 });
    expect(outbox.list()).toEqual([]);
  });

  it('durably queues, deduplicates and flushes writes in order', async () => {
    const local = storage(); const calls: string[] = [];
    const client = {
      appendEvent: vi.fn(async (_learnerId, event) => { calls.push(String(event.id)); return event; }),
      putState: vi.fn(async () => ({})), putProfile: vi.fn(async () => ({})), appendAttempt: vi.fn(async () => ({})),
    } as unknown as PlatformClient;
    const first = createPlatformOutbox(local);
    first.enqueue({ id: 'op-1', learnerId: 'user-1', kind: 'event', payload: { id: 'event-1' }, createdAt: '2026-08-13T00:00:00Z' });
    first.enqueue({ id: 'op-1', learnerId: 'user-1', kind: 'event', payload: { id: 'event-1' }, createdAt: '2026-08-13T00:00:00Z' });
    createPlatformOutbox(local).enqueue({ id: 'op-2', learnerId: 'user-1', kind: 'event', payload: { id: 'event-2' }, createdAt: '2026-08-13T00:01:00Z' });
    expect((await createPlatformOutbox(local).flush(client)).sent).toBe(2);
    expect(calls).toEqual(['event-1', 'event-2']); expect(first.list()).toEqual([]);
  });

  it('treats a regenerated migration timestamp as the same semantic operation', () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'migration:state:progress', learnerId: 'user-1', kind: 'state', stateKind: 'progress', expectedVersion: 0, payload: { version: 1 }, createdAt: '2026-08-13T00:00:00Z' });
    expect(() => outbox.enqueue({ id: 'migration:state:progress', learnerId: 'user-1', kind: 'state', stateKind: 'progress', expectedVersion: 0, payload: { version: 1 }, createdAt: '2026-08-13T01:00:00Z' })).not.toThrow();
    expect(outbox.list()).toHaveLength(1);
  });

  it('replaces an evolved mutable snapshot even when its deterministic id is reused', () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    outbox.enqueue({
      id: 'sync-profile-2026-08-13', learnerId: 'user-1', kind: 'profile',
      payload: { target: 'foundation', dailyMinutes: 30 }, createdAt: '2026-08-13T00:00:00Z',
    });
    outbox.enqueue({
      id: 'sync-profile-2026-08-13', learnerId: 'user-1', kind: 'profile',
      payload: { target: 'foundation', dailyMinutes: 45, preferredLanguage: 'python' }, createdAt: '2026-08-13T00:01:00Z',
    });

    expect(outbox.list()).toEqual([expect.objectContaining({
      id: 'sync-profile-2026-08-13', attempts: 0,
      payload: { target: 'foundation', dailyMinutes: 45, preferredLanguage: 'python' },
    })]);
  });

  it('keeps immutable evidence conflict-strict when an operation id is reused', () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    const original = { id: 'event-1', outcome: 'wrong-answer' };
    outbox.enqueue({ id: 'sync-event-1', learnerId: 'user-1', kind: 'event', payload: original, createdAt: '2026-08-13T00:00:00Z' });

    expect(() => outbox.enqueue({
      id: 'sync-event-1', learnerId: 'user-1', kind: 'event',
      payload: { id: 'event-1', outcome: 'passed' }, createdAt: '2026-08-13T00:01:00Z',
    })).toThrow('Outbox idempotency conflict');
    expect(outbox.list()).toEqual([expect.objectContaining({ payload: original })]);
  });

  it('canonicalizes only a redundant legacy owner without moving immutable evidence', () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    const evidence = { id: 'event-1', kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-13T00:00:00Z' };
    outbox.enqueue({ id: 'sync-event-1', learnerId: 'user-1', kind: 'event', payload: { learnerId: 'user-1', ...evidence }, createdAt: evidence.createdAt });
    outbox.enqueue({ id: 'sync-event-2', learnerId: 'user-1', kind: 'event', payload: { id: 'event-2' }, createdAt: '2026-08-13T00:01:00Z' });

    expect(() => outbox.enqueue({ id: 'sync-event-1', learnerId: 'user-1', kind: 'event', payload: evidence, createdAt: evidence.createdAt })).not.toThrow();
    expect(outbox.list().map((item) => item.id)).toEqual(['sync-event-1', 'sync-event-2']);
    expect(outbox.list()[0]).toEqual(expect.objectContaining({ payload: evidence, attempts: 0 }));
  });

  it('retains the first failed operation and reports retry evidence', async () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'op-1', learnerId: 'user-1', kind: 'state', stateKind: 'progress', expectedVersion: 0, payload: {}, createdAt: '2026-08-13T00:00:00Z' });
    const client = { putState: vi.fn(async () => { throw new Error('offline'); }) } as unknown as PlatformClient;
    expect(await outbox.flush(client)).toMatchObject({ sent: 0, remaining: 1, blockedBy: 'op-1' });
    expect(outbox.list()[0]).toMatchObject({ attempts: 1, lastError: 'offline' });
  });

  it('drops a stale mutable write on version conflict and reports the authoritative server state', async () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'stale-progress', learnerId: 'user-1', kind: 'state', stateKind: 'progress', expectedVersion: 1, payload: { version: 1, problems: { old: true } }, createdAt: '2026-08-13T00:00:00Z' });
    const authoritative = { learnerId: 'user-1', kind: 'progress', version: 2, payload: { version: 1, problems: { current: true } }, updatedAt: '2026-08-13T00:01:00Z' };
    const client = { putState: vi.fn(async () => { throw new PlatformApiError(409, 'version-conflict', { error: { code: 'version-conflict' }, state: authoritative }); }) } as unknown as PlatformClient;
    const result = await outbox.flush(client);
    expect(result).toMatchObject({ sent: 0, remaining: 0, conflicts: [{ operationId: 'stale-progress', state: authoritative }] });
    expect(outbox.list()).toEqual([]);
  });

  it('produces a dry-run reconciliation plan without mutating storage', async () => {
    const plan = await planLocalMigration({
      learnerId: 'anonymous-a', targetLearnerId: 'user-1',
      profile: { learnerId: 'anonymous-a', target: 'foundation', updatedAt: '2026-08-13T00:00:00Z' },
      events: [{ id: 'event-1', learnerId: 'anonymous-a', kind: 'lesson-started' }],
      progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
    }, async () => 'a'.repeat(64));
    expect(plan).toMatchObject({ sourceLearnerId: 'anonymous-a', targetLearnerId: 'user-1', counts: { profile: 1, events: 0, quarantinedEvents: 1, states: 2, attempts: 0 } });
    expect(plan.operations.every((operation) => operation.learnerId === 'user-1')).toBe(true);
  });

  it('migrates bounded lesson handoff feedback instead of quarantining it', async () => {
    const event = {
      id: 'handoff-feedback-helpful', learnerId: 'anonymous-a', kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' }, createdAt: '2026-08-14T10:00:00Z',
    };
    const plan = await planLocalMigration({
      learnerId: 'anonymous-a', targetLearnerId: 'user-1',
      profile: { learnerId: 'anonymous-a', target: 'foundation', updatedAt: '2026-08-13T00:00:00Z' },
      events: [event], progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
    }, async () => 'a'.repeat(64));

    expect(plan.counts).toMatchObject({ events: 1, quarantinedEvents: 0 });
    expect(plan.operations).toContainEqual(expect.objectContaining({ kind: 'event', payload: expect.objectContaining({ kind: 'lesson-handoff-feedback' }) }));
  });

  it('migrates current first-minute, training and bridge-diagnostic events', async () => {
    const events = [
      { id: 'mission-seen', learnerId: 'anonymous-a', kind: 'first-minute-mission-seen', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-14T10:00:00Z' },
      { id: 'training-start', learnerId: 'anonymous-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T10:01:00Z' },
      { id: 'diagnostic-start', learnerId: 'anonymous-a', kind: 'bridge-diagnostic-started', data: { curriculumVersion: '2.0.0' }, createdAt: '2026-08-14T10:02:00Z' },
      { id: 'diagnostic-step', learnerId: 'anonymous-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }, createdAt: '2026-08-14T10:03:00Z' },
    ];
    const plan = await planLocalMigration({
      learnerId: 'anonymous-a', targetLearnerId: 'user-1',
      profile: { learnerId: 'anonymous-a', target: 'foundation', updatedAt: '2026-08-13T00:00:00Z' },
      events, progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
    }, async () => 'a'.repeat(64));

    expect(plan.counts).toMatchObject({ events: 4, quarantinedEvents: 0 });
    expect(plan.operations.filter((operation) => operation.kind === 'event')).toHaveLength(4);
  });

  it('quarantines handoff feedback when its bounded choice is invalid', async () => {
    const plan = await planLocalMigration({
      learnerId: 'anonymous-a', targetLearnerId: 'user-1',
      profile: { learnerId: 'anonymous-a', target: 'foundation', updatedAt: '2026-08-13T00:00:00Z' },
      events: [{
        id: 'handoff-feedback-free-text', learnerId: 'anonymous-a', kind: 'lesson-handoff-feedback',
        data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'please-explain-more' }, createdAt: '2026-08-14T10:00:00Z',
      }],
      progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
    }, async () => 'a'.repeat(64));

    expect(plan.counts).toMatchObject({ events: 0, quarantinedEvents: 1 });
    expect(plan.operations.some((operation) => operation.kind === 'event')).toBe(false);
  });

  it('quarantines stale migration operations that no longer satisfy the server contract', () => {
    const local = storage(); const outbox = createPlatformOutbox(local);
    outbox.enqueue({ id: 'migration:anonymous-a:event:bad', learnerId: 'user-1', kind: 'event', payload: { id: 'bad' }, createdAt: '2026-08-13T00:00:00Z' });
    outbox.enqueue({ id: 'sync-event-current', learnerId: 'user-1', kind: 'event', payload: { id: 'current' }, createdAt: '2026-08-13T00:00:00Z' });
    outbox.reconcileMigration('anonymous-a', []);
    expect(outbox.list().map((item) => item.id)).toEqual(['sync-event-current']);
  });
});

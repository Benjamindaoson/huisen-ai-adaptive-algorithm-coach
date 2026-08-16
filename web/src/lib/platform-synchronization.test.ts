import { describe, expect, it, vi } from 'vitest';
import { emptyLearnerMemory, recordLearningSignal } from './learner-memory';
import { emptyPractice, type PracticeState } from './practice';
import { emptyProgress } from './progress';
import type { PlatformClient } from './platform-client';
import { acknowledgePlatformBootstrap } from './platform-acknowledgements';
import { createPlatformOutbox } from './platform-outbox';
import { createLatestOnlyRunner, createPlatformSyncOrchestrator, executePlatformSync, type PlatformSyncSnapshot } from './platform-synchronization';

function storage(): Storage {
  const values = new Map<string, string>();
  return { length: 0, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: () => null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); } };
}

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

describe('platform synchronization orchestration', () => {
  it('synchronizes a 1,001-event snapshot in lossless ordered batches', async () => {
    const local = storage();
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = {
      ...base,
      events: Array.from({ length: 1_001 }, (_, index) => ({
        id: `event-${index}`, learnerId: 'device-1', kind: 'lesson-started' as const,
        data: { lessonId: `lesson-${index}`, stage: 'explain' as const }, createdAt: new Date(Date.UTC(2026, 7, 15, 0, 0, index)).toISOString(),
      })),
    };
    const calls: string[] = [];
    const client = {
      putProfile: vi.fn(async () => ({})), putState: vi.fn(async () => ({ version: 1 })),
      appendEvent: vi.fn(async (_learnerId, payload) => { calls.push(String(payload.id)); return payload; }),
    } as unknown as PlatformClient;

    await expect(executePlatformSync(
      { learnerId: 'account-1', memory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {} },
      { storage: local, client, now: () => new Date('2026-08-15T02:00:00.000Z') },
    )).resolves.toMatchObject({ status: 'synced' });

    expect(calls).toEqual(memory.events.map((event) => event.id));
    expect(createPlatformOutbox(local).list()).toEqual([]);
  });

  it('keeps a failed full batch retryable and later sends every source event', async () => {
    const local = storage(); let online = false;
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = {
      ...base,
      events: Array.from({ length: 1_001 }, (_, index) => ({
        id: `event-${index}`, learnerId: 'device-1', kind: 'lesson-started' as const,
        data: { lessonId: `lesson-${index}`, stage: 'explain' as const }, createdAt: new Date(Date.UTC(2026, 7, 15, 0, 0, index)).toISOString(),
      })),
    };
    const accepted: string[] = [];
    const client = {
      putProfile: vi.fn(async () => { if (!online) throw new Error('offline'); return {}; }), putState: vi.fn(async () => ({ version: 1 })),
      appendEvent: vi.fn(async (_learnerId, payload) => { if (!online) throw new Error('offline'); accepted.push(String(payload.id)); return payload; }),
    } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = { learnerId: 'account-1', memory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {} };

    await expect(executePlatformSync(snapshot, { storage: local, client })).resolves.toMatchObject({
      status: 'pending', issue: { reasonLabel: '网络连接中断' },
    });
    expect(createPlatformOutbox(local).list()).toHaveLength(1_000);
    online = true;

    await expect(executePlatformSync(snapshot, { storage: local, client })).resolves.toMatchObject({ status: 'synced' });
    expect(accepted).toEqual(memory.events.map((event) => event.id));
    expect(createPlatformOutbox(local).list()).toEqual([]);
  });

  it('does not replay an unchanged hundred-event history after authoritative acceptance', async () => {
    const local = storage();
    let memory = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    for (let index = 0; index < 100; index += 1) {
      memory = recordLearningSignal(
        memory,
        { kind: 'lesson-started', data: { lessonId: `lesson-${index}`, stage: 'explain' } },
        new Date(Date.UTC(2026, 7, 15, 0, index)),
        `event-${index}`,
      );
    }
    const client = {
      putProfile: vi.fn(async () => ({})),
      appendEvent: vi.fn(async (_learnerId, event) => event),
      putState: vi.fn(async () => ({ version: 1 })),
    } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = {
      learnerId: 'account-1', memory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {},
    };

    await executePlatformSync(snapshot, { storage: local, client, now: () => new Date('2026-08-15T02:00:00.000Z') });
    expect(client.appendEvent).toHaveBeenCalledTimes(100);
    vi.mocked(client.appendEvent).mockClear();

    await executePlatformSync(snapshot, { storage: local, client, now: () => new Date('2026-08-15T02:01:00.000Z') });

    expect(client.appendEvent).not.toHaveBeenCalled();
  });

  it('sends only a newly appended event after prior history is acknowledged', async () => {
    const local = storage();
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const firstMemory = recordLearningSignal(base, { kind: 'lesson-started', data: { lessonId: 'lesson-1', stage: 'explain' } }, new Date('2026-08-15T00:01:00.000Z'), 'event-1');
    const client = { putProfile: vi.fn(async () => ({})), appendEvent: vi.fn(async (_learnerId, event) => event), putState: vi.fn(async () => ({ version: 1 })) } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = { learnerId: 'account-1', memory: firstMemory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {} };
    await executePlatformSync(snapshot, { storage: local, client, now: () => new Date('2026-08-15T00:02:00.000Z') });
    vi.mocked(client.appendEvent).mockClear();
    const nextMemory = recordLearningSignal(firstMemory, { kind: 'lesson-started', data: { lessonId: 'lesson-2', stage: 'explain' } }, new Date('2026-08-15T00:03:00.000Z'), 'event-2');

    await executePlatformSync({ ...snapshot, memory: nextMemory }, { storage: local, client, now: () => new Date('2026-08-15T00:04:00.000Z') });

    expect(client.appendEvent).toHaveBeenCalledTimes(1);
    expect(client.appendEvent).toHaveBeenCalledWith('account-1', expect.objectContaining({ id: 'event-2' }));
  });

  it('retries a failed immutable write instead of acknowledging it', async () => {
    const local = storage(); let online = false;
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = recordLearningSignal(base, { kind: 'lesson-started', data: { lessonId: 'lesson-1', stage: 'explain' } }, new Date('2026-08-15T00:01:00.000Z'), 'event-1');
    const client = {
      putProfile: vi.fn(async () => ({})),
      appendEvent: vi.fn(async (_learnerId, event) => { if (!online) throw new Error('offline'); return event; }),
      putState: vi.fn(async () => ({ version: 1 })),
    } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = { learnerId: 'account-1', memory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {} };
    await expect(executePlatformSync(snapshot, { storage: local, client })).resolves.toMatchObject({ status: 'pending' });
    online = true;

    await expect(executePlatformSync(snapshot, { storage: local, client })).resolves.toMatchObject({ status: 'synced' });

    expect(client.appendEvent).toHaveBeenCalledTimes(2);
  });

  it('does not hide changed immutable content behind a prior same-id acknowledgement', async () => {
    const local = storage();
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = recordLearningSignal(base, { kind: 'lesson-started', data: { lessonId: 'original', stage: 'explain' } }, new Date('2026-08-15T00:01:00.000Z'), 'event-1');
    const client = { putProfile: vi.fn(async () => ({})), appendEvent: vi.fn(async (_learnerId, event) => event), putState: vi.fn(async () => ({ version: 1 })) } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = { learnerId: 'account-1', memory, progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {} };
    await executePlatformSync(snapshot, { storage: local, client });
    vi.mocked(client.appendEvent).mockClear();
    const changed = { ...memory, events: memory.events.map((event) => ({ ...event, data: { ...event.data, lessonId: 'changed' } })) };

    await executePlatformSync({ ...snapshot, memory: changed }, { storage: local, client });

    expect(client.appendEvent).toHaveBeenCalledTimes(1);
  });

  it('does not replay authoritative bootstrap events or attempts in the next snapshot', async () => {
    const local = storage();
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = recordLearningSignal(base, { kind: 'lesson-started', data: { lessonId: 'lesson-1', stage: 'explain' } }, new Date('2026-08-15T00:01:00.000Z'), 'event-1');
    const practice: PracticeState = { ...emptyPractice(), attempts: [{ id: 'attempt-1', problemId: 'problem-1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(1)', outcome: 'passed', summary: 'ok', createdAt: '2026-08-15T00:02:00.000Z' }] };
    const serverEvent = { ...memory.events[0], learnerId: 'account-1' };
    const serverAttempt = { id: 'attempt-1', learnerId: 'account-1', problemId: 'problem-1', language: 'python', outcome: 'passed', assisted: false, sourceHash: 'a'.repeat(64), createdAt: '2026-08-15T00:02:00.000Z' };
    await acknowledgePlatformBootstrap(local, 'account-1', { events: [serverEvent], attempts: [serverAttempt] });
    const client = {
      putProfile: vi.fn(async () => ({})), appendEvent: vi.fn(async (_learnerId, event) => event),
      appendAttempt: vi.fn(async (_learnerId, attempt) => attempt), putState: vi.fn(async () => ({ version: 1 })),
    } as unknown as PlatformClient;

    await executePlatformSync(
      { learnerId: 'account-1', memory, progress: emptyProgress(), practice, exam: null, expectedStateVersions: {} },
      { storage: local, client, hashSource: async () => 'a'.repeat(64) },
    );

    expect(client.appendEvent).not.toHaveBeenCalled();
    expect(client.appendAttempt).not.toHaveBeenCalled();
  });

  it('runs one execution at a time and coalesces overlapping inputs to the latest', async () => {
    const gate = deferred(); const started: number[] = []; let active = 0; let maxActive = 0;
    const runner = createLatestOnlyRunner(async (value: number) => {
      started.push(value); active += 1; maxActive = Math.max(maxActive, active);
      if (value === 1) await gate.promise;
      active -= 1; return value;
    });

    const first = runner.run(1);
    const second = runner.run(2);
    const third = runner.run(3);
    expect(first).toBe(second); expect(second).toBe(third);
    expect(started).toEqual([1]);
    gate.release();

    await expect(first).resolves.toBe(3);
    expect(started).toEqual([1, 3]);
    expect(maxActive).toBe(1);
  });

  it('executes one durable profile, event, state, and attempt snapshot and returns versions', async () => {
    const local = storage();
    const base = emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z'));
    const memory = recordLearningSignal(base, { kind: 'lesson-started', data: { lessonId: 'lesson-1', stage: 'explain' } }, new Date('2026-08-15T00:01:00.000Z'), 'event-1');
    const practice: PracticeState = { ...emptyPractice(), attempts: [{ id: 'attempt-1', problemId: 'problem-1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(1)', outcome: 'passed', summary: 'ok', createdAt: '2026-08-15T00:02:00.000Z' }] };
    const calls: string[] = [];
    const client = {
      putProfile: vi.fn(async () => { calls.push('profile'); return {}; }),
      appendEvent: vi.fn(async (_learnerId, event) => { calls.push(`event:${String(event.id)}`); return event; }),
      putState: vi.fn(async (_learnerId, kind) => { calls.push(`state:${kind}`); return { version: 1 }; }),
      appendAttempt: vi.fn(async (_learnerId, attempt) => { calls.push(`attempt:${String(attempt.id)}`); return attempt; }),
    } as unknown as PlatformClient;
    const snapshot: PlatformSyncSnapshot = { learnerId: 'account-1', memory, progress: emptyProgress(), practice, exam: null, expectedStateVersions: {} };

    const result = await executePlatformSync(snapshot, { storage: local, client, hashSource: async () => 'a'.repeat(64), now: () => new Date('2026-08-15T00:03:00.000Z') });

    expect(result).toMatchObject({ status: 'synced', stateVersions: { progress: 1, practice: 1 }, conflicts: [] });
    expect(calls).toEqual(['profile', 'event:event-1', 'state:progress', 'state:practice', 'attempt:attempt-1']);
    expect(local.getItem('od-platform-outbox-v1')).toContain('"operations":[]');
  });

  it('carries state versions from the active execution into the trailing latest snapshot', async () => {
    const gate = deferred(); let profileCalls = 0;
    const expectedVersions: Record<string, number[]> = { progress: [], practice: [] };
    const client = {
      putProfile: vi.fn(async () => { profileCalls += 1; if (profileCalls === 1) await gate.promise; return {}; }),
      putState: vi.fn(async (_learnerId, kind: 'progress' | 'practice', state: { expectedVersion: number }) => {
        expectedVersions[kind].push(state.expectedVersion);
        return { version: state.expectedVersion + 1 };
      }),
    } as unknown as PlatformClient;
    const orchestrator = createPlatformSyncOrchestrator({ storage: storage(), client, now: () => new Date('2026-08-15T00:03:00.000Z') });
    const snapshot: PlatformSyncSnapshot = {
      learnerId: 'account-1', memory: emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z')),
      progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {},
    };

    const first = orchestrator.run(snapshot);
    await Promise.resolve();
    const trailing = orchestrator.run({ ...snapshot, progress: { version: 1, problems: { newest: { status: 'in-progress', starred: false, note: '', updatedAt: '2026-08-15T00:02:00.000Z' } } } });
    gate.release();
    await expect(first).resolves.toMatchObject({ status: 'synced', stateVersions: { progress: 2, practice: 2 } });
    await expect(trailing).resolves.toMatchObject({ status: 'synced' });
    expect(expectedVersions).toEqual({ progress: [0, 1], practice: [0, 1] });
  });

  it('returns a bounded pending issue instead of throwing a one-pass transport failure', async () => {
    const snapshot: PlatformSyncSnapshot = {
      learnerId: 'account-1', memory: emptyLearnerMemory('device-1', new Date('2026-08-15T00:00:00.000Z')),
      progress: emptyProgress(), practice: emptyPractice(), exam: null, expectedStateVersions: {},
    };
    const client = { putProfile: vi.fn(async () => { throw new TypeError('Failed to fetch private.internal'); }) } as unknown as PlatformClient;

    const result = await executePlatformSync(snapshot, { storage: storage(), client, hashSource: async () => 'a'.repeat(64), now: () => new Date('2026-08-15T00:03:00.000Z') });

    expect(result).toMatchObject({ status: 'pending', issue: { pendingCount: 3, categoryLabel: '账户设置', reasonLabel: '网络连接中断' } });
    expect(JSON.stringify(result)).not.toMatch(/private|Failed to fetch/i);
  });
});

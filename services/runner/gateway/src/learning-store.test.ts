import { describe, expect, it } from 'vitest';
import { createLearningStore } from './learning-store.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('learning store', () => {
  it('appends events idempotently per learner', async () => {
    const store = createLearningStore();
    const event = { id: 'event-a', learnerId: 'learner-a', kind: 'hint-received' as const, problemId: 'od-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00Z' };
    await store.appendEvent(event);
    await store.appendEvent(event);
    expect(await store.listEvents('learner-a')).toEqual([event]);
  });

  it('persists profiles and events through the file adapter', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'od-learning-store-'));
    try {
      const filePath = join(directory, 'learning.json');
      const first = createLearningStore({ filePath });
      await first.putProfile({ learnerId: 'learner-a', target: 'foundation', examDate: null, dailyMinutes: 30, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z' });
      await first.appendEvent({ id: 'event-a', learnerId: 'learner-a', kind: 'goal-updated', data: { target: 'foundation' }, createdAt: '2026-08-11T00:00:00Z' });
      const second = createLearningStore({ filePath });
      expect(await second.getProfile('learner-a')).toMatchObject({ target: 'foundation' });
      expect(await second.listEvents('learner-a')).toHaveLength(1);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('keeps the newest profile and durable event idempotency after history truncation', async () => {
    const store = createLearningStore();
    const newer = { learnerId: 'learner-a', target: 'foundation' as const, examDate: null, dailyMinutes: 60, preferredLanguage: 'python' as const, updatedAt: '2026-08-11T02:00:00Z' };
    await store.putProfile(newer);
    await store.putProfile({ ...newer, dailyMinutes: 30, updatedAt: '2026-08-11T01:00:00Z' });
    expect(await store.getProfile('learner-a')).toMatchObject({ dailyMinutes: 60 });

    const events = Array.from({ length: 501 }, (_, index) => ({
      id: `event-${index}`, learnerId: 'learner-a', kind: 'hint-requested' as const, problemId: 'od-a', attemptId: `attempt-${index}`,
      data: { hintLevel: 1 }, createdAt: new Date(Date.parse('2026-08-01T00:00:00Z') + index).toISOString(),
    }));
    await store.appendEvents(events.slice(0, 100));
    for (let index = 100; index < events.length; index += 100) await store.appendEvents(events.slice(index, index + 100));
    expect((await store.appendEvent(events[0])).created).toBe(false);
    await expect(store.appendEvent({ ...events[0], problemId: 'od-tampered' })).rejects.toThrow('Invalid learning event replay');
    expect(await store.listEvents('learner-a')).toHaveLength(500);
  });

  it('retains an old activation milestone while bounding a long memory history', async () => {
    const store = createLearningStore();
    const mission = {
      id: 'mission-old', learnerId: 'learner-a', kind: 'first-minute-mission-seen' as const,
      data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-01T00:00:00.000Z',
    };
    const recent = Array.from({ length: 520 }, (_, index) => ({
      id: `recent-${index}`, learnerId: 'learner-a', kind: 'hint-requested' as const, problemId: 'od-a', attemptId: `attempt-${index}`,
      data: { hintLevel: 1 }, createdAt: new Date(Date.parse('2026-08-02T00:00:00Z') + index * 1_000).toISOString(),
    }));

    await store.appendEvent(mission);
    await store.appendEvents(recent);
    const retained = await store.listEvents('learner-a');

    expect(retained).toHaveLength(500);
    expect(retained.some((event) => event.id === mission.id)).toBe(true);
  });

  it('recovers an evicted milestone from durable file replay receipts without inventing evidence', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'od-learning-store-recovery-'));
    try {
      const filePath = join(directory, 'learning.json');
      const mission = {
        id: 'mission-old', learnerId: 'learner-a', kind: 'first-minute-mission-seen' as const,
        data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-01T00:00:00.000Z',
      };
      const recent = Array.from({ length: 520 }, (_, index) => ({
        id: `recent-${index}`, learnerId: 'learner-a', kind: 'hint-requested' as const, problemId: 'od-a', attemptId: `attempt-${index}`,
        data: { hintLevel: 1 }, createdAt: new Date(Date.parse('2026-08-02T00:00:00Z') + index * 1_000).toISOString(),
      }));
      const allEvents = [mission, ...recent];
      await writeFile(filePath, JSON.stringify({
        version: 1,
        learners: {
          'learner-a': {
            events: recent.slice(-500),
            eventIds: allEvents.map((event) => event.id),
            eventReceipts: Object.fromEntries(allEvents.map((event) => [event.id, event])),
          },
        },
      }));

      const recovered = await createLearningStore({ filePath }).listEvents('learner-a');
      expect(recovered).toHaveLength(500);
      expect(recovered.some((event) => event.id === mission.id)).toBe(true);

      await writeFile(filePath, JSON.stringify({
        version: 1,
        learners: {
          'learner-a': {
            events: recent.slice(-500),
            eventIds: recent.map((event) => event.id),
            eventReceipts: Object.fromEntries(recent.map((event) => [event.id, event])),
          },
        },
      }));
      const honestlyAbsent = await createLearningStore({ filePath }).listEvents('learner-a');
      expect(honestlyAbsent.some((event) => event.kind === 'first-minute-mission-seen')).toBe(false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});

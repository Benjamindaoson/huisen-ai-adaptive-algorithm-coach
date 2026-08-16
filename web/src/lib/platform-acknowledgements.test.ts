import { describe, expect, it } from 'vitest';
import {
  PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY,
  acknowledgePlatformBootstrap,
  createImmutableAcknowledgementLedger,
} from './platform-acknowledgements';

function storage(): Storage {
  const values = new Map<string, string>();
  return { length: 0, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: () => null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); } };
}

const hashText = async (value: string) => value.includes('changed') ? 'b'.repeat(64) : 'a'.repeat(64);

describe('immutable platform acknowledgement ledger', () => {
  it('matches learner, immutable kind, payload id, and canonical fingerprint exactly', async () => {
    const local = storage(); const ledger = createImmutableAcknowledgementLedger(local, { hashText });
    const original = { id: 'shared-id', outcome: 'original' };
    expect(await ledger.acknowledge({ learnerId: 'learner-a', kind: 'event', payload: original }, new Date('2026-08-15T00:00:00Z'))).toBe(true);

    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: original })).resolves.toBe(true);
    await expect(ledger.has({ learnerId: 'learner-b', kind: 'event', payload: original })).resolves.toBe(false);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'attempt', payload: original })).resolves.toBe(false);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: { ...original, outcome: 'changed' } })).resolves.toBe(false);
  });

  it('treats corrupt or unknown stored data as an empty optimization ledger', async () => {
    const local = storage();
    local.setItem(PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY, '{bad');
    await expect(createImmutableAcknowledgementLedger(local, { hashText }).has({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-1' } })).resolves.toBe(false);
    local.setItem(PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY, JSON.stringify({ version: 99, entries: [{ learnerId: 'learner-a' }] }));
    await expect(createImmutableAcknowledgementLedger(local, { hashText }).has({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-1' } })).resolves.toBe(false);
  });

  it('keeps acknowledgement persistence best-effort when browser storage is unavailable', async () => {
    const unavailable = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const ledger = createImmutableAcknowledgementLedger(unavailable, { hashText });
    await expect(ledger.acknowledge({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-1' } }, new Date('2026-08-15T00:00:00Z'))).resolves.toBe(false);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-1' } })).resolves.toBe(false);
  });

  it('retains only the ten thousand most recent valid acknowledgements', async () => {
    const local = storage(); const ledger = createImmutableAcknowledgementLedger(local, { hashText });
    await ledger.acknowledgeMany(Array.from({ length: 10_001 }, (_, index) => ({
      learnerId: 'learner-a', kind: 'event' as const, payload: { id: `event-${index}` },
    })), new Date('2026-08-15T00:00:00Z'));

    const persisted = JSON.parse(local.getItem(PLATFORM_ACKNOWLEDGEMENT_STORAGE_KEY) ?? '{}') as { entries?: unknown[] };
    expect(persisted.entries).toHaveLength(10_000);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-0' } })).resolves.toBe(false);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: { id: 'event-10000' } })).resolves.toBe(true);
  });

  it('seeds exact event and attempt acknowledgements from authoritative bootstrap', async () => {
    const local = storage();
    const event = { id: 'event-1', kind: 'lesson-started', data: { lessonId: 'arrays', stage: 'explain' }, createdAt: '2026-08-15T00:00:00Z' };
    const attempt = { id: 'attempt-1', problemId: 'problem-1', language: 'python', outcome: 'passed', assisted: false, sourceHash: 'c'.repeat(64), createdAt: '2026-08-15T00:01:00Z' };
    await acknowledgePlatformBootstrap(local, 'learner-a', { events: [event], attempts: [attempt] }, { hashText, now: () => new Date('2026-08-15T00:02:00Z') });
    const ledger = createImmutableAcknowledgementLedger(local, { hashText });

    await expect(ledger.has({ learnerId: 'learner-a', kind: 'event', payload: event })).resolves.toBe(true);
    await expect(ledger.has({ learnerId: 'learner-a', kind: 'attempt', payload: attempt })).resolves.toBe(true);
  });
});

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import type { LearnerProfile, LearningEvent } from './learning-validation.js';
import { retainLearningEvents } from './learning-retention.js';

const MAX_EVENT_IDS = 5_000;

type LearnerRecord = { profile?: LearnerProfile; events: LearningEvent[]; eventIds: string[]; eventReceipts: Record<string, LearningEvent> };
type StoreFile = { version: 1; learners: Record<string, LearnerRecord> };

export type LearningStore = {
  readonly mode: LearningStoreMode;
  getProfile(learnerId: string): Promise<LearnerProfile | undefined>;
  putProfile(profile: LearnerProfile): Promise<LearnerProfile>;
  listEvents(learnerId: string): Promise<LearningEvent[]>;
  appendEvent(event: LearningEvent): Promise<{ event: LearningEvent; created: boolean }>;
  appendEvents(events: LearningEvent[]): Promise<{ accepted: number; created: number }>;
};

export type LearningStoreMode = 'memory' | 'file-local' | 'postgres';

function emptyState(): StoreFile {
  return { version: 1, learners: Object.create(null) as Record<string, LearnerRecord> };
}

function safeState(value: unknown): StoreFile {
  const result = emptyState();
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return result;
  const rawLearners = (value as { learners?: unknown }).learners;
  if (!rawLearners || typeof rawLearners !== 'object' || Array.isArray(rawLearners)) return result;
  for (const [learnerId, raw] of Object.entries(rawLearners)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const candidate = raw as Partial<LearnerRecord>;
    const rawReceipts = candidate.eventReceipts && typeof candidate.eventReceipts === 'object' && !Array.isArray(candidate.eventReceipts)
      ? candidate.eventReceipts : {};
    const eventReceipts = Object.create(null) as Record<string, LearningEvent>;
    for (const [id, event] of Object.entries(rawReceipts).slice(-MAX_EVENT_IDS)) eventReceipts[id] = event;
    const events = retainLearningEvents([...(Array.isArray(candidate.events) ? candidate.events : []), ...Object.values(eventReceipts)]);
    const eventIds = Array.isArray(candidate.eventIds)
      ? candidate.eventIds.filter((id): id is string => typeof id === 'string').slice(-MAX_EVENT_IDS)
      : Object.keys(eventReceipts).slice(-MAX_EVENT_IDS);
    for (const event of events) if (!eventReceipts[event.id]) eventReceipts[event.id] = event;
    result.learners[learnerId] = { ...(candidate.profile ? { profile: candidate.profile } : {}), events, eventIds, eventReceipts };
  }
  return result;
}

export function createLearningStore(options: { filePath?: string } = {}): LearningStore {
  let state = emptyState();
  let loadPromise: Promise<void> | undefined;
  let transactionQueue: Promise<unknown> = Promise.resolve();

  function ensureLoaded(): Promise<void> {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (!options.filePath) return;
      try { state = safeState(JSON.parse(await readFile(options.filePath, 'utf8'))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    })();
    return loadPromise;
  }

  function ownRecord(learnerId: string): LearnerRecord | undefined {
    return Object.prototype.hasOwnProperty.call(state.learners, learnerId) ? state.learners[learnerId] : undefined;
  }

  function recordFor(learnerId: string): LearnerRecord {
    const existing = ownRecord(learnerId);
    if (existing) return existing;
    const created: LearnerRecord = { events: [], eventIds: [], eventReceipts: Object.create(null) as Record<string, LearningEvent> };
    state.learners[learnerId] = created;
    return created;
  }

  async function persist() {
    if (!options.filePath) return;
    const filePath = options.filePath;
    await mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    try { await rename(temporary, filePath); }
    catch (error) {
      if (!['EEXIST', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await rm(filePath, { force: true });
      await rename(temporary, filePath);
    }
  }

  function mutate<T>(operation: () => Promise<T> | T): Promise<T> {
    const run = transactionQueue.catch(() => undefined).then(async () => {
      await ensureLoaded();
      const result = await operation();
      await persist();
      return result;
    });
    transactionQueue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function read<T>(operation: () => T): Promise<T> {
    await ensureLoaded();
    await transactionQueue.catch(() => undefined);
    return operation();
  }

  function addEvents(learner: LearnerRecord, events: LearningEvent[]): LearningEvent[] {
    const additions: LearningEvent[] = [];
    for (const event of events) {
      const receipt = learner.eventReceipts[event.id];
      if (receipt) {
        if (JSON.stringify(receipt) !== JSON.stringify(event)) throw new Error('Invalid learning event replay');
        continue;
      }
      if (learner.eventIds.includes(event.id)) throw new Error('Invalid learning event replay without receipt');
      if (additions.some((candidate) => candidate.id === event.id)) {
        const first = additions.find((candidate) => candidate.id === event.id)!;
        if (JSON.stringify(first) !== JSON.stringify(event)) throw new Error('Invalid learning event replay');
        continue;
      }
      additions.push(event);
    }
    if (additions.length) {
      learner.events = retainLearningEvents([...learner.events, ...additions]);
      learner.eventIds = [...learner.eventIds, ...additions.map((event) => event.id)].slice(-MAX_EVENT_IDS);
      for (const event of additions) learner.eventReceipts[event.id] = event;
      const receiptEntries = Object.entries(learner.eventReceipts);
      if (receiptEntries.length > MAX_EVENT_IDS) {
        const retained = Object.create(null) as Record<string, LearningEvent>;
        for (const [id, event] of receiptEntries.slice(-MAX_EVENT_IDS)) retained[id] = event;
        learner.eventReceipts = retained;
      }
    }
    return additions;
  }

  return {
    mode: options.filePath ? 'file-local' : 'memory',
    getProfile: (learnerId) => read(() => ownRecord(learnerId)?.profile),
    putProfile: (profile) => mutate(() => {
      const learner = recordFor(profile.learnerId);
      if (!learner.profile || Date.parse(profile.updatedAt) >= Date.parse(learner.profile.updatedAt)) learner.profile = profile;
      return learner.profile;
    }),
    listEvents: (learnerId) => read(() => [...(ownRecord(learnerId)?.events ?? [])]),
    appendEvent: (event) => mutate(() => {
      const learner = recordFor(event.learnerId);
      const existing = learner.eventReceipts[event.id];
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(event)) throw new Error('Invalid learning event replay');
        return { event: existing, created: false };
      }
      if (learner.eventIds.includes(event.id)) throw new Error('Invalid learning event replay without receipt');
      addEvents(learner, [event]);
      return { event, created: true };
    }),
    appendEvents: (events) => mutate(() => {
      if (!events.length) return { accepted: 0, created: 0 };
      const learnerId = events[0].learnerId;
      if (events.some((event) => event.learnerId !== learnerId)) throw new Error('Invalid learner event owner');
      const additions = addEvents(recordFor(learnerId), events);
      return { accepted: events.length, created: additions.length };
    }),
  };
}

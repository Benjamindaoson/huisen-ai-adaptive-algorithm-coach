import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LearningEvent } from '../learning-validation.js';
import type { MentorSession } from './mentor-engine.js';
import { createLearnerTwin, projectLearnerTwin, type LearnerTwin, type TwinObservation } from './learner-twin.js';

const MAX_SESSIONS = 200;
const MAX_TIMELINE = 200;

type MentorStoreFile = {
  version: 1;
  sessions: Record<string, MentorSession>;
  sessionIds: string[];
  twins: Record<string, LearnerTwin>;
};

export type MentorStore = {
  readonly mode: 'file-local' | 'postgres';
  getSession(id: string, learnerId: string): Promise<MentorSession | undefined>;
  putSession(session: MentorSession): Promise<MentorSession>;
  getTwin(learnerId: string): Promise<LearnerTwin | undefined>;
  putTwin(twin: LearnerTwin): Promise<LearnerTwin>;
  migrateLearningEvents(learnerId: string, events: LearningEvent[], now?: Date): Promise<LearnerTwin>;
};

function emptyState(): MentorStoreFile {
  return { version: 1, sessions: Object.create(null) as Record<string, MentorSession>, sessionIds: [], twins: Object.create(null) as Record<string, LearnerTwin> };
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
}

function safeState(value: unknown): MentorStoreFile {
  const state = emptyState();
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 1) return state;
  const raw = value as Partial<MentorStoreFile>;
  if (raw.sessions && typeof raw.sessions === 'object' && !Array.isArray(raw.sessions)) {
    for (const [id, candidate] of Object.entries(raw.sessions)) {
      if (!validId(id) || !candidate || candidate.version !== 1 || candidate.id !== id || !validId(candidate.learnerId)) continue;
      state.sessions[id] = { ...candidate, timeline: Array.isArray(candidate.timeline) ? candidate.timeline.slice(-MAX_TIMELINE) : [] };
    }
  }
  const ids = Array.isArray(raw.sessionIds) ? raw.sessionIds.filter((id): id is string => validId(id) && Boolean(state.sessions[id])) : Object.keys(state.sessions);
  state.sessionIds = [...new Set(ids)].slice(-MAX_SESSIONS);
  for (const id of Object.keys(state.sessions)) if (!state.sessionIds.includes(id)) delete state.sessions[id];
  if (raw.twins && typeof raw.twins === 'object' && !Array.isArray(raw.twins)) {
    for (const [learnerId, twin] of Object.entries(raw.twins)) {
      if (validId(learnerId) && twin?.version === 1 && twin.learnerId === learnerId) state.twins[learnerId] = twin;
    }
  }
  return state;
}

export function twinObservationsFromLearningEvents(events: LearningEvent[]): TwinObservation[] {
  const observations: TwinObservation[] = [];
  for (const event of events) {
    const skillIds = Array.isArray(event.data.skillIds) ? event.data.skillIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())).slice(0, 8) : [];
    if (!skillIds.length) continue;
    let kind: TwinObservation['kind'] | undefined;
    if (event.kind === 'attempt-recorded') {
      kind = event.data.outcome === 'passed' ? (event.data.assisted ? 'assisted-pass' : 'independent-pass') : 'failure';
    } else if (event.kind === 'mastery-check-passed') kind = 'transfer-pass';
    else if (event.kind === 'mastery-check-failed') kind = 'failure';
    if (kind) observations.push({ kind, skillIds, evidenceRef: `learning-event:${event.id}`, at: event.createdAt });
  }
  return observations;
}

export function createMentorStore(options: { filePath?: string } = {}): MentorStore {
  let state = emptyState();
  let loaded: Promise<void> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function ensureLoaded(): Promise<void> {
    if (!loaded) loaded = (async () => {
      if (!options.filePath) return;
      try { state = safeState(JSON.parse(await readFile(options.filePath, 'utf8'))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    })();
    return loaded;
  }

  async function persist(): Promise<void> {
    if (!options.filePath) return;
    await mkdir(dirname(options.filePath), { recursive: true });
    const temporary = `${options.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    try { await rename(temporary, options.filePath); }
    catch (error) {
      if (!['EEXIST', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await rm(options.filePath, { force: true });
      await rename(temporary, options.filePath);
    }
  }

  function mutate<T>(operation: () => T): Promise<T> {
    const run = queue.catch(() => undefined).then(async () => { await ensureLoaded(); const result = operation(); await persist(); return result; });
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function read<T>(operation: () => T): Promise<T> {
    await ensureLoaded();
    await queue.catch(() => undefined);
    return operation();
  }

  return {
    mode: 'file-local',
    getSession: (id, learnerId) => read(() => {
      const session = validId(id) && state.sessions[id]?.learnerId === learnerId ? state.sessions[id] : undefined;
      return session ? structuredClone(session) : undefined;
    }),
    putSession: (session) => mutate(() => {
      if (!validId(session.id) || !validId(session.learnerId) || session.version !== 1) throw new Error('Invalid Mentor session');
      const stored = structuredClone({ ...session, timeline: session.timeline.slice(-MAX_TIMELINE) });
      state.sessions[stored.id] = stored;
      state.sessionIds = [...state.sessionIds.filter((id) => id !== stored.id), stored.id].slice(-MAX_SESSIONS);
      for (const id of Object.keys(state.sessions)) if (!state.sessionIds.includes(id)) delete state.sessions[id];
      state.twins[stored.learnerId] = structuredClone(stored.twin);
      return structuredClone(stored);
    }),
    getTwin: (learnerId) => read(() => state.twins[learnerId] ? structuredClone(state.twins[learnerId]) : undefined),
    putTwin: (twin) => mutate(() => {
      if (!validId(twin.learnerId) || twin.version !== 1) throw new Error('Invalid learner twin');
      state.twins[twin.learnerId] = structuredClone(twin);
      return structuredClone(twin);
    }),
    migrateLearningEvents: (learnerId, events, now = new Date()) => mutate(() => {
      const current = state.twins[learnerId] ?? createLearnerTwin(learnerId, now);
      const twin = projectLearnerTwin(current, twinObservationsFromLearningEvents(events), now);
      state.twins[learnerId] = twin;
      return structuredClone(twin);
    }),
  };
}

import type { ProblemLanguage } from './catalog';

export const LEARNER_MEMORY_STORAGE_KEY = 'od-learner-memory-v1';
export const MAX_LEARNING_EVENTS = 500;

export const LEARNING_EVENT_KINDS = [
  'goal-updated', 'attempt-recorded', 'hint-requested', 'hint-received',
  'reference-unlocked', 'mastery-check-started', 'mastery-check-passed', 'mastery-check-failed',
  'lesson-started', 'lesson-checkpoint-passed', 'lesson-completed', 'lesson-transfer-started',
] as const;

export type LearningEventKind = (typeof LEARNING_EVENT_KINDS)[number];
export type LearningTarget = 'od-exam' | 'interview' | 'foundation';

export type LearnerProfile = {
  learnerId: string;
  target: LearningTarget;
  examDate: string | null;
  dailyMinutes: number;
  preferredLanguage: ProblemLanguage;
  updatedAt: string;
};

export type LearningEventData = {
  hintLevel?: number;
  outcome?: string;
  assisted?: boolean;
  skillIds?: string[];
  reason?: string;
  target?: LearningTarget;
  examDate?: string;
  dailyMinutes?: number;
  preferredLanguage?: ProblemLanguage;
  lessonId?: string;
  stage?: 'explain' | 'observe' | 'predict' | 'complete' | 'transfer';
  correct?: boolean;
};

export type LearningEvent = {
  id: string;
  learnerId: string;
  kind: LearningEventKind;
  problemId?: string;
  attemptId?: string;
  data: LearningEventData;
  createdAt: string;
};

export type LearnerMemory = { version: 1; profile: LearnerProfile; events: LearningEvent[] };
export type LearningSignal = Pick<LearningEvent, 'kind' | 'data'> & Partial<Pick<LearningEvent, 'problemId' | 'attemptId'>>;

const TARGETS: LearningTarget[] = ['od-exam', 'interview', 'foundation'];
const LANGUAGES: ProblemLanguage[] = ['java', 'python', 'javascript', 'cpp'];
const DATA_KEYS = ['hintLevel', 'outcome', 'assisted', 'skillIds', 'reason', 'target', 'examDate', 'dailyMinutes', 'preferredLanguage', 'lessonId', 'stage', 'correct'];
const LESSON_STAGES = ['explain', 'observe', 'predict', 'complete', 'transfer'];

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function parseProfile(value: unknown): LearnerProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid learner profile');
  const profile = value as Partial<LearnerProfile>;
  if (!validId(profile.learnerId) || !TARGETS.includes(profile.target as LearningTarget) ||
    (profile.examDate !== null && !validDate(profile.examDate)) || !Number.isInteger(profile.dailyMinutes) ||
    (profile.dailyMinutes as number) < 10 || (profile.dailyMinutes as number) > 480 ||
    !LANGUAGES.includes(profile.preferredLanguage as ProblemLanguage) || !isTimestamp(profile.updatedAt)) {
    throw new Error('Invalid learner profile');
  }
  return profile as LearnerProfile;
}

function parseEventData(value: unknown): LearningEventData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid learning event data');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !DATA_KEYS.includes(key))) throw new Error('Invalid learning event data');
  if (data.hintLevel !== undefined && (![1, 2, 3, 4].includes(data.hintLevel as number))) throw new Error('Invalid learning event data');
  if (data.outcome !== undefined && (typeof data.outcome !== 'string' || data.outcome.length > 100)) throw new Error('Invalid learning event data');
  if (data.assisted !== undefined && typeof data.assisted !== 'boolean') throw new Error('Invalid learning event data');
  if (data.skillIds !== undefined && (!Array.isArray(data.skillIds) || data.skillIds.length > 8 || data.skillIds.some((id) => typeof id !== 'string' || id.length > 100))) throw new Error('Invalid learning event data');
  if (data.reason !== undefined && (typeof data.reason !== 'string' || data.reason.length > 500)) throw new Error('Invalid learning event data');
  if (data.target !== undefined && !TARGETS.includes(data.target as LearningTarget)) throw new Error('Invalid learning event data');
  if (data.examDate !== undefined && data.examDate !== '' && !validDate(data.examDate)) throw new Error('Invalid learning event data');
  if (data.dailyMinutes !== undefined && (!Number.isInteger(data.dailyMinutes) || (data.dailyMinutes as number) < 10 || (data.dailyMinutes as number) > 480)) throw new Error('Invalid learning event data');
  if (data.preferredLanguage !== undefined && !LANGUAGES.includes(data.preferredLanguage as ProblemLanguage)) throw new Error('Invalid learning event data');
  if (data.lessonId !== undefined && !validId(data.lessonId)) throw new Error('Invalid learning event data');
  if (data.stage !== undefined && !LESSON_STAGES.includes(data.stage as string)) throw new Error('Invalid learning event data');
  if (data.correct !== undefined && typeof data.correct !== 'boolean') throw new Error('Invalid learning event data');
  return data as LearningEventData;
}

function parseLearningEvent(value: unknown): LearningEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid learning event');
  const event = value as Partial<LearningEvent>;
  if (!validId(event.id) || !validId(event.learnerId) || !LEARNING_EVENT_KINDS.includes(event.kind as LearningEventKind) ||
    (event.problemId !== undefined && !validId(event.problemId)) || (event.attemptId !== undefined && !validId(event.attemptId)) ||
    !isTimestamp(event.createdAt)) throw new Error('Invalid learning event');
  const data = parseEventData(event.data);
  const kind = event.kind as LearningEventKind;
  if (kind.startsWith('lesson-') && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-started' && data.stage !== 'explain') throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-checkpoint-passed' && (data.stage !== 'predict' || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-completed' && (data.stage !== 'complete' || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-transfer-started' && data.stage !== 'transfer') throw new Error('Invalid learning event semantics');
  return { ...event, data } as LearningEvent;
}

function eventId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deviceLearnerId(): string {
  const value = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `device-${value}`;
}

export function emptyLearnerMemory(learnerId = deviceLearnerId(), now = new Date()): LearnerMemory {
  return {
    version: 1,
    profile: { learnerId, target: 'od-exam', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: now.toISOString() },
    events: [],
  };
}

export function parseLearnerMemory(value: unknown): LearnerMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid learner memory');
  const memory = value as { version?: unknown; profile?: unknown; events?: unknown };
  if (memory.version !== 1 || !Array.isArray(memory.events)) throw new Error('Invalid learner memory');
  const profile = parseProfile(memory.profile);
  const events = memory.events.map(parseLearningEvent);
  if (events.some((event) => event.learnerId !== profile.learnerId)) throw new Error('Invalid learner event owner');
  return { version: 1, profile, events: events.slice(-MAX_LEARNING_EVENTS) };
}

export function loadLearnerMemory(storage: Pick<Storage, 'getItem' | 'setItem'>): LearnerMemory {
  const stored = storage.getItem(LEARNER_MEMORY_STORAGE_KEY);
  if (!stored) {
    const memory = emptyLearnerMemory();
    saveLearnerMemory(storage, memory);
    return memory;
  }
  try {
    const memory = parseLearnerMemory(JSON.parse(stored));
    if (memory.profile.learnerId !== 'local-learner') return memory;
    const learnerId = deviceLearnerId();
    const migrated = {
      ...memory,
      profile: { ...memory.profile, learnerId, updatedAt: new Date().toISOString() },
      events: memory.events.map((event) => ({ ...event, learnerId })),
    } satisfies LearnerMemory;
    saveLearnerMemory(storage, migrated);
    return migrated;
  }
  catch {
    const memory = emptyLearnerMemory();
    saveLearnerMemory(storage, memory);
    return memory;
  }
}

export function saveLearnerMemory(storage: Pick<Storage, 'setItem'>, memory: LearnerMemory): void {
  storage.setItem(LEARNER_MEMORY_STORAGE_KEY, JSON.stringify(memory));
}

export function appendLearningEvent(memory: LearnerMemory, event: LearningEvent): LearnerMemory {
  const parsed = parseLearningEvent(event);
  if (parsed.learnerId !== memory.profile.learnerId) throw new Error('Invalid learner event owner');
  if (memory.events.some((item) => item.id === parsed.id)) return memory;
  return { ...memory, events: [...memory.events, parsed].slice(-MAX_LEARNING_EVENTS) };
}

export function recordLearningSignal(memory: LearnerMemory, signal: LearningSignal, now = new Date(), id = eventId()): LearnerMemory {
  return appendLearningEvent(memory, {
    id, learnerId: memory.profile.learnerId, kind: signal.kind, data: signal.data, createdAt: now.toISOString(),
    ...(signal.problemId ? { problemId: signal.problemId } : {}),
    ...(signal.attemptId ? { attemptId: signal.attemptId } : {}),
  });
}

export function updateLearnerProfile(
  memory: LearnerMemory,
  patch: Pick<LearnerProfile, 'target' | 'examDate' | 'dailyMinutes' | 'preferredLanguage'>,
  now = new Date(),
): LearnerMemory {
  const profile = parseProfile({ ...memory.profile, ...patch, updatedAt: now.toISOString() });
  return appendLearningEvent({ ...memory, profile }, {
    id: eventId(), learnerId: profile.learnerId, kind: 'goal-updated', createdAt: now.toISOString(),
    data: { target: profile.target, examDate: profile.examDate ?? '', dailyMinutes: profile.dailyMinutes, preferredLanguage: profile.preferredLanguage },
  });
}

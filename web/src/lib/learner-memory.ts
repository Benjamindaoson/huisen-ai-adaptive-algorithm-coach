import type { ProblemLanguage } from './catalog';
import { retainLearningEvents } from './learning-retention';
import {
  LEARNING_DIAGNOSTIC_STEPS, LEARNING_EVENT_DATA_KEYS, LEARNING_EVENT_KINDS, LEARNING_LANGUAGES,
  LEARNING_LESSON_STAGES, LEARNING_PRACTICUM_PHASES, LEARNING_REFLECTION_TAGS, LEARNING_TARGETS,
  LEARNING_TRAINING_STAGES, type LearningEventKind, type LearningTarget,
} from '../../../contracts/learning-event-contract';

export const LEARNER_MEMORY_STORAGE_KEY = 'od-learner-memory-v1';
export { MAX_LEARNING_EVENTS } from './learning-retention';

export { LEARNING_EVENT_KINDS };
export type { LearningEventKind, LearningTarget };

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
  recommendationId?: string;
  stage?: 'explain' | 'observe' | 'predict' | 'complete' | 'build' | 'transfer';
  correct?: boolean;
  phase?: 'understanding' | 'diagnosis' | 'planning' | 'implementation' | 'verification' | 'reflection' | 'completed';
  choiceId?: string;
  passed?: boolean;
  passedCount?: number;
  totalCount?: number;
  reflectionTag?: 'boundary-contract' | 'test-first' | 'cross-file-impact';
  curriculumVersion?: string;
  diagnosticStep?: 'state' | 'implementation' | 'modeling';
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

const TARGETS: readonly LearningTarget[] = LEARNING_TARGETS;
const LANGUAGES: readonly ProblemLanguage[] = LEARNING_LANGUAGES;
const DATA_KEYS: readonly string[] = LEARNING_EVENT_DATA_KEYS;
const LESSON_STAGES: readonly string[] = LEARNING_LESSON_STAGES;
const TRAINING_STAGES: readonly string[] = LEARNING_TRAINING_STAGES;
const PRACTICUM_PHASES: readonly string[] = LEARNING_PRACTICUM_PHASES;
const REFLECTION_TAGS: readonly string[] = LEARNING_REFLECTION_TAGS;
const DIAGNOSTIC_STEPS: readonly string[] = LEARNING_DIAGNOSTIC_STEPS;

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
  if (data.recommendationId !== undefined && !validId(data.recommendationId)) throw new Error('Invalid learning event data');
  if (data.stage !== undefined && ![...LESSON_STAGES, ...TRAINING_STAGES].includes(data.stage as string)) throw new Error('Invalid learning event data');
  if (data.correct !== undefined && typeof data.correct !== 'boolean') throw new Error('Invalid learning event data');
  if (data.phase !== undefined && !PRACTICUM_PHASES.includes(data.phase as string)) throw new Error('Invalid learning event data');
  if (data.choiceId !== undefined && !validId(data.choiceId)) throw new Error('Invalid learning event data');
  if (data.passed !== undefined && typeof data.passed !== 'boolean') throw new Error('Invalid learning event data');
  if (data.passedCount !== undefined && (!Number.isInteger(data.passedCount) || (data.passedCount as number) < 0 || (data.passedCount as number) > 100)) throw new Error('Invalid learning event data');
  if (data.totalCount !== undefined && (!Number.isInteger(data.totalCount) || (data.totalCount as number) < 1 || (data.totalCount as number) > 100)) throw new Error('Invalid learning event data');
  if (data.reflectionTag !== undefined && !REFLECTION_TAGS.includes(data.reflectionTag as string)) throw new Error('Invalid learning event data');
  if (data.curriculumVersion !== undefined && (typeof data.curriculumVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.curriculumVersion))) throw new Error('Invalid learning event data');
  if (data.diagnosticStep !== undefined && !DIAGNOSTIC_STEPS.includes(data.diagnosticStep as string)) throw new Error('Invalid learning event data');
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
  if (kind === 'lesson-transfer-passed' && (!validId(event.problemId) || !validId(event.attemptId) || data.stage !== 'transfer' || data.correct !== true || data.assisted !== false)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-handoff-feedback' && (!validId(data.recommendationId) || !['helpful', 'unclear'].includes(data.choiceId ?? ''))) throw new Error('Invalid learning event semantics');
  if (kind.startsWith('training-') && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'training-session-started' && data.stage !== 'explain') throw new Error('Invalid learning event semantics');
  if (kind === 'training-stage-completed' && (!TRAINING_STAGES.includes(data.stage as string) || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'training-session-completed' && data.stage !== 'transfer') throw new Error('Invalid learning event semantics');
  if (kind.startsWith('first-minute-') && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'bridge-diagnostic-started' && !data.curriculumVersion) throw new Error('Invalid learning event semantics');
  if (kind === 'bridge-diagnostic-step-recorded' && (!data.curriculumVersion || !DIAGNOSTIC_STEPS.includes(data.diagnosticStep as string) || typeof data.correct !== 'boolean')) throw new Error('Invalid learning event semantics');
  if (kind === 'mentor-revision-verified' && (!validId(event.problemId) || data.outcome !== 'passed')) throw new Error('Invalid learning event semantics');
  if (kind.startsWith('practicum-') && !validId(event.problemId)) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-started' && data.phase !== 'understanding') throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-phase-completed' && (!['diagnosis', 'planning'].includes(data.phase as string) || !validId(data.choiceId))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-hint-used' && (!PRACTICUM_PHASES.includes(data.phase as string) || ![1, 2, 3, 4].includes(data.hintLevel as number))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-tested' && (data.phase !== 'verification' || typeof data.passed !== 'boolean' || !Number.isInteger(data.passedCount) || !Number.isInteger(data.totalCount) || (data.passedCount as number) > (data.totalCount as number))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-reflected' && (data.phase !== 'reflection' || !REFLECTION_TAGS.includes(data.reflectionTag as string))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-completed' && (data.phase !== 'completed' || data.passed !== true)) throw new Error('Invalid learning event semantics');
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
  return { version: 1, profile, events: retainLearningEvents(events) };
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
  return { ...memory, events: retainLearningEvents([...memory.events, parsed]) };
}

export function recordLearningSignal(memory: LearnerMemory, signal: LearningSignal, now = new Date(), id = eventId()): LearnerMemory {
  if (signal.kind === 'first-minute-first-run' && memory.events.some((event) => event.kind === 'first-minute-first-run')) return memory;
  if (signal.kind === 'lesson-started' && signal.data.lessonId
    && memory.events.some((event) => event.kind === 'lesson-started' && event.data.lessonId === signal.data.lessonId)) return memory;
  if (signal.kind === 'lesson-handoff-feedback' && signal.data.recommendationId
    && (signal.data.choiceId === 'helpful' || signal.data.choiceId === 'unclear')) {
    const latest = memory.events
      .filter((event) => event.kind === 'lesson-handoff-feedback' && event.data.recommendationId === signal.data.recommendationId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
    if (latest?.data.choiceId === signal.data.choiceId) return memory;
  }
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

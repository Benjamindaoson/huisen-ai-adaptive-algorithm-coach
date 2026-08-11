export const LEARNING_EVENT_KINDS = [
  'goal-updated', 'attempt-recorded', 'hint-requested', 'hint-received',
  'reference-unlocked', 'mastery-check-started', 'mastery-check-passed', 'mastery-check-failed',
  'lesson-started', 'lesson-checkpoint-passed', 'lesson-completed', 'lesson-transfer-started',
] as const;

export type LearningEventKind = (typeof LEARNING_EVENT_KINDS)[number];
export type LearningTarget = 'od-exam' | 'interview' | 'foundation';
export type LearningLanguage = 'java' | 'python' | 'javascript' | 'cpp';

export type LearnerProfile = {
  learnerId: string;
  target: LearningTarget;
  examDate: string | null;
  dailyMinutes: number;
  preferredLanguage: LearningLanguage;
  updatedAt: string;
};

export type LearningEvent = {
  id: string;
  learnerId: string;
  kind: LearningEventKind;
  problemId?: string;
  attemptId?: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type AgentPlanRequest = {
  learnerId: string;
  now?: string;
  candidates: Array<{ problemId: string; title: string; skillId: string }>;
};

const TARGETS: LearningTarget[] = ['od-exam', 'interview', 'foundation'];
const LANGUAGES: LearningLanguage[] = ['java', 'python', 'javascript', 'cpp'];
const EVENT_DATA_KEYS = ['hintLevel', 'outcome', 'assisted', 'skillIds', 'reason', 'target', 'examDate', 'dailyMinutes', 'preferredLanguage', 'lessonId', 'stage', 'correct'];
const ATTEMPT_OUTCOMES = ['executed', 'passed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'];
const LESSON_STAGES = ['explain', 'observe', 'predict', 'complete', 'transfer'];

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: string[], message: string) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(message);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value) &&
    !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
}

function timestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function date(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validateEventData(value: unknown): Record<string, unknown> {
  const data = record(value, 'Invalid learning event data');
  onlyKeys(data, EVENT_DATA_KEYS, 'Invalid learning event data');
  if (data.hintLevel !== undefined && ![1, 2, 3, 4].includes(data.hintLevel as number)) throw new Error('Invalid learning event data');
  if (data.outcome !== undefined && (typeof data.outcome !== 'string' || data.outcome.length > 100)) throw new Error('Invalid learning event data');
  if (data.assisted !== undefined && typeof data.assisted !== 'boolean') throw new Error('Invalid learning event data');
  if (data.skillIds !== undefined && (!Array.isArray(data.skillIds) || data.skillIds.length > 8 || data.skillIds.some((id) => typeof id !== 'string' || id.length > 100))) throw new Error('Invalid learning event data');
  if (data.reason !== undefined && (typeof data.reason !== 'string' || data.reason.length > 500)) throw new Error('Invalid learning event data');
  if (data.target !== undefined && !TARGETS.includes(data.target as LearningTarget)) throw new Error('Invalid learning event data');
  if (data.examDate !== undefined && data.examDate !== '' && !date(data.examDate)) throw new Error('Invalid learning event data');
  if (data.dailyMinutes !== undefined && (!Number.isInteger(data.dailyMinutes) || (data.dailyMinutes as number) < 10 || (data.dailyMinutes as number) > 480)) throw new Error('Invalid learning event data');
  if (data.preferredLanguage !== undefined && !LANGUAGES.includes(data.preferredLanguage as LearningLanguage)) throw new Error('Invalid learning event data');
  if (data.lessonId !== undefined && !validId(data.lessonId)) throw new Error('Invalid learning event data');
  if (data.stage !== undefined && !LESSON_STAGES.includes(data.stage as string)) throw new Error('Invalid learning event data');
  if (data.correct !== undefined && typeof data.correct !== 'boolean') throw new Error('Invalid learning event data');
  return data;
}

export function validateLearnerId(value: unknown): string {
  if (!validId(value)) throw new Error('Invalid learner id');
  return value;
}

export function validateLearnerProfile(learnerId: unknown, body: unknown): LearnerProfile {
  const id = validateLearnerId(learnerId);
  const profile = record(body, 'Invalid learner profile');
  onlyKeys(profile, ['target', 'examDate', 'dailyMinutes', 'preferredLanguage', 'updatedAt'], 'Invalid learner profile');
  if (!TARGETS.includes(profile.target as LearningTarget) || (profile.examDate !== null && !date(profile.examDate)) ||
    !Number.isInteger(profile.dailyMinutes) || (profile.dailyMinutes as number) < 10 || (profile.dailyMinutes as number) > 480 ||
    !LANGUAGES.includes(profile.preferredLanguage as LearningLanguage) || !timestamp(profile.updatedAt)) throw new Error('Invalid learner profile');
  return { learnerId: id, ...profile } as LearnerProfile;
}

export function validateLearningEvent(learnerId: unknown, body: unknown): LearningEvent {
  const id = validateLearnerId(learnerId);
  const event = record(body, 'Invalid learning event');
  onlyKeys(event, ['id', 'kind', 'problemId', 'attemptId', 'data', 'createdAt'], 'Invalid learning event');
  if (!validId(event.id) || !LEARNING_EVENT_KINDS.includes(event.kind as LearningEventKind) ||
    (event.problemId !== undefined && !validId(event.problemId)) || (event.attemptId !== undefined && !validId(event.attemptId)) || !timestamp(event.createdAt)) {
    throw new Error('Invalid learning event');
  }
  const data = validateEventData(event.data);
  const kind = event.kind as LearningEventKind;
  const lessonKind = kind.startsWith('lesson-');
  const needsProblem = kind !== 'goal-updated' && !lessonKind;
  const needsAttempt = ['attempt-recorded', 'hint-requested', 'hint-received'].includes(kind);
  if ((needsProblem && !event.problemId) || (needsAttempt && !event.attemptId)) throw new Error('Invalid learning event semantics');
  if (kind === 'attempt-recorded' && !ATTEMPT_OUTCOMES.includes(data.outcome as string)) throw new Error('Invalid learning event semantics');
  if (['hint-requested', 'hint-received'].includes(kind) && ![1, 2, 3, 4].includes(data.hintLevel as number)) throw new Error('Invalid learning event semantics');
  if (kind === 'goal-updated' && (!TARGETS.includes(data.target as LearningTarget) || !Number.isInteger(data.dailyMinutes) ||
    !LANGUAGES.includes(data.preferredLanguage as LearningLanguage))) throw new Error('Invalid learning event semantics');
  if (lessonKind && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-started' && data.stage !== 'explain') throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-checkpoint-passed' && (data.stage !== 'predict' || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-completed' && (data.stage !== 'complete' || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-transfer-started' && data.stage !== 'transfer') throw new Error('Invalid learning event semantics');
  return { ...event, learnerId: id, data } as LearningEvent;
}

export function validateLearningEventsBatch(learnerId: unknown, body: unknown): LearningEvent[] {
  const batch = record(body, 'Invalid learning event batch');
  onlyKeys(batch, ['events'], 'Invalid learning event batch');
  if (!Array.isArray(batch.events) || batch.events.length > 100) throw new Error('Invalid learning event batch');
  return batch.events.map((event) => validateLearningEvent(learnerId, event));
}

export function validatePlanRequest(body: unknown): AgentPlanRequest {
  const request = record(body, 'Invalid plan request');
  onlyKeys(request, ['learnerId', 'now', 'candidates'], 'Invalid plan request');
  const learnerId = validateLearnerId(request.learnerId);
  if (request.now !== undefined && !timestamp(request.now)) throw new Error('Invalid plan timestamp');
  if (!Array.isArray(request.candidates) || request.candidates.length > 20) throw new Error('Invalid plan candidates');
  const candidates = request.candidates.map((raw) => {
    const candidate = record(raw, 'Invalid plan candidate');
    onlyKeys(candidate, ['problemId', 'title', 'skillId'], 'Invalid plan candidate');
    if (!validId(candidate.problemId) || typeof candidate.title !== 'string' || !candidate.title.trim() || candidate.title.length > 300 ||
      typeof candidate.skillId !== 'string' || !candidate.skillId || candidate.skillId.length > 100) throw new Error('Invalid plan candidate');
    return candidate as AgentPlanRequest['candidates'][number];
  });
  return { learnerId, ...(request.now ? { now: request.now as string } : {}), candidates };
}

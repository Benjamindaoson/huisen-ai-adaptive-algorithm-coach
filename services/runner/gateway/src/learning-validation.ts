import {
  LEARNING_ATTEMPT_OUTCOMES, LEARNING_DIAGNOSTIC_STEPS, LEARNING_EVENT_DATA_KEYS, LEARNING_EVENT_KINDS,
  LEARNING_LANGUAGES, LEARNING_LESSON_STAGES, LEARNING_PRACTICUM_PHASES, LEARNING_REFLECTION_TAGS,
  LEARNING_TARGETS, LEARNING_TRAINING_STAGES, type LearningEventKind, type LearningLanguage, type LearningTarget,
} from '../../../../contracts/learning-event-contract.js';

export { LEARNING_EVENT_KINDS };
export type { LearningEventKind, LearningLanguage, LearningTarget };

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

const TARGETS: readonly LearningTarget[] = LEARNING_TARGETS;
const LANGUAGES: readonly LearningLanguage[] = LEARNING_LANGUAGES;
const EVENT_DATA_KEYS: readonly string[] = LEARNING_EVENT_DATA_KEYS;
const ATTEMPT_OUTCOMES: readonly string[] = LEARNING_ATTEMPT_OUTCOMES;
const LESSON_STAGES: readonly string[] = LEARNING_LESSON_STAGES;
const TRAINING_STAGES: readonly string[] = LEARNING_TRAINING_STAGES;
const PRACTICUM_PHASES: readonly string[] = LEARNING_PRACTICUM_PHASES;
const REFLECTION_TAGS: readonly string[] = LEARNING_REFLECTION_TAGS;
const DIAGNOSTIC_STEPS: readonly string[] = LEARNING_DIAGNOSTIC_STEPS;

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[], message: string) {
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
  const trainingKind = kind.startsWith('training-');
  const firstMinuteKind = kind.startsWith('first-minute-');
  const bridgeDiagnosticKind = kind.startsWith('bridge-diagnostic-');
  const needsProblem = kind !== 'goal-updated' && !lessonKind && !trainingKind && !firstMinuteKind && !bridgeDiagnosticKind;
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
  if (kind === 'lesson-transfer-passed' && (!event.problemId || !event.attemptId || data.stage !== 'transfer' || data.correct !== true || data.assisted !== false)) throw new Error('Invalid learning event semantics');
  if (kind === 'lesson-handoff-feedback' && (!validId(data.recommendationId) || !['helpful', 'unclear'].includes(String(data.choiceId)))) throw new Error('Invalid learning event semantics');
  if (trainingKind && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'training-session-started' && data.stage !== 'explain') throw new Error('Invalid learning event semantics');
  if (kind === 'training-stage-completed' && (!TRAINING_STAGES.includes(data.stage as string) || data.correct !== true)) throw new Error('Invalid learning event semantics');
  if (kind === 'training-session-completed' && data.stage !== 'transfer') throw new Error('Invalid learning event semantics');
  if (firstMinuteKind && !validId(data.lessonId)) throw new Error('Invalid learning event semantics');
  if (kind === 'bridge-diagnostic-started' && !data.curriculumVersion) throw new Error('Invalid learning event semantics');
  if (kind === 'bridge-diagnostic-step-recorded' && (!data.curriculumVersion || !DIAGNOSTIC_STEPS.includes(data.diagnosticStep as string) || typeof data.correct !== 'boolean')) throw new Error('Invalid learning event semantics');
  if (kind === 'mentor-revision-verified' && (!event.problemId || data.outcome !== 'passed')) throw new Error('Invalid learning event semantics');
  if (kind.startsWith('practicum-') && !event.problemId) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-started' && data.phase !== 'understanding') throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-phase-completed' && (!['diagnosis', 'planning'].includes(data.phase as string) || !validId(data.choiceId))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-hint-used' && (!PRACTICUM_PHASES.includes(data.phase as string) || ![1, 2, 3, 4].includes(data.hintLevel as number))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-tested' && (data.phase !== 'verification' || typeof data.passed !== 'boolean' || !Number.isInteger(data.passedCount) || !Number.isInteger(data.totalCount) || (data.passedCount as number) > (data.totalCount as number))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-reflected' && (data.phase !== 'reflection' || !REFLECTION_TAGS.includes(data.reflectionTag as string))) throw new Error('Invalid learning event semantics');
  if (kind === 'practicum-completed' && (data.phase !== 'completed' || data.passed !== true)) throw new Error('Invalid learning event semantics');
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

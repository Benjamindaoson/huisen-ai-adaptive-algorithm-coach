export const LEARNING_EVENT_KINDS = [
  'goal-updated', 'attempt-recorded', 'hint-requested', 'hint-received',
  'reference-unlocked', 'mastery-check-started', 'mastery-check-passed', 'mastery-check-failed',
  'lesson-started', 'lesson-checkpoint-passed', 'lesson-completed', 'lesson-transfer-started', 'lesson-transfer-passed', 'lesson-handoff-feedback',
  'first-minute-mission-seen', 'first-minute-mission-reason-acknowledged', 'first-minute-first-run', 'mentor-revision-verified',
  'training-session-started', 'training-stage-completed', 'training-session-completed',
  'bridge-diagnostic-started', 'bridge-diagnostic-step-recorded',
  'practicum-started', 'practicum-phase-completed', 'practicum-hint-used', 'practicum-tested', 'practicum-reflected', 'practicum-completed',
] as const;

export const LEARNING_EVENT_DATA_KEYS = [
  'hintLevel', 'outcome', 'assisted', 'skillIds', 'reason', 'target', 'examDate', 'dailyMinutes', 'preferredLanguage',
  'lessonId', 'recommendationId', 'stage', 'correct', 'phase', 'choiceId', 'passed', 'passedCount', 'totalCount',
  'reflectionTag', 'curriculumVersion', 'diagnosticStep',
] as const;

export const LEARNING_TARGETS = ['od-exam', 'interview', 'foundation'] as const;
export const LEARNING_LANGUAGES = ['java', 'python', 'javascript', 'cpp'] as const;
export const LEARNING_ATTEMPT_OUTCOMES = ['executed', 'passed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'] as const;
export const LEARNING_LESSON_STAGES = ['explain', 'observe', 'predict', 'complete', 'transfer'] as const;
export const LEARNING_TRAINING_STAGES = ['explain', 'observe', 'predict', 'build', 'transfer'] as const;
export const LEARNING_PRACTICUM_PHASES = ['understanding', 'diagnosis', 'planning', 'implementation', 'verification', 'reflection', 'completed'] as const;
export const LEARNING_REFLECTION_TAGS = ['boundary-contract', 'test-first', 'cross-file-impact'] as const;
export const LEARNING_DIAGNOSTIC_STEPS = ['state', 'implementation', 'modeling'] as const;

export type LearningEventKind = (typeof LEARNING_EVENT_KINDS)[number];
export type LearningTarget = (typeof LEARNING_TARGETS)[number];
export type LearningLanguage = (typeof LEARNING_LANGUAGES)[number];

import { describe, expect, it } from 'vitest';
import { deriveFirstMinuteMetrics } from './first-minute-learning';
import { nextStarterLesson } from './first-minute-learning';
import { buildTrainingSession } from './ai-training';
import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';
import { PROJECT_PRACTICUMS, projectAvailability } from './project-practicum';
import type { LearningEvent, LearningEventKind } from './learner-memory';
import { MAX_LEARNING_EVENTS, MAX_LONGITUDINAL_EVENTS, MIN_RECENT_LEARNING_EVENTS, retainLearningEvents } from './learning-retention';

const start = Date.parse('2026-08-01T00:00:00Z');

function event(id: string, kind: LearningEventKind, offset: number, data: LearningEvent['data'], extra: Pick<LearningEvent, 'problemId' | 'attemptId'> = {}): LearningEvent {
  return { id, learnerId: 'learner-a', kind, data, createdAt: new Date(start + offset * 1_000).toISOString(), ...extra };
}

function recentActivity(count: number, offset = 100): LearningEvent[] {
  return Array.from({ length: count }, (_, index) => event(`recent-${index}`, 'attempt-recorded', offset + index, { outcome: index % 2 ? 'passed' : 'wrong-answer', skillIds: ['array'] }, { problemId: 'problem-recent', attemptId: `attempt-${index}` }));
}

function longitudinalHistory(): LearningEvent[] {
  return [
    event('mission', 'first-minute-mission-seen', 0, { lessonId: 'starter-array-traversal' }),
    event('reason', 'first-minute-mission-reason-acknowledged', 1, { lessonId: 'starter-array-traversal' }),
    event('first-run', 'first-minute-first-run', 130, { lessonId: 'starter-array-traversal' }),
    event('diagnostic-state', 'bridge-diagnostic-step-recorded', 2, { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }),
    event('array-complete', 'lesson-completed', 3, { lessonId: 'starter-array-traversal', stage: 'complete', correct: true }),
    event('hash-start', 'training-session-started', 4, { lessonId: 'starter-hash-lookup', stage: 'explain' }),
    event('hash-explain', 'training-stage-completed', 5, { lessonId: 'starter-hash-lookup', stage: 'explain', correct: true }),
    event('hash-observe', 'training-stage-completed', 6, { lessonId: 'starter-hash-lookup', stage: 'observe', correct: true }),
    event('array-transfer', 'lesson-transfer-passed', 7, { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, { problemId: 'transfer-array', attemptId: 'attempt-transfer' }),
    event('project-complete', 'practicum-completed', 8, { phase: 'completed', passed: true }, { problemId: PROJECT_PRACTICUMS[0]!.id }),
    event('old-noise', 'hint-received', 9, { hintLevel: 1 }, { problemId: 'problem-old', attemptId: 'attempt-old' }),
    ...recentActivity(520, 200),
  ];
}

describe('bounded longitudinal learning retention', () => {
  it('reserves milestones while preserving a strict recent window and total bound', () => {
    const input = longitudinalHistory();
    const retained = retainLearningEvents(input);
    const retainedIds = new Set(retained.map((item) => item.id));

    expect(MAX_LEARNING_EVENTS).toBe(500);
    expect(MAX_LONGITUDINAL_EVENTS).toBe(200);
    expect(MIN_RECENT_LEARNING_EVENTS).toBe(300);
    expect(retained).toHaveLength(500);
    expect(new Set(retained.map((item) => item.id)).size).toBe(500);
    for (const id of ['mission', 'reason', 'first-run', 'diagnostic-state', 'array-complete', 'hash-start', 'hash-explain', 'hash-observe', 'array-transfer', 'project-complete']) expect(retainedIds.has(id)).toBe(true);
    for (let index = 220; index < 520; index += 1) expect(retainedIds.has(`recent-${index}`)).toBe(true);
    expect(retainedIds.has('old-noise')).toBe(false);
    expect(retained.map((item) => item.createdAt)).toEqual([...retained].map((item) => item.createdAt).sort());
  });

  it('keeps small histories lossless, ordered, and idempotent by event id', () => {
    const later = event('later', 'hint-received', 2, { hintLevel: 1 }, { problemId: 'p', attemptId: 'a2' });
    const earlier = event('earlier', 'hint-received', 1, { hintLevel: 1 }, { problemId: 'p', attemptId: 'a1' });

    expect(retainLearningEvents([later, earlier, earlier]).map((item) => item.id)).toEqual(['earlier', 'later']);
  });

  it('keeps the existing longitudinal selectors correct after compaction', () => {
    const retained = retainLearningEvents(longitudinalHistory());

    expect(deriveFirstMinuteMetrics(retained, new Date('2026-08-15T00:00:00Z'))).toMatchObject({
      firstRun: { status: 'measurable', durationMinutes: 2.17, underThreeMinutes: true },
      sevenDayTransfer: { status: 'measurable', eligibleCount: 1, pendingCount: 1 },
    });
    expect(nextStarterLesson(retained)?.id).toBe('starter-hash-lookup');
    expect(buildTrainingSession(STARTER_ALGORITHM_LESSONS[0]!, retained).progress.masteryVerified).toBe(true);
    expect(buildTrainingSession(STARTER_ALGORITHM_LESSONS[1]!, retained).progress).toMatchObject({ started: true, activeStageId: 'predict' });
    expect(projectAvailability(PROJECT_PRACTICUMS, retained)[0]?.status).toBe('completed');
  });
});

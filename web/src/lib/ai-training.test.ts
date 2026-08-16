import { describe, expect, it } from 'vitest';
import { buildGrowthReplay, buildTrainingSession, deriveTrainingProgress } from './ai-training';
import { getFoundationLesson } from './foundation-curriculum';
import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';
import type { LearningEvent } from './learner-memory';

const lesson = STARTER_ALGORITHM_LESSONS[0]!;
const base = { learnerId: 'learner-1', createdAt: '2026-08-14T09:00:00.000Z' } as const;

function diagnosticEvents(results: [boolean, boolean, boolean]): LearningEvent[] {
  return ['state', 'implementation', 'modeling'].map((diagnosticStep, index) => ({
    ...base,
    id: `diagnostic-${diagnosticStep}`,
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '2.0.0', diagnosticStep, correct: results[index] },
    createdAt: new Date(Date.parse(base.createdAt) + index).toISOString(),
  })) as LearningEvent[];
}

describe('AI training session', () => {
  it('states a cold-start baseline rather than inventing an observation', () => {
    const session = buildTrainingSession(lesson, []);

    expect(session.diagnosis.kind).toBe('baseline');
    expect(session.diagnosis.evidenceLabel).toContain('还没有');
    expect(session.mission.minutes).toBe(10);
    expect(session.mission.stages.map((stage) => stage.id)).toEqual(['explain', 'observe', 'predict', 'build', 'transfer']);
  });

  it.each([
    { results: [false, false, false] as [boolean, boolean, boolean], lessonId: 'variables-state' },
    { results: [true, false, false] as [boolean, boolean, boolean], lessonId: 'loops' },
    { results: [true, true, false] as [boolean, boolean, boolean], lessonId: 'functions-decomposition' },
    { results: [true, true, true] as [boolean, boolean, boolean], lessonId: 'starter-array-traversal' },
  ])('carries the bounded entrance diagnosis into its selected lesson: $lessonId', ({ results, lessonId }) => {
    const selectedLesson = lessonId.startsWith('starter-')
      ? STARTER_ALGORITHM_LESSONS.find((item) => item.id === lessonId)
      : getFoundationLesson(lessonId);
    const session = buildTrainingSession(selectedLesson!, diagnosticEvents(results));

    expect(session.diagnosis.kind).toBe('entry-handoff');
    expect(session.diagnosis.eyebrow).toContain('入口诊断');
    expect(session.diagnosis.evidenceRefs).toHaveLength(3);
    expect(session.diagnosis.handoffObservations).toHaveLength(3);
    expect(session.diagnosis.handoffObservations?.map((item) => item.result)).toEqual(results.map((value) => value ? 'stable' : 'needs-practice'));
    expect(session.diagnosis.masteryBoundary).toContain('不等于掌握');
  });

  it('does not show an entrance handoff in a lesson the projected plan did not select', () => {
    const session = buildTrainingSession(STARTER_ALGORITHM_LESSONS[1]!, diagnosticEvents([true, true, true]));

    expect(session.diagnosis.kind).toBe('baseline');
    expect(session.diagnosis.handoffObservations).toBeUndefined();
  });

  it('prefers newer same-skill performance evidence over the entrance handoff', () => {
    const events: LearningEvent[] = [
      ...diagnosticEvents([true, true, true]),
      { ...base, id: 'failed-array-attempt', kind: 'attempt-recorded', problemId: 'p1', attemptId: 'a1', data: { outcome: 'failed', skillIds: ['array'], assisted: false }, createdAt: '2026-08-14T09:01:00.000Z' },
    ];

    expect(buildTrainingSession(lesson, events).diagnosis.kind).toBe('implementation-friction');
  });

  it('ties prompt-dependence diagnosis to recorded assistance evidence', () => {
    const events: LearningEvent[] = [
      { ...base, id: 'hint', kind: 'hint-requested', problemId: 'p1', data: { hintLevel: 1, skillIds: ['array'] } },
      { ...base, id: 'attempt', kind: 'attempt-recorded', problemId: 'p1', attemptId: 'a1', data: { outcome: 'passed', skillIds: ['array'], assisted: true } },
    ];

    const session = buildTrainingSession(lesson, events);

    expect(session.diagnosis.kind).toBe('prompt-dependence');
    expect(session.diagnosis.evidenceRefs).toEqual(['event:hint', 'event:attempt']);
    expect(session.diagnosis.claim).toContain('提示');
  });

  it('resumes at the first unfinished stage without treating completion as mastery', () => {
    const events: LearningEvent[] = [
      { ...base, id: 'start', kind: 'training-session-started', data: { lessonId: lesson.id, stage: 'explain' } },
      { ...base, id: 'explain', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'explain', correct: true } },
      { ...base, id: 'observe', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'observe', correct: true } },
    ];

    const session = buildTrainingSession(lesson, events);

    expect(session).toMatchObject({ version: 1, curriculumVersion: '2.0.0', nodeId: 'arrays-strings' });
    expect(session.progress).toMatchObject({ started: true, activeStageId: 'predict', transferReady: false });
    expect(session.progress.completedStageIds).toEqual(['explain', 'observe']);
    expect(deriveTrainingProgress(lesson, events).masteryVerified).toBe(false);
  });
});

describe('growth replay', () => {
  it('does not call a lesson mastered before independent transfer is verified', () => {
    const events: LearningEvent[] = [
      { ...base, id: 'start', kind: 'training-session-started', data: { lessonId: lesson.id, stage: 'explain' } },
      { ...base, id: 'predict', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'predict', correct: true } },
      { ...base, id: 'build', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'build', correct: true } },
      { ...base, id: 'complete', kind: 'training-session-completed', data: { lessonId: lesson.id, stage: 'transfer' } },
    ];

    const replay = buildGrowthReplay(lesson, events);

    expect(replay.completedStageIds).toEqual(['predict', 'build']);
    expect(replay.transfer.status).toBe('pending');
    expect(replay.nextAction).toContain('独立');
  });

  it('shows verified transfer only from an independent accepted transfer event', () => {
    const events: LearningEvent[] = [
      { ...base, id: 'transfer', kind: 'lesson-transfer-passed', problemId: 'p1', attemptId: 'a1', data: { lessonId: lesson.id, stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] } },
    ];

    expect(buildGrowthReplay(lesson, events).transfer.status).toBe('verified');
  });

  it('labels an executed immediate transfer without claiming durable mastery', () => {
    const events: LearningEvent[] = [
      { ...base, id: 'instant-transfer', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'transfer', correct: true, skillIds: ['array'] } },
    ];

    const replay = buildGrowthReplay(lesson, events);
    expect(replay.transfer.status).toBe('immediate');
    expect(replay.transfer.detail).toContain('不等于长期掌握');
    expect(replay.nextAction).toContain('延迟复测');
  });
});

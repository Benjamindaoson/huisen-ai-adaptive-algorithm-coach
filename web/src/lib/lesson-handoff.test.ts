import { describe, expect, it } from 'vitest';
import { FOUNDATION_LESSONS } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { lessonRecapReflectionReason, projectLessonHandoff, projectLessonHandoffFeedback, projectLessonRecapReflection, projectLessonRecoveryContext } from './lesson-handoff';

const completedImmediateTransfer: LearningEvent = {
  id: 'instant-transfer', learnerId: 'learner-a', kind: 'training-stage-completed',
  data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, skillIds: ['array'] }, createdAt: '2026-08-14T00:02:00Z',
};

describe('evidence-bound lesson handoff', () => {
  it('explains the first projected foundation lesson from the verified source action', () => {
    const handoff = projectLessonHandoff(FOUNDATION_LESSONS[0], [completedImmediateTransfer]);
    expect(handoff).toMatchObject({
      authority: 'event-projection',
      sourceTitle: '从头到尾看懂一组数据',
      lessonTitle: '让程序听懂你的话',
      payoff: FOUNDATION_LESSONS[0].objective,
      evidenceRefs: ['event:instant-transfer'],
    });
    expect(handoff?.reason).toContain('不需要前置课程');
  });

  it('includes prerequisite evidence for the exact projected in-progress lesson', () => {
    const inputCompleted: LearningEvent = {
      id: 'input-complete', learnerId: 'learner-a', kind: 'lesson-completed',
      data: { lessonId: 'input-output', stage: 'complete', correct: true }, createdAt: '2026-08-14T00:01:30Z',
    };
    const variablesStarted: LearningEvent = {
      id: 'variables-start', learnerId: 'learner-a', kind: 'lesson-started',
      data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-14T00:03:00Z',
    };
    const variablesRestarted: LearningEvent = {
      id: 'variables-restart', learnerId: 'learner-a', kind: 'lesson-started',
      data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-14T00:04:00Z',
    };

    const handoff = projectLessonHandoff(FOUNDATION_LESSONS[1], [inputCompleted, completedImmediateTransfer, variablesStarted, variablesRestarted]);

    expect(handoff).toMatchObject({
      authority: 'event-projection',
      sourceTitle: '从头到尾看懂一组数据',
      lessonTitle: '给信息贴标签',
      payoff: FOUNDATION_LESSONS[1].objective,
      evidenceRefs: ['event:instant-transfer', 'event:input-complete'],
    });
    expect(handoff?.reason).toContain('已完成的课程和先修关系');
    expect(handoff?.boundary).toContain('不代表长期掌握');
  });

  it('returns no personalized claim for a mismatched or evidence-free lesson', () => {
    expect(projectLessonHandoff(FOUNDATION_LESSONS[2], [completedImmediateTransfer])).toBeNull();
    expect(projectLessonHandoff(FOUNDATION_LESSONS[0], [])).toBeNull();
  });

  it('derives a stable recommendation id from lesson and exact evidence', () => {
    const first = projectLessonHandoff(FOUNDATION_LESSONS[0], [completedImmediateTransfer]);
    const same = projectLessonHandoff(FOUNDATION_LESSONS[0], [{ ...completedImmediateTransfer }]);
    const changed = projectLessonHandoff(FOUNDATION_LESSONS[0], [{ ...completedImmediateTransfer, id: 'different-transfer' }]);

    expect(first?.recommendationId).toMatch(/^handoff-input-output-[0-9a-f]{16}$/);
    expect(same?.recommendationId).toBe(first?.recommendationId);
    expect(changed?.recommendationId).not.toBe(first?.recommendationId);
    expect(first?.sourceLessonId).toBe('starter-array-traversal');
  });

  it('projects the newest bounded response for one recommendation', () => {
    const events: LearningEvent[] = [
      {
        id: 'feedback-helpful', learnerId: 'learner-a', kind: 'lesson-handoff-feedback',
        data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' }, createdAt: '2026-08-14T10:00:00Z',
      },
      {
        id: 'feedback-unclear', learnerId: 'learner-a', kind: 'lesson-handoff-feedback',
        data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'unclear' }, createdAt: '2026-08-14T10:01:00Z',
      },
      {
        id: 'other-feedback', learnerId: 'learner-a', kind: 'lesson-handoff-feedback',
        data: { lessonId: 'input-output', recommendationId: 'handoff-input-output-other', choiceId: 'helpful' }, createdAt: '2026-08-14T10:02:00Z',
      },
    ];

    expect(projectLessonHandoffFeedback(events, 'handoff-variables-state-0123abcd')).toEqual({
      choice: 'unclear', eventId: 'feedback-unclear', evidenceRef: 'event:feedback-unclear',
    });
    expect(projectLessonHandoffFeedback(events, 'missing')).toBeNull();
  });

  it('accepts only the exact current recommendation and source as recovery context', () => {
    const returnLesson = FOUNDATION_LESSONS[0];
    const handoff = projectLessonHandoff(returnLesson, [completedImmediateTransfer]);

    expect(projectLessonRecoveryContext('starter-array-traversal', returnLesson, handoff?.recommendationId, [completedImmediateTransfer])).toEqual({
      returnLessonId: returnLesson.id,
      returnLessonTitle: returnLesson.title,
      recommendationId: handoff?.recommendationId,
    });
    expect(projectLessonRecoveryContext('wrong-source', returnLesson, handoff?.recommendationId, [completedImmediateTransfer])).toBeNull();
    expect(projectLessonRecoveryContext('starter-array-traversal', returnLesson, 'stale-recommendation', [completedImmediateTransfer])).toBeNull();
    expect(projectLessonRecoveryContext('starter-array-traversal', null, handoff?.recommendationId, [completedImmediateTransfer])).toBeNull();
  });

  it('projects recap closure only for the exact recommendation, return lesson and source lesson', () => {
    const context = { returnLessonId: 'variables-state', returnLessonTitle: '给信息贴标签', recommendationId: 'handoff-variables-state-0123abcd' };
    const exact: LearningEvent = {
      id: 'recap-reflection', learnerId: 'learner-a', kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: context.recommendationId, choiceId: 'helpful', reason: lessonRecapReflectionReason('starter-array-traversal') },
      createdAt: '2026-08-14T10:03:00Z',
    };
    const malformed: LearningEvent[] = [
      { ...exact, id: 'wrong-recommendation', data: { ...exact.data, recommendationId: 'handoff-other' } },
      { ...exact, id: 'wrong-return', data: { ...exact.data, lessonId: 'input-output' } },
      { ...exact, id: 'wrong-source', data: { ...exact.data, reason: lessonRecapReflectionReason('starter-hash-lookup') } },
      { ...exact, id: 'ordinary-feedback', data: { ...exact.data, reason: undefined } },
    ];

    expect(projectLessonRecapReflection([...malformed, exact], context, 'starter-array-traversal')).toEqual({
      eventId: 'recap-reflection', evidenceRef: 'event:recap-reflection', sourceLessonId: 'starter-array-traversal',
    });
    expect(projectLessonRecapReflection(malformed, context, 'starter-array-traversal')).toBeNull();
  });
});

import { expect, it } from 'vitest';
import { deriveFirstMinuteMetrics, isStarterLessonUnlocked, nextStarterLesson } from './first-minute-learning';
import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';
import type { LearningEvent } from './learner-memory';

const base = { learnerId: 'learner-1', data: {}, createdAt: '2026-08-13T09:00:00.000Z' } as const;

it('selects array traversal as the first starter lesson', () => {
  expect(nextStarterLesson([])?.id).toBe('starter-array-traversal');
});

it('keeps later starter lessons locked until their prerequisite is completed', () => {
  const hashLookup = STARTER_ALGORITHM_LESSONS[1]!;

  expect(isStarterLessonUnlocked(hashLookup, [])).toBe(false);
  expect(isStarterLessonUnlocked(hashLookup, [{ ...base, id: 'array-complete', kind: 'lesson-completed', data: { lessonId: 'starter-array-traversal' } }])).toBe(true);
});

it('keeps first-minute outcomes honestly unmeasurable without events', () => {
  const metrics = deriveFirstMinuteMetrics([]);

  expect(metrics.firstRun.status).toBe('not-yet-measurable');
  expect(metrics.sevenDayTransfer.status).toBe('not-yet-measurable');
});

it('derives first-run duration, reason acknowledgement, Mentor revision, and eligible transfer from bounded events', () => {
  const events: LearningEvent[] = [
    { ...base, id: 'mission', kind: 'first-minute-mission-seen', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:00:00.000Z' },
    { ...base, id: 'reason', kind: 'first-minute-mission-reason-acknowledged', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:00:20.000Z' },
    { ...base, id: 'run', kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:02:10.000Z' },
    { ...base, id: 'revision', kind: 'mentor-revision-verified', problemId: 'p1', data: { outcome: 'passed' }, createdAt: '2026-08-13T09:04:00.000Z' },
    { ...base, id: 'transfer', kind: 'lesson-transfer-passed', problemId: 'p2', attemptId: 'a2', data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, createdAt: '2026-08-01T09:00:00.000Z' },
  ];

  const metrics = deriveFirstMinuteMetrics(events, new Date('2026-08-13T10:00:00.000Z'));
  expect(metrics.firstRun).toMatchObject({ status: 'measurable', durationMinutes: 2.17, underThreeMinutes: true });
  expect(metrics.reasonAcknowledgement).toBe(true);
  expect(metrics.mentorRevision).toBe(true);
  expect(metrics.sevenDayTransfer).toMatchObject({ status: 'measurable', eligibleCount: 1, passedCount: 0, pendingCount: 1 });
});

it('anchors activation to the earliest matching run after the mission despite legacy duplicates', () => {
  const events: LearningEvent[] = [
    { ...base, id: 'mission', kind: 'first-minute-mission-seen', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:00:00.000Z' },
    { ...base, id: 'pre-mission', kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T08:59:00.000Z' },
    { ...base, id: 'other-lesson', kind: 'first-minute-first-run', data: { lessonId: 'starter-hash-lookup' }, createdAt: '2026-08-13T09:01:00.000Z' },
    { ...base, id: 'first-valid', kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:02:10.000Z' },
    { ...base, id: 'later-frame', kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-13T09:08:00.000Z' },
  ];

  expect(deriveFirstMinuteMetrics(events).firstRun).toMatchObject({ status: 'measurable', durationMinutes: 2.17, underThreeMinutes: true });
  expect(deriveFirstMinuteMetrics(events.filter((event) => !['first-valid', 'later-frame'].includes(event.id))).firstRun.status).toBe('not-yet-measurable');
});

it('counts a seven-day transfer as passed only after an independent delayed review', () => {
  const events: LearningEvent[] = [{ ...base, id: 'transfer', kind: 'lesson-transfer-passed', problemId: 'p2', attemptId: 'a2', data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, createdAt: '2026-08-01T09:00:00.000Z' }];
  const metrics = deriveFirstMinuteMetrics(events, new Date('2026-08-13T10:00:00.000Z'), [{ version: 1, id: 'review', learnerId: 'learner-1', kind: 'review-recorded', problemId: 'p3', attemptId: 'a3', skillIds: ['array'], evidenceRefs: ['attempt:a3'], data: { outcome: 'passed', reviewed: true }, createdAt: '2026-08-09T09:00:00.000Z' }]);

  expect(metrics.sevenDayTransfer).toMatchObject({ status: 'measurable', eligibleCount: 1, passedCount: 1, pendingCount: 0 });
});

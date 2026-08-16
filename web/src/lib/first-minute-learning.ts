import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';
import type { FoundationLesson } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import type { PedagogicalEvent } from './pedagogical-events';

export type MeasurementStatus = 'not-yet-measurable' | 'measurable';
export type FirstMinuteMetrics = {
  firstRun: { status: MeasurementStatus; durationMinutes?: number; underThreeMinutes?: boolean };
  reasonAcknowledgement: boolean;
  mentorRevision: boolean;
  sevenDayTransfer: { status: MeasurementStatus; eligibleCount?: number; passedCount?: number; pendingCount?: number };
};

export function nextStarterLesson(events: LearningEvent[]): FoundationLesson | null {
  const completed = new Set(events.filter((event) => event.kind === 'lesson-completed').map((event) => event.data.lessonId));
  return STARTER_ALGORITHM_LESSONS.find((lesson) => !completed.has(lesson.id) && lesson.prerequisites.every((id) => completed.has(id))) ?? null;
}

/** A direct URL must not let a beginner skip the idea the next lesson needs. */
export function isStarterLessonUnlocked(lesson: FoundationLesson, events: LearningEvent[]): boolean {
  const completed = new Set(events.filter((event) => event.kind === 'lesson-completed').map((event) => event.data.lessonId));
  return lesson.prerequisites.every((id) => completed.has(id));
}

function latest(events: LearningEvent[], kind: LearningEvent['kind']): LearningEvent | undefined {
  return events.filter((event) => event.kind === kind).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

function earliest(events: LearningEvent[], predicate: (event: LearningEvent) => boolean): LearningEvent | undefined {
  return events.filter(predicate).sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))[0];
}

export function deriveFirstMinuteMetrics(events: LearningEvent[], now = new Date(), pedagogicalEvents: PedagogicalEvent[] = []): FirstMinuteMetrics {
  const mission = earliest(events, (event) => event.kind === 'first-minute-mission-seen');
  const firstRun = mission ? earliest(events, (event) => event.kind === 'first-minute-first-run' && event.data.lessonId === mission.data.lessonId && Date.parse(event.createdAt) >= Date.parse(mission.createdAt)) : undefined;
  const durationMs = mission && firstRun ? Date.parse(firstRun.createdAt) - Date.parse(mission.createdAt) : NaN;
  const durationMinutes = Number.isFinite(durationMs) && durationMs >= 0 ? Math.round((durationMs / 60_000) * 100) / 100 : undefined;
  const eligibleTransfers = events.filter((event) => event.kind === 'lesson-transfer-passed' && Date.parse(event.createdAt) <= now.getTime() - (7 * 24 * 60 * 60 * 1_000));
  const sevenDayReviews = eligibleTransfers.map((transfer) => {
    const transferSkills = transfer.data.skillIds ?? [];
    return pedagogicalEvents
      .filter((event) => event.kind === 'review-recorded' && Date.parse(event.createdAt) >= Date.parse(transfer.createdAt) + (7 * 24 * 60 * 60 * 1_000) && (event.skillIds ?? []).some((skill) => transferSkills.includes(skill)))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
  });
  const completedSevenDayReviews = sevenDayReviews.filter((event): event is PedagogicalEvent => Boolean(event));
  return {
    firstRun: durationMinutes === undefined ? { status: 'not-yet-measurable' } : { status: 'measurable', durationMinutes, underThreeMinutes: durationMinutes < 3 },
    reasonAcknowledgement: Boolean(latest(events, 'first-minute-mission-reason-acknowledged')),
    mentorRevision: Boolean(latest(events, 'mentor-revision-verified')),
    sevenDayTransfer: eligibleTransfers.length ? { status: 'measurable', eligibleCount: eligibleTransfers.length, passedCount: completedSevenDayReviews.filter((event) => event.data.outcome === 'passed').length, pendingCount: eligibleTransfers.length - completedSevenDayReviews.length } : { status: 'not-yet-measurable' },
  };
}

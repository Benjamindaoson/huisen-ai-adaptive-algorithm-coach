import { getFoundationLesson, type FoundationLesson } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { projectBridgeLearningAction } from './projected-learning-action';

export type EvidenceBoundLessonHandoff = {
  authority: 'event-projection';
  recommendationId: string;
  headline: string;
  sourceLessonId: string;
  sourceTitle: string;
  lessonTitle: string;
  reason: string;
  payoff: string;
  boundary: string;
  evidenceRefs: string[];
};

export type LessonHandoffFeedbackChoice = 'helpful' | 'unclear';
export type ProjectedLessonHandoffFeedback = { choice: LessonHandoffFeedbackChoice; eventId: string; evidenceRef: string };
export type LessonRecoveryContext = { returnLessonId: string; returnLessonTitle: string; recommendationId: string };
export type ProjectedLessonRecapReflection = { eventId: string; evidenceRef: string; sourceLessonId: string };

export function lessonRecapReflectionReason(sourceLessonId: string): string {
  return `recap-corrected-model:${sourceLessonId}`;
}

export function projectLessonRecapReflection(
  events: LearningEvent[],
  recovery: LessonRecoveryContext,
  sourceLessonId: string,
): ProjectedLessonRecapReflection | null {
  const reason = lessonRecapReflectionReason(sourceLessonId);
  const latest = events
    .filter((event) => event.kind === 'lesson-handoff-feedback'
      && event.data.lessonId === recovery.returnLessonId
      && event.data.recommendationId === recovery.recommendationId
      && event.data.choiceId === 'helpful'
      && event.data.reason === reason)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
  return latest ? { eventId: latest.id, evidenceRef: `event:${latest.id}`, sourceLessonId } : null;
}

function evidenceFingerprint(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export function projectLessonHandoffFeedback(events: LearningEvent[], recommendationId: string): ProjectedLessonHandoffFeedback | null {
  const latest = events
    .filter((event) => event.kind === 'lesson-handoff-feedback'
      && event.data.recommendationId === recommendationId
      && (event.data.choiceId === 'helpful' || event.data.choiceId === 'unclear'))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
  if (!latest) return null;
  return { choice: latest.data.choiceId as LessonHandoffFeedbackChoice, eventId: latest.id, evidenceRef: `event:${latest.id}` };
}

export function projectLessonHandoff(lesson: FoundationLesson, events: LearningEvent[]): EvidenceBoundLessonHandoff | null {
  const projectedAction = projectBridgeLearningAction(events);
  if (projectedAction.state !== 'continue-foundation'
    || projectedAction.route.name !== 'learn'
    || projectedAction.route.lessonId !== lesson.id
    || projectedAction.evidenceRefs.length === 0) return null;

  const sourceRef = projectedAction.evidenceRefs[0];
  const sourceEvent = events.find((event) => `event:${event.id}` === sourceRef
    && event.kind === 'training-stage-completed'
    && event.data.stage === 'transfer'
    && event.data.correct === true);
  if (!sourceEvent) return null;

  const sourceTitle = getFoundationLesson(sourceEvent.data.lessonId ?? '')?.title ?? '上一项训练';
  const sourceLessonId = sourceEvent.data.lessonId!;
  const projectedRefSet = new Set(projectedAction.evidenceRefs);
  const prerequisiteRefs = lesson.prerequisites.flatMap((prerequisiteId) => {
    const completion = events
      .filter((event) => event.kind === 'lesson-completed'
        && event.data.lessonId === prerequisiteId
        && projectedRefSet.has(`event:${event.id}`))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
    return completion ? [`event:${completion.id}`] : [];
  });
  const sequencingReason = lesson.prerequisites.length === 0
    ? `「${lesson.title}」不需要前置课程，是当前学习路径中已解锁的第一步。`
    : `根据已完成的课程和先修关系，「${lesson.title}」是当前已解锁的下一步。`;
  return {
    authority: 'event-projection',
    recommendationId: `handoff-${lesson.id}-${evidenceFingerprint([lesson.id, sourceRef, ...prerequisiteRefs].join('|'))}`,
    headline: `AI 为什么现在安排「${lesson.title}」`,
    sourceLessonId,
    sourceTitle,
    lessonTitle: lesson.title,
    reason: `你刚完成「${sourceTitle}」的即时迁移。${sequencingReason}`,
    payoff: lesson.objective,
    boundary: '这次安排只说明下一步学习顺序，不代表长期掌握；长期掌握仍需要延迟复测或之后的独立任务证据。',
    evidenceRefs: [sourceRef, ...prerequisiteRefs],
  };
}

export function projectLessonRecoveryContext(
  sourceLessonId: string,
  returnLesson: FoundationLesson | null,
  recommendationId: string | undefined,
  events: LearningEvent[],
): LessonRecoveryContext | null {
  if (!returnLesson || !recommendationId) return null;
  const handoff = projectLessonHandoff(returnLesson, events);
  if (!handoff || handoff.recommendationId !== recommendationId || handoff.sourceLessonId !== sourceLessonId) return null;
  return { returnLessonId: returnLesson.id, returnLessonTitle: returnLesson.title, recommendationId };
}

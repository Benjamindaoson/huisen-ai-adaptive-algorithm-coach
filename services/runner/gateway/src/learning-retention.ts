import type { LearningEvent } from './learning-validation.js';

export const MAX_LEARNING_EVENTS = 500;
export const MAX_LONGITUDINAL_EVENTS = 200;
export const MIN_RECENT_LEARNING_EVENTS = MAX_LEARNING_EVENTS - MAX_LONGITUDINAL_EVENTS;

const FIRST_ACTIVATION_KINDS = new Set<LearningEvent['kind']>([
  'first-minute-mission-seen',
  'first-minute-mission-reason-acknowledged',
  'first-minute-first-run',
]);

function ordered(events: readonly LearningEvent[]): LearningEvent[] {
  const byId = new Map<string, LearningEvent>();
  for (const event of [...events].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id))) {
    if (!byId.has(event.id)) byId.set(event.id, event);
  }
  return [...byId.values()];
}

function milestoneKey(event: LearningEvent): string | null {
  if (FIRST_ACTIVATION_KINDS.has(event.kind)) return `activation:${event.kind}`;
  if (event.kind === 'mentor-revision-verified') return 'activation:mentor-revision-verified';
  if (event.kind === 'bridge-diagnostic-step-recorded') return typeof event.data.diagnosticStep === 'string' ? `diagnostic:${event.data.diagnosticStep}` : null;
  if (event.kind === 'lesson-completed' || event.kind === 'lesson-transfer-passed') return typeof event.data.lessonId === 'string' ? `${event.kind}:${event.data.lessonId}` : null;
  if (event.kind === 'training-session-started' || event.kind === 'training-session-completed') return typeof event.data.lessonId === 'string' ? `${event.kind}:${event.data.lessonId}` : null;
  if (event.kind === 'training-stage-completed') return typeof event.data.lessonId === 'string' && typeof event.data.stage === 'string' ? `${event.kind}:${event.data.lessonId}:${event.data.stage}` : null;
  if (event.kind === 'mastery-check-passed') return event.problemId ? `${event.kind}:${event.problemId}` : null;
  if (event.kind === 'practicum-completed') return event.problemId ? `${event.kind}:${event.problemId}` : null;
  return null;
}

export function retainLearningEvents(events: readonly LearningEvent[]): LearningEvent[] {
  const chronological = ordered(events);
  if (chronological.length <= MAX_LEARNING_EVENTS) return chronological;

  const firstActivation = new Map<string, LearningEvent>();
  const latestMilestones = new Map<string, LearningEvent>();
  for (const event of chronological) {
    const key = milestoneKey(event);
    if (!key) continue;
    if (FIRST_ACTIVATION_KINDS.has(event.kind)) {
      if (!firstActivation.has(key)) firstActivation.set(key, event);
    } else {
      latestMilestones.set(key, event);
    }
  }

  const mandatory = [...firstActivation.values()];
  const remainingMilestoneSlots = Math.max(0, MAX_LONGITUDINAL_EVENTS - mandatory.length);
  const otherMilestones = [...latestMilestones.values()]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id))
    .slice(-remainingMilestoneSlots);
  const retainedIds = new Set([...mandatory, ...otherMilestones].map((event) => event.id));

  for (let index = chronological.length - 1; index >= 0 && retainedIds.size < MAX_LEARNING_EVENTS; index -= 1) retainedIds.add(chronological[index]!.id);
  return chronological.filter((event) => retainedIds.has(event.id));
}

import type { LearningEvent } from './learning-validation.js';

type SkillProjection = { observations: number; independentPasses: number; assistedPasses: number; transferPasses: number; lastObservedAt: string; evidenceEventIds: string[] };

export function projectAuthoritativeLearning(events: LearningEvent[]) {
  const skills: Record<string, SkillProjection> = {};
  const reviews = new Map<string, { skillId: string; dueAt: string; evidenceEventId: string; status: 'scheduled' }>();
  for (const event of [...events].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))) {
    const skillIds = Array.isArray(event.data.skillIds) ? event.data.skillIds.filter((id): id is string => typeof id === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(id)) : [];
    for (const skillId of skillIds) {
      const current = skills[skillId] ?? { observations: 0, independentPasses: 0, assistedPasses: 0, transferPasses: 0, lastObservedAt: event.createdAt, evidenceEventIds: [] };
      const passed = event.data.outcome === 'passed' || event.kind === 'mastery-check-passed' || event.kind === 'lesson-transfer-passed';
      const assisted = event.data.assisted === true;
      skills[skillId] = {
        observations: current.observations + 1,
        independentPasses: current.independentPasses + (passed && !assisted ? 1 : 0),
        assistedPasses: current.assistedPasses + (passed && assisted ? 1 : 0),
        transferPasses: current.transferPasses + (event.kind === 'lesson-transfer-passed' ? 1 : 0),
        lastObservedAt: event.createdAt,
        evidenceEventIds: [...current.evidenceEventIds, event.id].slice(-100),
      };
      if (event.kind === 'lesson-transfer-passed') reviews.set(skillId, {
        skillId, dueAt: new Date(Date.parse(event.createdAt) + 7 * 24 * 60 * 60 * 1_000).toISOString(), evidenceEventId: event.id, status: 'scheduled',
      });
    }
  }
  return { mastery: { skills }, delayedReviews: { reviews: [...reviews.values()].sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.skillId.localeCompare(right.skillId)) } };
}

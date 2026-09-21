import type { EvidenceEvent, EvidenceType } from '../../contracts/evidence-event';
import {
  LEARNER_SKILL_STATE_CONTRACT_VERSION,
  validateLearnerSkillState,
  type LearnerSkillState,
} from '../../contracts/learner-skill-state';

const LEARNER_MODEL_EVIDENCE_TYPES = new Set<EvidenceType>([
  'concept_check',
  'code_submission',
  'test_result',
  'hint_request',
  'project_verification',
  'transfer_result',
  'delayed_retest',
]);

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function eventScore(event: EvidenceEvent): number | undefined {
  if (event.score !== undefined) return event.score;
  if (event.passed !== undefined) return event.passed ? 1 : 0;
  return undefined;
}

export function isLearnerModelEvidence(event: EvidenceEvent): boolean {
  return LEARNER_MODEL_EVIDENCE_TYPES.has(event.evidenceType);
}

export class LearnerModelUpdater {
  project(learnerId: string, skillId: string, sourceEvents: readonly EvidenceEvent[]): LearnerSkillState {
    const events = sourceEvents
      .filter((event) => event.learnerId === learnerId && event.skillId === skillId)
      .filter(isLearnerModelEvidence)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

    const concept: number[] = [];
    const implementation: number[] = [];
    const debugging: number[] = [];
    const transfer: number[] = [];
    const retention: number[] = [];
    const independence: number[] = [];
    const hintDependency: number[] = [];
    const misconceptions = new Set<string>();

    for (const event of events) {
      const score = eventScore(event);
      if (score !== undefined) {
        if (event.evidenceType === 'concept_check') concept.push(score);
        if (event.evidenceType === 'code_submission' || event.evidenceType === 'test_result') implementation.push(score);
        if (event.evidenceType === 'project_verification') {
          implementation.push(score);
          if (event.metadata?.dimension === 'debugging') debugging.push(score);
        }
        if (event.evidenceType === 'transfer_result') transfer.push(score);
        if (event.evidenceType === 'delayed_retest') retention.push(score);
      }

      if (event.independent !== undefined && score !== undefined) {
        independence.push(event.independent ? score : 0);
      }
      if (event.evidenceType === 'hint_request' && event.hintLevel !== undefined) {
        hintDependency.push(clamp01(event.hintLevel / 6));
      }

      const misconception = event.metadata?.misconception;
      if (typeof misconception === 'string' && misconception.trim()) misconceptions.add(misconception.trim());
    }

    const conceptScore = average(concept);
    const implementationScore = average(implementation);
    const debuggingScore = average(debugging);
    const transferScore = average(transfer);
    const retentionScore = average(retention);
    const independentSuccess = average(independence);
    const hintScore = average(hintDependency);

    const weighted: Array<[number, number]> = [];
    if (concept.length) weighted.push([conceptScore, 0.20]);
    if (implementation.length) weighted.push([implementationScore, 0.30]);
    if (debugging.length) weighted.push([debuggingScore, 0.15]);
    if (transfer.length) weighted.push([transferScore, 0.20]);
    if (retention.length) weighted.push([retentionScore, 0.15]);

    const totalWeight = weighted.reduce((sum, [, weight]) => sum + weight, 0);
    const mastery = totalWeight === 0
      ? 0
      : weighted.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;

    const lastPracticedAt = events.length ? events[events.length - 1].createdAt : null;
    const nextReviewAt = lastPracticedAt
      ? new Date(Date.parse(lastPracticedAt) + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const updatedAt = lastPracticedAt ?? new Date(0).toISOString();

    return validateLearnerSkillState({
      contractVersion: LEARNER_SKILL_STATE_CONTRACT_VERSION,
      learnerId,
      skillId,
      mastery: clamp01(mastery),
      uncertainty: events.length === 0 ? 1 : Math.max(0.05, 1 / Math.sqrt(events.length + 1)),
      conceptScore: clamp01(conceptScore),
      implementationScore: clamp01(implementationScore),
      debuggingScore: clamp01(debuggingScore),
      independentSuccess: clamp01(independentSuccess),
      hintDependency: clamp01(hintScore),
      transferScore: clamp01(transferScore),
      retentionScore: clamp01(retentionScore),
      evidenceCount: events.length,
      misconceptionTags: [...misconceptions].sort(),
      lastPracticedAt,
      nextReviewAt,
      updatedAt,
    });
  }
}

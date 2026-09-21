import { EVIDENCE_EVENT_CONTRACT_VERSION, type ActivityType, type EvidenceEvent, type EvidenceType } from '../../contracts/evidence-event';
import type { LearningEventKind } from '../../contracts/learning-event-contract';

export type LegacyLearningEvent = Readonly<{
  id: string;
  kind: LearningEventKind;
  data: Record<string, unknown>;
  createdAt: string;
  problemId?: string;
  attemptId?: string;
}>;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function scoreFromEvent(event: LegacyLearningEvent): number | undefined {
  if (typeof event.data.correct === 'boolean') return event.data.correct ? 1 : 0;
  if (typeof event.data.passed === 'boolean') return event.data.passed ? 1 : 0;
  const outcome = event.data.outcome;
  if (outcome === 'passed') return 1;
  if (typeof outcome === 'string' && ['wrong-answer', 'compile-error', 'runtime-error', 'timeout'].includes(outcome)) return 0;
  return undefined;
}

function classify(kind: LearningEventKind): { evidenceType: EvidenceType; activityType: ActivityType } {
  if (kind === 'hint-requested' || kind === 'hint-received' || kind === 'practicum-hint-used') {
    return { evidenceType: 'hint_request', activityType: 'practice' };
  }
  if (kind === 'lesson-transfer-passed' || kind === 'lesson-transfer-started') {
    return { evidenceType: 'transfer_result', activityType: 'practice' };
  }
  if (kind === 'mastery-check-passed' || kind === 'mastery-check-failed' || kind === 'mastery-check-started') {
    return { evidenceType: 'concept_check', activityType: 'learn' };
  }
  if (kind === 'attempt-recorded' || kind === 'mentor-revision-verified' || kind === 'practicum-tested') {
    return { evidenceType: 'test_result', activityType: 'code' };
  }
  if (kind === 'practicum-completed') {
    return { evidenceType: 'project_verification', activityType: 'project' };
  }
  return { evidenceType: 'learning_event', activityType: 'learn' };
}

export function learningEventToEvidence(
  learnerId: string,
  event: LegacyLearningEvent,
  options: { defaultSkillId?: string } = {},
): readonly EvidenceEvent[] {
  const skillIds = asStringArray(event.data.skillIds);
  const resolvedSkillIds = skillIds.length > 0 ? skillIds : [options.defaultSkillId ?? 'legacy.unmapped'];
  const classification = classify(event.kind);
  const score = scoreFromEvent(event);
  const hintLevel = typeof event.data.hintLevel === 'number' ? event.data.hintLevel : undefined;
  const assisted = typeof event.data.assisted === 'boolean' ? event.data.assisted : undefined;

  return resolvedSkillIds.map((skillId, index) => ({
    contractVersion: EVIDENCE_EVENT_CONTRACT_VERSION,
    id: `${event.id}:evidence:${index}`,
    learnerId,
    skillId,
    taskId: event.problemId,
    domain: 'legacy',
    activityType: classification.activityType,
    evidenceType: classification.evidenceType,
    score,
    passed: score === undefined ? undefined : score >= 0.5,
    independent: assisted === undefined ? undefined : !assisted,
    hintLevel,
    result: event.kind,
    provenance: {
      source: 'legacy-learning-event',
      sourceId: event.id,
      adapter: 'learningEventToEvidence',
    },
    metadata: { legacyKind: event.kind },
    createdAt: event.createdAt,
  }));
}

import type { AIDomain } from './skill-node';

export const EVIDENCE_EVENT_CONTRACT_VERSION = 1 as const;

export const EVIDENCE_TYPES = [
  'concept_check',
  'code_submission',
  'test_result',
  'hint_request',
  'retrieval_trace',
  'tool_trace',
  'project_verification',
  'transfer_result',
  'delayed_retest',
  'simulation_result',
  'robot_execution',
  'learning_event',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const ACTIVITY_TYPES = [
  'learn',
  'practice',
  'code',
  'debug',
  'experiment',
  'project',
  'simulation',
  'robot',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type EvidenceDomain = AIDomain | 'legacy';

export type EvidenceProvenance = Readonly<{
  source: string;
  sourceId?: string;
  adapter?: string;
}>;

export type EvidenceEvent = Readonly<{
  contractVersion: typeof EVIDENCE_EVENT_CONTRACT_VERSION;
  id: string;
  learnerId: string;
  skillId: string;
  taskId?: string;
  sessionId?: string;
  domain: EvidenceDomain;
  activityType: ActivityType;
  evidenceType: EvidenceType;
  score?: number;
  passed?: boolean;
  independent?: boolean;
  hintLevel?: number;
  artifactRef?: string;
  traceRef?: string;
  result?: string;
  provenance: EvidenceProvenance;
  metadata?: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export function validateEvidenceEvent(event: EvidenceEvent): EvidenceEvent {
  if (event.contractVersion !== EVIDENCE_EVENT_CONTRACT_VERSION) throw new Error('Unsupported EvidenceEvent contract version');
  for (const [name, value] of [
    ['id', event.id],
    ['learnerId', event.learnerId],
    ['skillId', event.skillId],
    ['createdAt', event.createdAt],
    ['provenance.source', event.provenance.source],
  ] as const) {
    if (!value.trim()) throw new Error(`EvidenceEvent.${name} is required`);
  }
  if (!EVIDENCE_TYPES.includes(event.evidenceType)) throw new Error(`Unsupported evidence type: ${event.evidenceType}`);
  if (!ACTIVITY_TYPES.includes(event.activityType)) throw new Error(`Unsupported activity type: ${event.activityType}`);
  if (event.score !== undefined && (!Number.isFinite(event.score) || event.score < 0 || event.score > 1)) {
    throw new Error('EvidenceEvent.score must be between 0 and 1');
  }
  if (event.hintLevel !== undefined && (!Number.isInteger(event.hintLevel) || event.hintLevel < 0 || event.hintLevel > 6)) {
    throw new Error('EvidenceEvent.hintLevel must be an integer from 0 to 6');
  }
  if (Number.isNaN(Date.parse(event.createdAt))) throw new Error('EvidenceEvent.createdAt must be an ISO timestamp');
  return event;
}

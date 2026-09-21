import type {
  TutorBlockedEvidence,
  TutorEvidenceCandidate,
  TutorGateDecision,
} from './contracts';

export function decideTutorEvidence(
  candidates: readonly TutorEvidenceCandidate[],
  blocked: readonly TutorBlockedEvidence[],
  minScore = 0.45,
): TutorGateDecision {
  const confidence = Math.max(0, ...candidates.map((candidate) => candidate.score));

  if (!candidates.length) {
    return {
      action: 'clarify_or_refuse',
      reason: blocked.length ? blocked[0].reason : 'no_evidence',
      confidence: 0,
    };
  }
  if (confidence < minScore) {
    return { action: 'retry', reason: 'low_confidence', confidence };
  }
  if (!candidates.some((candidate) => candidate.sourcePath)) {
    return { action: 'clarify_or_refuse', reason: 'missing_source', confidence };
  }
  return { action: 'accept', reason: 'evidence_supported', confidence };
}

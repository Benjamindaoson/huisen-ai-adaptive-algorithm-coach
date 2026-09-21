import {
  EVIDENCE_EVENT_CONTRACT_VERSION,
  type EvidenceDomain,
  type EvidenceEvent,
} from '../../contracts/evidence-event';
import type {
  ProjectEngineeringEvidence,
  ProjectLabSubmission,
  ProjectOsAssessmentResult,
  ProjectOsAuditResult,
} from '../../contracts/project-lab';

function domainFromSkill(skillId: string): EvidenceDomain {
  if (skillId.startsWith('rag.')) return 'rag';
  if (skillId.startsWith('agent.')) return 'agent';
  if (skillId.startsWith('llm.')) return 'llm';
  if (skillId.startsWith('embodied.')) return 'embodied-ai';
  return 'legacy';
}

export function normalizeProjectEngineeringEvidence(
  submission: ProjectLabSubmission,
  projectId: string,
  audit: ProjectOsAuditResult,
  assessment: ProjectOsAssessmentResult,
): ProjectEngineeringEvidence {
  return {
    projectId,
    assessmentId: assessment.assessment_id,
    repositoryUrl: submission.repositoryUrl,
    commitSha: assessment.source_snapshot?.commit_sha,
    overallStatus: assessment.verification.overall_status,
    passRate: assessment.summary.pass_rate,
    verificationResults: assessment.verification.verification_results,
    maturityAssessment: audit.maturity_assessment,
    gaps: audit.gaps,
  };
}

export type ProjectLearningEvidenceAdaptation = Readonly<{
  events: readonly EvidenceEvent[];
  learningEvidenceEventIds: readonly string[];
  withheldReasons: readonly string[];
}>;

export function adaptProjectAssessmentToLearningEvidence(
  submission: ProjectLabSubmission,
  engineering: ProjectEngineeringEvidence,
): ProjectLearningEvidenceAdaptation {
  const attribution = submission.attribution;
  const withheldReasons: string[] = [];

  if (engineering.overallStatus.toLowerCase() !== 'passed') {
    withheldReasons.push('engineering_verification_not_passed');
  }
  if (!attribution?.verified) {
    withheldReasons.push('learner_attribution_not_verified');
  }
  if (!attribution?.independent) {
    withheldReasons.push('independent_completion_not_verified');
  }
  if (!attribution || attribution.aiAssistance === 'substantial' || attribution.aiAssistance === 'unknown') {
    withheldReasons.push('ai_assistance_too_high_or_unknown');
  }
  if (attribution && attribution.highestHintLevel > 2) {
    withheldReasons.push('hint_level_exceeds_independent_threshold');
  }

  const traceId = `project-lab:${submission.id}:${engineering.assessmentId}`;
  const traceEvent: EvidenceEvent = {
    contractVersion: EVIDENCE_EVENT_CONTRACT_VERSION,
    id: `${traceId}:engineering`,
    learnerId: submission.learnerId,
    skillId: submission.skillIds[0] ?? 'legacy.unmapped',
    taskId: submission.learningTaskId,
    domain: domainFromSkill(submission.skillIds[0] ?? ''),
    activityType: 'project',
    evidenceType: 'tool_trace',
    traceRef: traceId,
    result: 'project_assessment',
    provenance: {
      source: 'ai-engineering-project-os',
      sourceId: engineering.assessmentId,
      adapter: 'ProjectLabEvidenceAdapter',
    },
    metadata: {
      projectId: engineering.projectId,
      repositoryUrl: engineering.repositoryUrl,
      commitSha: engineering.commitSha ?? null,
      overallStatus: engineering.overallStatus,
      passRate: engineering.passRate,
      readOnlyAssessment: true,
      learningEvidenceWithheld: withheldReasons.length > 0,
      withheldReasons,
    },
    createdAt: submission.submittedAt,
  };

  if (withheldReasons.length > 0) {
    return {
      events: [traceEvent],
      learningEvidenceEventIds: [],
      withheldReasons,
    };
  }

  const score = Math.max(0, Math.min(1, engineering.passRate));
  const capabilityEvents = submission.skillIds.map((skillId, index): EvidenceEvent => ({
    contractVersion: EVIDENCE_EVENT_CONTRACT_VERSION,
    id: `${traceId}:skill:${index}:${skillId}`,
    learnerId: submission.learnerId,
    skillId,
    taskId: submission.learningTaskId,
    domain: domainFromSkill(skillId),
    activityType: 'project',
    evidenceType: 'project_verification',
    score,
    passed: true,
    independent: true,
    hintLevel: attribution!.highestHintLevel,
    artifactRef: engineering.repositoryUrl,
    traceRef: traceId,
    result: 'verified_project_submission',
    provenance: {
      source: 'ai-engineering-project-os',
      sourceId: engineering.assessmentId,
      adapter: 'ProjectLabEvidenceAdapter',
    },
    metadata: {
      projectId: engineering.projectId,
      commitSha: engineering.commitSha ?? null,
      learnerAttributionVerified: true,
      attributionSource: attribution!.source,
      aiAssistance: attribution!.aiAssistance,
      explanationScore: attribution!.explanationScore ?? null,
      defenseScore: attribution!.defenseScore ?? null,
      engineeringPassRate: engineering.passRate,
    },
    createdAt: submission.submittedAt,
  }));

  return {
    events: [traceEvent, ...capabilityEvents],
    learningEvidenceEventIds: capabilityEvents.map((event) => event.id),
    withheldReasons: [],
  };
}

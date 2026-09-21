import type {
  ProjectLabCriterion,
  ProjectLabEvaluationResult,
  ProjectLabSubmission,
} from '../../contracts/project-lab';
import type { EvidenceStore } from '../../packages/evidence/evidence-store';
import {
  adaptProjectAssessmentToLearningEvidence,
  normalizeProjectEngineeringEvidence,
} from './evidence-adapter';
import type { ProjectOsClient } from './project-os-client';

export class ProjectLabGateway {
  constructor(
    readonly projectOs: ProjectOsClient,
    readonly evidence: EvidenceStore,
  ) {}

  async evaluateSubmission(
    submission: ProjectLabSubmission,
    criteria: readonly ProjectLabCriterion[],
  ): Promise<ProjectLabEvaluationResult> {
    if (!submission.repositoryUrl.trim()) throw new Error('Project repository URL is required');
    if (submission.skillIds.length === 0) throw new Error('At least one skill ID is required');

    // Deliberately no execute/modify call exists in this gateway.
    const imported = await this.projectOs.importRepository(submission.repositoryUrl);
    const audit = await this.projectOs.auditProject(imported.project_id);
    const assessment = await this.projectOs.assessProject(
      imported.project_id,
      submission.skillIds,
      criteria,
    );

    if (!assessment.read_only || assessment.repository_mutated) {
      throw new Error('Project OS violated the read-only Project Lab contract');
    }

    const engineeringEvidence = normalizeProjectEngineeringEvidence(
      submission,
      imported.project_id,
      audit,
      assessment,
    );
    const adapted = adaptProjectAssessmentToLearningEvidence(submission, engineeringEvidence);

    this.evidence.appendMany(adapted.events);

    return {
      submissionId: submission.id,
      projectId: imported.project_id,
      engineeringEvidence,
      learningEvidenceEventIds: adapted.learningEvidenceEventIds,
      learningEvidenceWithheld: adapted.withheldReasons.length > 0,
      withheldReasons: adapted.withheldReasons,
    };
  }
}

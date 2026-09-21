export const PROJECT_LAB_CONTRACT_VERSION = 1 as const;

export const PROJECT_OS_EVIDENCE_TYPES = ['code', 'test', 'run_result', 'benchmark', 'config'] as const;
export type ProjectOsEvidenceType = (typeof PROJECT_OS_EVIDENCE_TYPES)[number];

export type ProjectLabCriterion = Readonly<{
  criterion: string;
  evidenceType: ProjectOsEvidenceType;
  verificationMethod: string;
}>;

export const AI_ASSISTANCE_LEVELS = ['none', 'limited', 'substantial', 'unknown'] as const;
export type AiAssistanceLevel = (typeof AI_ASSISTANCE_LEVELS)[number];

export type ProjectLearningAttribution = Readonly<{
  verified: boolean;
  independent: boolean;
  aiAssistance: AiAssistanceLevel;
  highestHintLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  source: 'activity-trace' | 'technical-defense' | 'manual-review' | 'unknown';
  explanationScore?: number;
  defenseScore?: number;
}>;

export type ProjectLabSubmission = Readonly<{
  id: string;
  learnerId: string;
  learningTaskId: string;
  skillIds: readonly string[];
  repositoryUrl: string;
  submittedAt: string;
  attribution?: ProjectLearningAttribution;
}>;

export type ProjectOsImportResult = Readonly<{
  project_id: string;
  name: string;
  status: string;
  workspace_path?: string;
  commit_sha?: string | null;
}>;

export type ProjectOsAuditResult = Readonly<{
  project_id: string;
  project_facts?: Readonly<Record<string, unknown>>;
  maturity_assessment?: Readonly<Record<string, unknown>>;
  gaps?: readonly Readonly<Record<string, unknown>>[];
  raw_observations?: readonly unknown[];
}>;

export type ProjectOsVerificationItem = Readonly<{
  criterion: string;
  status: 'passed' | 'partial' | 'failed' | 'unverifiable' | string;
  evidence: readonly Readonly<Record<string, unknown>>[];
  details: string;
}>;

export type ProjectOsAssessmentResult = Readonly<{
  assessment_id: string;
  project_id: string;
  skill_ids: readonly string[];
  read_only: boolean;
  repository_mutated: boolean;
  source_snapshot?: Readonly<{
    snapshot_id?: string | null;
    commit_sha?: string | null;
    branch?: string | null;
  }>;
  verification: Readonly<{
    task_id: string;
    verification_results: readonly ProjectOsVerificationItem[];
    overall_status: string;
    missing_evidence?: readonly Readonly<Record<string, unknown>>[];
    recommendations?: readonly string[];
  }>;
  summary: Readonly<{
    total: number;
    passed: number;
    partial: number;
    failed: number;
    pass_rate: number;
  }>;
}>;

export type ProjectEngineeringEvidence = Readonly<{
  projectId: string;
  assessmentId: string;
  repositoryUrl: string;
  commitSha?: string | null;
  overallStatus: string;
  passRate: number;
  verificationResults: readonly ProjectOsVerificationItem[];
  maturityAssessment?: Readonly<Record<string, unknown>>;
  gaps?: readonly Readonly<Record<string, unknown>>[];
}>;

export type ProjectLabEvaluationResult = Readonly<{
  submissionId: string;
  projectId: string;
  engineeringEvidence: ProjectEngineeringEvidence;
  learningEvidenceEventIds: readonly string[];
  learningEvidenceWithheld: boolean;
  withheldReasons: readonly string[];
}>;

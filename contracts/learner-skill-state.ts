export const LEARNER_SKILL_STATE_CONTRACT_VERSION = 1 as const;

export type LearnerSkillState = Readonly<{
  contractVersion: typeof LEARNER_SKILL_STATE_CONTRACT_VERSION;
  learnerId: string;
  skillId: string;

  mastery: number;
  uncertainty: number;

  conceptScore: number;
  implementationScore: number;
  debuggingScore: number;

  independentSuccess: number;
  hintDependency: number;

  transferScore: number;
  retentionScore: number;

  evidenceCount: number;
  misconceptionTags: readonly string[];

  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
}>;

export function emptyLearnerSkillState(
  learnerId: string,
  skillId: string,
  updatedAt = new Date(0).toISOString(),
): LearnerSkillState {
  return {
    contractVersion: LEARNER_SKILL_STATE_CONTRACT_VERSION,
    learnerId,
    skillId,
    mastery: 0,
    uncertainty: 1,
    conceptScore: 0,
    implementationScore: 0,
    debuggingScore: 0,
    independentSuccess: 0,
    hintDependency: 0,
    transferScore: 0,
    retentionScore: 0,
    evidenceCount: 0,
    misconceptionTags: [],
    lastPracticedAt: null,
    nextReviewAt: null,
    updatedAt,
  };
}

export function validateLearnerSkillState(state: LearnerSkillState): LearnerSkillState {
  const bounded = [
    state.mastery,
    state.uncertainty,
    state.conceptScore,
    state.implementationScore,
    state.debuggingScore,
    state.independentSuccess,
    state.hintDependency,
    state.transferScore,
    state.retentionScore,
  ];
  if (bounded.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error('LearnerSkillState scores must be finite values between 0 and 1');
  }
  if (!Number.isInteger(state.evidenceCount) || state.evidenceCount < 0) {
    throw new Error('LearnerSkillState.evidenceCount must be a non-negative integer');
  }
  return state;
}

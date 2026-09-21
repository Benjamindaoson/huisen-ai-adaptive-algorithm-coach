import type { AdaptiveDecision, LearningActionType } from '../../contracts/adaptive-learning';
import type { LearnerSkillState } from '../../contracts/learner-skill-state';
import type { EvidenceDimension, SkillNode } from '../../contracts/skill-node';

export type AdaptivePolicyInput = Readonly<{
  skill: SkillNode;
  state: LearnerSkillState;
  prerequisitesSatisfied: boolean;
  goalRelevance?: number;
}>;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreForDimension(state: LearnerSkillState, dimension: EvidenceDimension): number {
  switch (dimension) {
    case 'concept': return state.conceptScore;
    case 'implementation': return state.implementationScore;
    case 'debugging': return state.debuggingScore;
    case 'independence': return state.independentSuccess;
    case 'transfer': return state.transferScore;
    case 'retention': return state.retentionScore;
  }
}

function actionForDimension(dimension: EvidenceDimension): LearningActionType {
  switch (dimension) {
    case 'concept': return 'teach';
    case 'implementation':
    case 'independence': return 'practice';
    case 'debugging': return 'debug';
    case 'transfer': return 'transfer';
    case 'retention': return 'retest';
  }
}

export class DeterministicAdaptivePolicy {
  decide(input: AdaptivePolicyInput): AdaptiveDecision {
    const { skill, state } = input;
    const goalRelevance = clamp01(input.goalRelevance ?? 1);

    if (!input.prerequisitesSatisfied) {
      return {
        skillId: skill.id,
        actionType: 'teach',
        reason: 'A prerequisite skill still needs verified evidence.',
        priority: 1,
        difficulty: Math.max(1, skill.difficulty - 1) as 1 | 2 | 3 | 4 | 5,
        maxHintLevel: 4,
        evidenceRequired: ['prerequisite mastery'],
      };
    }

    if (state.evidenceCount === 0) {
      return {
        skillId: skill.id,
        actionType: 'teach',
        reason: 'No evidence exists for this skill yet.',
        priority: goalRelevance,
        difficulty: skill.difficulty,
        maxHintLevel: 4,
        evidenceRequired: ['concept'],
      };
    }

    for (const requirement of skill.evidenceRequirements) {
      const threshold = requirement.minimumScore ?? 0.7;
      const current = scoreForDimension(state, requirement.dimension);
      if (current < threshold) {
        const gap = threshold - current;
        return {
          skillId: skill.id,
          actionType: actionForDimension(requirement.dimension),
          reason: `${requirement.dimension} evidence is below the required threshold (${current.toFixed(2)} < ${threshold.toFixed(2)}).`,
          priority: clamp01(
            0.30 * goalRelevance +
            0.30 * gap +
            0.20 * state.uncertainty +
            0.10 * state.hintDependency +
            0.10
          ),
          difficulty: skill.difficulty,
          maxHintLevel: requirement.dimension === 'independence' || requirement.mustBeIndependent ? 2 : 4,
          evidenceRequired: [requirement.dimension],
        };
      }

      if (requirement.mustBeIndependent && state.independentSuccess < threshold) {
        return {
          skillId: skill.id,
          actionType: 'practice',
          reason: 'Successful evidence exists, but independent evidence is still too weak.',
          priority: clamp01(0.5 + state.uncertainty * 0.3 + state.hintDependency * 0.2),
          difficulty: skill.difficulty,
          maxHintLevel: 2,
          evidenceRequired: ['independence'],
        };
      }
    }

    return {
      skillId: skill.id,
      actionType: 'project',
      reason: 'Required concept, implementation, transfer, retention, and independence evidence are satisfied.',
      priority: clamp01(0.4 + goalRelevance * 0.4 + state.uncertainty * 0.2),
      difficulty: skill.difficulty,
      maxHintLevel: 2,
      evidenceRequired: ['project verification'],
    };
  }
}

import type { AdaptiveDecision } from '../../contracts/adaptive-learning';
import type { EvidenceEvent } from '../../contracts/evidence-event';
import type { LearnerSkillState } from '../../contracts/learner-skill-state';
import type { SkillNode } from '../../contracts/skill-node';
import { DeterministicAdaptivePolicy } from '../adaptive-policy/deterministic-policy';
import { InMemoryEvidenceStore, type EvidenceStore } from '../evidence/evidence-store';
import { LearnerModelUpdater } from '../learner-model/learner-model-updater';

export class AdaptiveLearningLoop {
  constructor(
    readonly skills: readonly SkillNode[],
    readonly evidence: EvidenceStore = new InMemoryEvidenceStore(),
    readonly updater = new LearnerModelUpdater(),
    readonly policy = new DeterministicAdaptivePolicy(),
  ) {}

  getSkill(skillId: string): SkillNode {
    const skill = this.skills.find((candidate) => candidate.id === skillId);
    if (!skill) throw new Error(`Unknown skill: ${skillId}`);
    return skill;
  }

  state(learnerId: string, skillId: string): LearnerSkillState {
    return this.updater.project(learnerId, skillId, this.evidence.list({ learnerId, skillId }));
  }

  prerequisitesSatisfied(learnerId: string, skill: SkillNode): boolean {
    return skill.prerequisites.every((prerequisiteId) => this.state(learnerId, prerequisiteId).mastery >= 0.7);
  }

  decide(learnerId: string, skillId: string, goalRelevance = 1): AdaptiveDecision {
    const skill = this.getSkill(skillId);
    return this.policy.decide({
      skill,
      state: this.state(learnerId, skillId),
      prerequisitesSatisfied: this.prerequisitesSatisfied(learnerId, skill),
      goalRelevance,
    });
  }

  recordAndDecide(event: EvidenceEvent, goalRelevance = 1): {
    state: LearnerSkillState;
    decision: AdaptiveDecision;
  } {
    this.evidence.append(event);
    return {
      state: this.state(event.learnerId, event.skillId),
      decision: this.decide(event.learnerId, event.skillId, goalRelevance),
    };
  }
}

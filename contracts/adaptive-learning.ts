export const LEARNING_ACTION_TYPES = [
  'teach',
  'practice',
  'debug',
  'experiment',
  'project',
  'transfer',
  'retest',
] as const;
export type LearningActionType = (typeof LEARNING_ACTION_TYPES)[number];

export type LearningTask = Readonly<{
  id: string;
  skillId: string;
  actionType: LearningActionType;
  title: string;
  objective: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  maxHintLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  evidenceRequired: readonly string[];
}>;

export type AdaptiveDecision = Readonly<{
  skillId: string;
  actionType: LearningActionType;
  reason: string;
  priority: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  maxHintLevel: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  evidenceRequired: readonly string[];
}>;

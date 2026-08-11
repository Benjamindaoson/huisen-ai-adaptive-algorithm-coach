import type { AttemptOutcome, PracticeAttempt } from './practice';
import { inferProblemSkills, OD_SKILLS, type SkillId } from './skills';
import type { LearningEvent } from './learner-memory';
import { isAssistedPass } from './learning-evidence';

export type MasteryProblem = { id: string; title: string; excerpt?: string; searchText: string };
export type MasteryErrorKind = Exclude<AttemptOutcome, 'executed' | 'passed'>;

export type SkillMastery = {
  skillId: SkillId;
  score: number;
  confidence: number;
  evidenceCount: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  recentErrorKinds: MasteryErrorKind[];
};

const INITIAL_SCORE = 0.25;
const DAY_MS = 24 * 60 * 60 * 1_000;

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function reviewDays(score: number, evidenceCount: number, passed: boolean): number {
  if (!passed || evidenceCount < 2) return 1;
  if (score >= 0.8) return 14;
  if (score >= 0.65) return 7;
  if (score >= 0.5) return 3;
  return 1;
}

export function deriveMastery(attempts: PracticeAttempt[], problems: MasteryProblem[], events: LearningEvent[] = []): SkillMastery[] {
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const state = new Map<SkillId, SkillMastery>(OD_SKILLS.map((skill) => [skill.id, {
    skillId: skill.id,
    score: INITIAL_SCORE,
    confidence: 0,
    evidenceCount: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    recentErrorKinds: [],
  }]));

  const evidence = attempts
    .filter((attempt) => attempt.mode === 'sample-submit')
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));

  for (const attempt of evidence) {
    const problem = problemById.get(attempt.problemId);
    if (!problem) continue;
    const successful = attempt.outcome === 'passed';
    const assisted = successful && isAssistedPass(attempt, attempts, events);
    const passed = successful && !assisted;
    for (const skillId of inferProblemSkills(problem)) {
      const current = state.get(skillId)!;
      const evidenceCount = current.evidenceCount + 1;
      const score = assisted ? current.score : rounded(passed ? current.score + (1 - current.score) * 0.35 : current.score * 0.82);
      const errorKinds = successful
        ? current.recentErrorKinds
        : [...current.recentErrorKinds, attempt.outcome as MasteryErrorKind].slice(-3);
      const practicedAt = new Date(attempt.createdAt);
      state.set(skillId, {
        skillId,
        score,
        confidence: rounded(Math.min(0.95, 1 - Math.exp(-evidenceCount / 3))),
        evidenceCount,
        lastPracticedAt: practicedAt.toISOString(),
        nextReviewAt: new Date(practicedAt.getTime() + reviewDays(score, evidenceCount, passed) * DAY_MS).toISOString(),
        recentErrorKinds: errorKinds,
      });
    }
  }

  return OD_SKILLS.map((skill) => state.get(skill.id)!);
}

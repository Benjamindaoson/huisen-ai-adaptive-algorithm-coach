import type { SkillMastery } from './mastery';
import type { PracticeAttempt } from './practice';
import type { ProgressState } from './progress';
import { getSkill, inferProblemSkills, type SkillId } from './skills';

export type DailyPlanKind = 'review' | 'weakness' | 'transfer' | 'baseline';
export type PlanProblem = {
  id: string;
  title: string;
  excerpt?: string;
  searchText: string;
  completeness?: 'complete' | 'index-only';
  languages?: unknown[];
};

export type DailyPlanItem = {
  kind: DailyPlanKind;
  problemId: string;
  title: string;
  skillId: SkillId;
  reason: string;
};

type BuildPlanInput = {
  catalog: PlanProblem[];
  mastery: SkillMastery[];
  attempts: PracticeAttempt[];
  progress: ProgressState;
  now?: Date;
};

export function buildDailyPlan({ catalog, mastery, attempts, progress, now = new Date() }: BuildPlanInput): DailyPlanItem[] {
  const available = catalog.filter((problem) =>
    progress.problems[problem.id]?.status !== 'mastered' &&
    problem.completeness !== 'index-only' &&
    (problem.languages === undefined || problem.languages.length > 0));
  const selected = new Set<string>();
  const result: DailyPlanItem[] = [];
  const attemptedIds = new Set(attempts.map((attempt) => attempt.problemId));

  function candidates(skillId: SkillId): PlanProblem[] {
    return available.filter((problem) => !selected.has(problem.id) && inferProblemSkills(problem).includes(skillId));
  }

  function add(problem: PlanProblem | undefined, skillId: SkillId, kind: DailyPlanKind, reason: string): boolean {
    if (!problem || selected.has(problem.id) || result.length >= 3) return false;
    selected.add(problem.id);
    result.push({ kind, problemId: problem.id, title: problem.title, skillId, reason });
    return true;
  }

  const hasEvidence = mastery.some((item) => item.evidenceCount > 0);
  if (!hasEvidence) {
    for (const problem of available.slice(0, 3)) {
      const skillId = inferProblemSkills(problem)[0];
      add(problem, skillId, 'baseline', `先完成一道${getSkill(skillId).title}基线题，用真实提交建立你的能力起点。`);
    }
    return result;
  }

  const due = mastery
    .filter((item) => item.evidenceCount > 0 && item.nextReviewAt && Date.parse(item.nextReviewAt) <= now.getTime())
    .sort((left, right) => Date.parse(left.nextReviewAt!) - Date.parse(right.nextReviewAt!));

  for (const item of due) {
    const latestRelevantAttempt = [...attempts]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .find((attempt) => {
        const problem = catalog.find((candidate) => candidate.id === attempt.problemId);
        return problem && progress.problems[problem.id]?.status !== 'mastered' && !selected.has(problem.id) && inferProblemSkills(problem).includes(item.skillId);
      });
    const preferred = latestRelevantAttempt ? available.find((problem) => problem.id === latestRelevantAttempt.problemId) : undefined;
    if (add(preferred ?? candidates(item.skillId)[0], item.skillId, 'review', `${getSkill(item.skillId).title}复习已到期；先验证上次错因是否真正消失。`)) break;
  }

  const weakSkills = mastery
    .filter((item) => item.evidenceCount > 0)
    .sort((left, right) => left.score - right.score || left.confidence - right.confidence);
  for (const item of weakSkills) {
    const skillCandidates = candidates(item.skillId);
    const problem = skillCandidates.find((candidate) => !attemptedIds.has(candidate.id)) ?? skillCandidates[0];
    if (add(problem, item.skillId, 'weakness', `${getSkill(item.skillId).title}当前掌握度 ${Math.round(item.score * 100)}%，用一道不同题巩固薄弱点。`)) break;
  }

  const unexploredSkills = mastery.filter((item) => item.evidenceCount === 0);
  for (const item of unexploredSkills) {
    if (add(candidates(item.skillId)[0], item.skillId, 'transfer', `${getSkill(item.skillId).title}尚无提交证据，用迁移题补齐能力图。`)) break;
  }

  for (const problem of available) {
    if (result.length >= 3) break;
    const skillId = inferProblemSkills(problem)[0];
    add(problem, skillId, 'baseline', `补充一道${getSkill(skillId).title}基线题，增加推荐所需的真实证据。`);
  }
  return result;
}

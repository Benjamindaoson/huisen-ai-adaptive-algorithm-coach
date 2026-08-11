import type { AttemptOutcome, PracticeAttempt } from './practice';
import { inferProblemSkills, type SkillId } from './skills';

type ReviewOutcome = Extract<AttemptOutcome, 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout'>;

export type ReviewProblem = {
  id: string;
  title: string;
  excerpt?: string;
  searchText: string;
  completeness?: 'complete' | 'index-only';
  languages?: unknown[];
};

export type MistakeReviewCard = {
  attemptId: string;
  problemId: string;
  title: string;
  language: PracticeAttempt['language'];
  outcome: ReviewOutcome;
  summary: string;
  skills: SkillId[];
  createdAt: string;
  reviewAt: string;
  due: boolean;
};

const REVIEWABLE_OUTCOMES: ReviewOutcome[] = ['wrong-answer', 'compile-error', 'runtime-error', 'timeout'];
const DAY_MS = 24 * 60 * 60 * 1_000;

export function buildMistakeReviewCards(
  attempts: PracticeAttempt[],
  catalog: ReviewProblem[],
  now = new Date(),
): MistakeReviewCard[] {
  const latestByStream = new Map<string, PracticeAttempt>();
  const ordered = [...attempts]
    .filter((attempt) => attempt.mode === 'sample-submit')
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  for (const attempt of ordered) latestByStream.set(`${attempt.problemId}:${attempt.language}`, attempt);

  const problemById = new Map(catalog.map((problem) => [problem.id, problem]));
  const cards: MistakeReviewCard[] = [];
  for (const attempt of latestByStream.values()) {
    if (!REVIEWABLE_OUTCOMES.includes(attempt.outcome as ReviewOutcome)) continue;
    const problem = problemById.get(attempt.problemId);
    if (!problem || problem.completeness === 'index-only' || (problem.languages !== undefined && problem.languages.length === 0)) continue;
    const reviewAt = new Date(Date.parse(attempt.createdAt) + DAY_MS).toISOString();
    cards.push({
      attemptId: attempt.id,
      problemId: problem.id,
      title: problem.title,
      language: attempt.language,
      outcome: attempt.outcome as ReviewOutcome,
      summary: attempt.summary,
      skills: inferProblemSkills(problem),
      createdAt: attempt.createdAt,
      reviewAt,
      due: Date.parse(reviewAt) <= now.getTime(),
    });
  }

  return cards.sort((left, right) => Number(right.due) - Number(left.due) || Date.parse(left.reviewAt) - Date.parse(right.reviewAt));
}

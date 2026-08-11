import type { LearningEvent } from './learner-memory';
import type { PracticeAttempt } from './practice';

const INTERVENTIONS = new Set<LearningEvent['kind']>(['hint-received', 'reference-unlocked']);

export function interventionForPass(
  pass: PracticeAttempt,
  attempts: PracticeAttempt[],
  events: LearningEvent[],
): LearningEvent | null {
  if (pass.mode !== 'sample-submit' || pass.outcome !== 'passed') return null;
  const passTime = Date.parse(pass.createdAt);
  const previousPassTime = attempts
    .filter((attempt) => attempt.id !== pass.id && attempt.problemId === pass.problemId &&
      attempt.mode === 'sample-submit' && attempt.outcome === 'passed' && Date.parse(attempt.createdAt) < passTime)
    .reduce((latest, attempt) => Math.max(latest, Date.parse(attempt.createdAt)), Number.NEGATIVE_INFINITY);
  return [...events]
    .filter((event) => event.problemId === pass.problemId && INTERVENTIONS.has(event.kind) &&
      Date.parse(event.createdAt) <= passTime && Date.parse(event.createdAt) > previousPassTime)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null;
}

export function isAssistedPass(pass: PracticeAttempt, attempts: PracticeAttempt[], events: LearningEvent[]): boolean {
  return interventionForPass(pass, attempts, events) !== null;
}

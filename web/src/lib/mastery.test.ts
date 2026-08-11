import { describe, expect, it } from 'vitest';
import type { PracticeAttempt } from './practice';
import { deriveMastery } from './mastery';
import type { LearningEvent } from './learner-memory';

const problems = [{ id: 'od-array', title: '数组排序', searchText: '数组 排序' }];

function submission(id: string, outcome: PracticeAttempt['outcome'], createdAt: string): PracticeAttempt {
  return { id, problemId: 'od-array', language: 'python', mode: 'sample-submit', codeSnapshot: 'code', outcome, summary: outcome, createdAt };
}

describe('deriveMastery', () => {
  it('raises score and confidence after a passed sample submission', () => {
    const mastery = deriveMastery([submission('a', 'passed', '2026-08-11T01:00:00Z')], problems);
    const array = mastery.find((item) => item.skillId === 'array')!;
    expect(array.score).toBeGreaterThan(0.25);
    expect(array.confidence).toBeGreaterThan(0);
    expect(array.evidenceCount).toBe(1);
    expect(array.nextReviewAt).toBe('2026-08-12T01:00:00.000Z');
  });

  it('lowers an existing score and records the error kind after failure', () => {
    const mastery = deriveMastery([
      submission('a', 'passed', '2026-08-11T01:00:00Z'),
      submission('b', 'wrong-answer', '2026-08-11T02:00:00Z'),
    ], problems);
    const array = mastery.find((item) => item.skillId === 'array')!;
    expect(array.score).toBeLessThan(0.52);
    expect(array.recentErrorKinds).toContain('wrong-answer');
    expect(array.nextReviewAt).toBe('2026-08-12T02:00:00.000Z');
  });

  it('sorts attempt evidence chronologically for deterministic results', () => {
    const early = submission('a', 'wrong-answer', '2026-08-11T01:00:00Z');
    const late = submission('b', 'passed', '2026-08-11T02:00:00Z');
    expect(deriveMastery([late, early], problems)).toEqual(deriveMastery([early, late], problems));
  });

  it('does not treat a custom run as mastery evidence', () => {
    const run = { ...submission('a', 'executed', '2026-08-11T01:00:00Z'), mode: 'run' as const };
    const array = deriveMastery([run], problems).find((item) => item.skillId === 'array')!;
    expect(array).toMatchObject({ score: 0.25, confidence: 0, evidenceCount: 0, lastPracticedAt: null });
  });

  it('does not raise mastery for a pass assisted earlier in the same solve session', () => {
    const pass = submission('pass-after-hint', 'passed', '2026-08-11T02:00:00Z');
    const hint: LearningEvent = {
      id: 'hint-a', learnerId: 'learner-a', kind: 'hint-received', problemId: 'od-array', attemptId: 'failed-before-hint',
      data: { hintLevel: 2 }, createdAt: '2026-08-11T01:30:00Z',
    };
    const array = deriveMastery([pass], problems, [hint]).find((item) => item.skillId === 'array')!;
    expect(array.score).toBe(0.25);
    expect(array.evidenceCount).toBe(1);
    expect(array.recentErrorKinds).toEqual([]);
  });
});

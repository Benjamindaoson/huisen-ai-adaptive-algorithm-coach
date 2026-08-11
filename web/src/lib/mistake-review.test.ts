import { describe, expect, it } from 'vitest';
import type { PracticeAttempt } from './practice';
import { buildMistakeReviewCards } from './mistake-review';

const catalog = [
  { id: 'p1', title: '数组排序', excerpt: '对数组排序', searchText: '数组排序', completeness: 'complete' as const, languages: ['python'] },
  { id: 'p2', title: '残缺题', searchText: '数组', completeness: 'index-only' as const, languages: ['python'] },
];

function attempt(id: string, problemId: string, outcome: PracticeAttempt['outcome'], createdAt: string, language: PracticeAttempt['language'] = 'python'): PracticeAttempt {
  return { id, problemId, language, mode: 'sample-submit', codeSnapshot: `code-${id}`, outcome, summary: outcome, createdAt };
}

describe('buildMistakeReviewCards', () => {
  it('creates a review card from the latest unresolved failed submission', () => {
    const cards = buildMistakeReviewCards([
      attempt('a', 'p1', 'compile-error', '2026-08-10T01:00:00Z'),
      attempt('b', 'p1', 'wrong-answer', '2026-08-10T02:00:00Z'),
    ], catalog, new Date('2026-08-12T00:00:00Z'));

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ problemId: 'p1', attemptId: 'b', outcome: 'wrong-answer', due: true });
    expect(cards[0].skills).toContain('array');
  });

  it('removes a stream after a later passing submission resolves it', () => {
    const cards = buildMistakeReviewCards([
      attempt('a', 'p1', 'wrong-answer', '2026-08-10T01:00:00Z'),
      attempt('b', 'p1', 'passed', '2026-08-10T02:00:00Z'),
    ], catalog);
    expect(cards).toEqual([]);
  });

  it('keeps languages as separate review streams', () => {
    const cards = buildMistakeReviewCards([
      attempt('a', 'p1', 'wrong-answer', '2026-08-10T01:00:00Z', 'python'),
      attempt('b', 'p1', 'passed', '2026-08-10T02:00:00Z', 'java'),
    ], catalog);
    expect(cards.map((card) => card.language)).toEqual(['python']);
  });

  it('does not create review work from infrastructure failure or incomplete content', () => {
    const cards = buildMistakeReviewCards([
      attempt('a', 'p1', 'unavailable', '2026-08-10T01:00:00Z'),
      attempt('b', 'p2', 'wrong-answer', '2026-08-10T02:00:00Z'),
    ], catalog);
    expect(cards).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { retrieveLearningEvidence } from './learning-retrieval.js';

const items = [
  { ref: 'problem:array', kind: 'problem' as const, title: '滑动窗口数组题', text: '使用双指针维护连续数组窗口', skillIds: ['array'], verification: 'candidate' as const },
  { ref: 'solution:verified-window', kind: 'solution' as const, title: '已验证滑动窗口解法', text: '双指针维护窗口并检查边界', skillIds: ['array'], verification: 'verified' as const },
  { ref: 'solution:unverified-window', kind: 'solution' as const, title: '未验证滑动窗口解法', text: '双指针维护窗口并检查边界', skillIds: ['array'], verification: 'unverified' as const },
  { ref: 'event:hash', kind: 'learner-event' as const, title: '哈希错误', text: '键值计数错误', skillIds: ['hash'], verification: 'verified' as const },
];

describe('retrieveLearningEvidence', () => {
  it('combines lexical and skill relevance and returns stable cited evidence', () => {
    const result = retrieveLearningEvidence({ text: '数组滑动窗口边界', skillIds: ['array'] }, items, { limit: 3, excerptCharacters: 18 });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ ref: 'solution:verified-window', verification: 'verified' });
    expect(result.every((item) => item.ref && item.score > 0 && item.excerpt.length <= 19)).toBe(true);
  });

  it('prefers verified evidence when relevance is otherwise equal', () => {
    const result = retrieveLearningEvidence({ text: '双指针维护窗口检查边界', skillIds: ['array'] }, items.slice(1, 3));
    expect(result.map((item) => item.ref)).toEqual(['solution:verified-window', 'solution:unverified-window']);
  });

  it('respects result limits and excludes unrelated zero-score evidence', () => {
    const result = retrieveLearningEvidence({ text: '数组', skillIds: ['array'] }, items, { limit: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].ref).not.toBe('event:hash');
  });
});

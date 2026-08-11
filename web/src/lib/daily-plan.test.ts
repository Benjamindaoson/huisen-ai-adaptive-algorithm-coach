import { describe, expect, it } from 'vitest';
import { buildDailyPlan } from './daily-plan';
import { deriveMastery } from './mastery';
import type { PracticeAttempt } from './practice';
import { emptyProgress, updateProgress } from './progress';

const catalog = [
  { id: 'p1', title: '数组排序入门', searchText: '数组 排序' },
  { id: 'p2', title: '数组双指针', searchText: '数组 双指针' },
  { id: 'p3', title: '图的广度遍历', searchText: '图 BFS 遍历' },
  { id: 'p4', title: '规则模拟', searchText: '模拟 规则' },
];

const failedAttempt: PracticeAttempt = {
  id: 'a', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'code',
  outcome: 'wrong-answer', summary: '0/1', createdAt: '2026-08-09T01:00:00Z',
};

describe('buildDailyPlan', () => {
  it('prioritizes a due review and gives a concrete reason', () => {
    const mastery = deriveMastery([failedAttempt], catalog);
    const plan = buildDailyPlan({ catalog, mastery, attempts: [failedAttempt], progress: emptyProgress(), now: new Date('2026-08-11T00:00:00Z') });

    expect(plan[0]).toMatchObject({ kind: 'review', problemId: 'p1' });
    expect(plan[0].reason).toContain('到期');
  });

  it('uses unique problems and includes weak-skill practice', () => {
    const mastery = deriveMastery([failedAttempt], catalog);
    const plan = buildDailyPlan({ catalog, mastery, attempts: [failedAttempt], progress: emptyProgress(), now: new Date('2026-08-11T00:00:00Z') });

    expect(new Set(plan.map((item) => item.problemId)).size).toBe(plan.length);
    expect(plan.some((item) => item.kind === 'weakness' && item.problemId === 'p2')).toBe(true);
  });

  it('does not recommend a problem marked as mastered', () => {
    const progress = updateProgress(emptyProgress(), 'p1', { status: 'mastered' });
    const mastery = deriveMastery([failedAttempt], catalog);
    const plan = buildDailyPlan({ catalog, mastery, attempts: [failedAttempt], progress, now: new Date('2026-08-11T00:00:00Z') });
    expect(plan.some((item) => item.problemId === 'p1')).toBe(false);
  });

  it('labels cold-start recommendations as baseline diagnosis', () => {
    const plan = buildDailyPlan({ catalog, mastery: deriveMastery([], catalog), attempts: [], progress: emptyProgress(), now: new Date('2026-08-11T00:00:00Z') });
    expect(plan).toHaveLength(3);
    expect(plan[0].kind).toBe('baseline');
    expect(plan[0].reason).toContain('基线');
  });

  it('never recommends index-only or non-runnable catalog entries', () => {
    const qualityCatalog = [
      { id: 'bad-index', title: '数组索引', searchText: '数组', completeness: 'index-only' as const, languages: ['python'] },
      { id: 'bad-code', title: '数组无代码', searchText: '数组', completeness: 'complete' as const, languages: [] },
      { id: 'good', title: '数组可练习题', searchText: '数组', completeness: 'complete' as const, languages: ['python'] },
    ];
    const plan = buildDailyPlan({ catalog: qualityCatalog, mastery: deriveMastery([], qualityCatalog), attempts: [], progress: emptyProgress() });
    expect(plan.map((item) => item.problemId)).toEqual(['good']);
  });
});

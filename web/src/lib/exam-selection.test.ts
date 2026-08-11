import { describe, expect, it } from 'vitest';
import type { CatalogProblem } from './catalog';
import { selectExamProblems } from './exam-selection';

function problem(id: string, patch: Partial<CatalogProblem> = {}): CatalogProblem {
  return {
    id,
    title: id,
    collection: 'OD',
    score: 100,
    tags: [],
    languages: ['python'],
    completeness: 'complete',
    sourcePaths: [],
    duplicateCount: 1,
    excerpt: '数组与排序',
    searchText: id,
    ...patch,
  };
}

describe('exam selection', () => {
  it('only selects complete problems with runnable languages', () => {
    const result = selectExamProblems([
      problem('good'),
      problem('index', { completeness: 'index-only' }),
      problem('no-code', { languages: [] }),
      problem('good-2', { score: 200 }),
    ], 3);
    expect(result.map((item) => item.id)).toEqual(['good', 'good-2']);
  });

  it('is deterministic and prefers different skill evidence', () => {
    const catalog = [
      problem('array-a', { excerpt: '数组 排序' }),
      problem('array-b', { excerpt: '数组 排序' }),
      problem('graph', { excerpt: '图 最短路径' }),
      problem('dp', { excerpt: '动态规划 背包' }),
    ];
    const first = selectExamProblems(catalog, 3).map((item) => item.id);
    const second = selectExamProblems(catalog, 3).map((item) => item.id);
    expect(first).toEqual(second);
    expect(first).toContain('graph');
    expect(first).toContain('dp');
  });
});

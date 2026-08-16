import { describe, expect, it } from 'vitest';
import { inferProblemSkills } from './skills';

describe('inferProblemSkills', () => {
  it('infers multiple distinct skills from title and searchable content', () => {
    const skills = inferProblemSkills({ title: '数组中的二分查找', searchText: '排序后查找目标值' });
    expect(skills).toContain('array');
    expect(skills).toContain('binary-search');
    expect(new Set(skills).size).toBe(skills.length);
  });

  it('recognizes graph traversal terminology case-insensitively', () => {
    expect(inferProblemSkills({ title: '最短路', searchText: 'Use BFS on a graph' })).toEqual(expect.arrayContaining(['graph', 'search']));
  });

  it('falls back to implementation and simulation when no specific skill matches', () => {
    expect(inferProblemSkills({ title: '特殊规则处理', searchText: '按照题意完成操作' })).toEqual(['simulation']);
  });

  it('does not let reference code and input/output boilerplate pollute catalog skill inference', () => {
    expect(inferProblemSkills({
      title: '跳格子3',
      excerpt: '从起点开始，每次最大步长为 k，返回跳到终点时的最大得分。',
      searchText: '输入 输出 动态规划 dp 数组 map 队列 区间',
    })).toEqual(['simulation']);
  });

  it('uses persisted corpus intelligence before legacy keyword inference', () => {
    expect(inferProblemSkills({
      title: '特殊规则处理',
      searchText: '字符串 数组 二分 动态规划',
      skills: ['graph', 'search'],
    })).toEqual(['graph', 'search']);
  });

  it('replaces a candidate greedy label with stronger custom-ranking evidence', () => {
    expect(inferProblemSkills({
      title: '比赛评分',
      searchText: '计算得分最多的3位选手。如果总分相同，按10分数量、9分数量逐级比较排名。',
      skills: ['greedy'],
      classification: { source: 'candidate', confidence: 0.9 },
    })).toEqual(['sorting']);
  });

  it('keeps verified persisted skills authoritative over keyword inference', () => {
    expect(inferProblemSkills({
      title: '特殊规则',
      searchText: '排名、二分、数组',
      skills: ['greedy'],
      classification: { source: 'verified', confidence: 1 },
    })).toEqual(['greedy']);
  });
});

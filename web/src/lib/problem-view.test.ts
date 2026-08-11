import { describe, expect, it } from 'vitest';
import { getProblemViewSections } from './problem-view';

describe('getProblemViewSections', () => {
  const sections = {
    description: '题目正文',
    input: '输入说明',
    output: '输出说明',
    examples: ['示例一'],
    solution: '哈希表记录已经出现的元素',
    complexity: '时间 O(n)，空间 O(n)',
  };

  it('keeps solution content out of the description tab', () => {
    expect(getProblemViewSections('description', sections)).toEqual([
      ['description', '题目描述', '题目正文'],
      ['input', '输入说明', '输入说明'],
      ['output', '输出说明', '输出说明'],
      ['examples', '示例', '示例一'],
    ]);
  });

  it('shows only solution material in the solution tab', () => {
    expect(getProblemViewSections('solution', sections)).toEqual([
      ['solution', '解题思路', '哈希表记录已经出现的元素'],
      ['complexity', '复杂度', '时间 O(n)，空间 O(n)'],
    ]);
  });
});

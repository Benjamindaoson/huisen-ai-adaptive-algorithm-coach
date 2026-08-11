import { describe, expect, it } from 'vitest';
import { credibleSampleTestCasesFromExamples, publicSampleCasesForProblem, sampleStdinFromExamples, sampleTestCasesFromExamples } from './testcase';

describe('sampleStdinFromExamples', () => {
  it('uses the content between Chinese input and output markers', () => {
    expect(sampleStdinFromExamples(['输入', '6', '1 -1 -6 7 -17 7', '2', '输出', '7'])).toBe('6\n1 -1 -6 7 -17 7\n2');
  });

  it('returns an empty string when the record has no labeled sample input', () => {
    expect(sampleStdinFromExamples(['没有结构化用例'])).toBe('');
  });
});

describe('sampleTestCasesFromExamples', () => {
  it('extracts more than one sample from a flattened section', () => {
    expect(sampleTestCasesFromExamples([
      '示例 1', '输入', '3', '1 2 3', '输出', '6', '说明', '求和',
      '示例 2', '输入：2', '9 8', '输出：17',
    ])).toEqual([
      { id: 'sample-1', name: '示例 1', stdin: '3\n1 2 3', expectedOutput: '6' },
      { id: 'sample-2', name: '示例 2', stdin: '2\n9 8', expectedOutput: '17' },
    ]);
  });

  it('does not include explanation text in expected output', () => {
    expect(sampleTestCasesFromExamples(['输入', '1', '输出', '42', '说明：这里解释为什么'])).toEqual([
      { id: 'sample-1', name: '示例 1', stdin: '1', expectedOutput: '42' },
    ]);
  });

  it('ignores samples that do not have both input and expected output', () => {
    expect(sampleTestCasesFromExamples(['输入', '1 2 3', '说明', '没有输出'])).toEqual([]);
  });
});

describe('credibleSampleTestCasesFromExamples', () => {
  it('rejects source placeholders and narrative input/output descriptions', () => {
    expect(credibleSampleTestCasesFromExamples(['输入\n1\n2\n输出\n1'])).toEqual([]);
    expect(credibleSampleTestCasesFromExamples(['输入：第一行数据表示师徒关系\n输出：第一个元素表示人数'])).toEqual([]);
  });

  it('keeps concrete structured public samples', () => {
    expect(credibleSampleTestCasesFromExamples(['输入：[[1,4],[2,5]]\n输出：[[1,5]]'])).toHaveLength(1);
    expect(credibleSampleTestCasesFromExamples(['输入\n1\n输出\n42'])).toHaveLength(1);
  });
});

describe('publicSampleCasesForProblem', () => {
  it('uses reviewed ACM-format cases instead of corrupt source placeholders', () => {
    const cases = publicSampleCasesForProblem({ id: 'od-71a5033ee94c', sections: { examples: ['输入\n1\n2\n3\n输出\n1'] } });
    expect(cases[0]).toEqual({ id: 'curated-1', name: '校验样例 1', stdin: '6\n1 -1 -6 7 -17 7\n2', expectedOutput: '14' });
  });
});

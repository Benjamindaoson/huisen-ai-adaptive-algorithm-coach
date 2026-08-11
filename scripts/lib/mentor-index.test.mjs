import { describe, expect, it } from 'vitest';
import { buildMentorIndex } from './mentor-index.mjs';

const problem = {
  id: 'od-array', title: '数组窗口', collection: 'OD', score: 100,
  sections: { description: '寻找连续数组窗口最大值', input: '第一行 n', output: '最大值', solution: '使用滑动窗口' },
  solutions: { javascript: 'function solve() {}', python: 'print(1)' },
  skills: ['array', 'sliding-window'],
  quality: { readable: true, contentVerified: true, solutionPresent: true, solutionVerified: false },
};

describe('buildMentorIndex', () => {
  it('creates deterministic problem, solution, skill and misconception documents with trust tiers', () => {
    const result = buildMentorIndex([problem]);
    expect(result.version).toBe(1);
    expect(result.problemCount).toBe(1);
    expect(result.documents.map((item) => item.kind)).toEqual(expect.arrayContaining(['problem', 'solution', 'skill', 'misconception']));
    expect(result.documents.find((item) => item.ref === 'problem:od-array')).toMatchObject({ verification: 'verified', authoritative: true });
    expect(result.documents.find((item) => item.ref === 'solution:od-array:javascript')).toMatchObject({ verification: 'candidate', authoritative: false });
    expect(result.documents.every((item) => item.text.length <= 4_000 && item.ref.length > 0)).toBe(true);
    expect(buildMentorIndex([problem])).toEqual(result);
  });
});

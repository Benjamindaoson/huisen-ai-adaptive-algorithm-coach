import { describe, expect, it } from 'vitest';
import type { ProblemRecord } from './catalog';
import type { PracticeAttempt } from './practice';
import { canOpenReference, referenceSections } from './reference-answer';

const attempt = (mode: PracticeAttempt['mode'], outcome: PracticeAttempt['outcome']): PracticeAttempt => ({
  id: `${mode}-${outcome}`, problemId: 'p1', language: 'python', mode, outcome,
  codeSnapshot: 'code', summary: 'summary', createdAt: '2026-08-11T00:00:00Z',
});

describe('reference answer policy', () => {
  it('requires confirmation before a sample submission', () => {
    expect(canOpenReference([], 'p1', 'python')).toBe(false);
    expect(canOpenReference([attempt('run', 'executed')], 'p1', 'python')).toBe(false);
  });

  it.each(['wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'passed'] as const)('opens directly after %s sample submission', (outcome) => {
    expect(canOpenReference([attempt('sample-submit', outcome)], 'p1', 'python')).toBe(true);
  });

  it('collects thinking, complexity, and current-language reference code', () => {
    const problem = {
      id: 'p1', sections: { solution: '双指针', complexity: 'O(n)' }, solutions: { python: 'print(1)' },
    } as ProblemRecord;
    expect(referenceSections(problem, 'python')).toEqual([
      { id: 'thinking', title: '解题思路', content: '双指针', kind: 'text' },
      { id: 'complexity', title: '复杂度分析', content: 'O(n)', kind: 'text' },
      { id: 'code', title: 'Python 参考代码', content: 'print(1)', kind: 'code' },
    ]);
  });
});

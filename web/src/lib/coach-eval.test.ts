import { describe, expect, it } from 'vitest';
import type { ProblemRecord } from './catalog';
import { buildCoachRequest, buildLocalDiagnosis } from './coach';
import type { PracticeAttempt } from './practice';

const problem: ProblemRecord = {
  id: 'eval', title: '诊断评估题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'eval',
  sections: { description: '读取整数数组并输出满足条件的结果。', input: '第一行整数 n，第二行 n 个整数。', output: '一个整数。', examples: [] },
  solutions: { python: 'REFERENCE_COMPLETE_SOLUTION' }, tags: [], completeness: 'complete',
};

const fixtures: Array<{ name: string; outcome: PracticeAttempt['outcome']; evidence: PracticeAttempt['evidence']; marker: string }> = [
  { name: 'syntax', outcome: 'compile-error', evidence: { stderr: 'SyntaxError: missing ) at line 4' }, marker: 'SyntaxError' },
  { name: 'off-by-one', outcome: 'wrong-answer', evidence: { failedCase: { name: '边界样例', stdin: '1', expectedOutput: '1', actualOutput: '0', verdict: 'wrong-answer' } }, marker: '预期输出“1”，实际输出“0”' },
  { name: 'input parsing', outcome: 'runtime-error', evidence: { stderr: 'ValueError: invalid literal for int()' }, marker: 'ValueError' },
  { name: 'complexity', outcome: 'timeout', evidence: { timeMs: 2000 }, marker: '2000 ms' },
  { name: 'runtime boundary', outcome: 'runtime-error', evidence: { stderr: 'IndexError: list index out of range' }, marker: 'IndexError' },
];

describe('local coach release evaluation', () => {
  for (const fixture of fixtures) {
    it(`${fixture.name} cites evidence and gives a verifiable next action without leaking the solution`, () => {
      const attempt: PracticeAttempt = {
        id: fixture.name, problemId: problem.id, language: 'python', mode: 'sample-submit', codeSnapshot: 'user code',
        outcome: fixture.outcome, summary: fixture.name, evidence: fixture.evidence, createdAt: '2026-08-11T00:00:00Z',
      };
      for (const level of [1, 2, 3] as const) {
        const diagnosis = buildLocalDiagnosis(buildCoachRequest(problem, attempt, [], level));
        expect(diagnosis.evidence.join(' ')).toContain(fixture.marker);
        expect(diagnosis.nextAction.length).toBeGreaterThan(8);
        expect(diagnosis.confidence).toBeGreaterThan(0);
        expect(diagnosis.confidence).toBeLessThanOrEqual(1);
        expect(diagnosis.suggestedCode).toBeUndefined();
        expect(JSON.stringify(diagnosis)).not.toContain('REFERENCE_COMPLETE_SOLUTION');
      }
    });
  }
});

import { describe, expect, it, vi } from 'vitest';
import type { ProblemRecord } from './catalog';
import { createExamSession, updateExamAnswer } from './exam';
import { gradeExam } from './exam-grading';

function problem(id: string, examples: string[]): ProblemRecord {
  return {
    id, title: id, sourcePaths: [], sourceKinds: [], score: 100, collection: 'OD', tags: [], completeness: 'complete',
    sections: { description: id, examples }, solutions: { python: 'hidden reference' },
  };
}

describe('gradeExam', () => {
  it('separates passed, unanswered and unjudgeable problems and labels public scope', async () => {
    let exam = createExamSession(['passed', 'empty', 'no-sample'], 90, 1_000, 'exam-1');
    exam = updateExamAnswer(exam, 'passed', 'python', 'print(2)', 2_000);
    exam = updateExamAnswer(exam, 'no-sample', 'python', 'print(1)', 2_000);
    const execute = vi.fn().mockResolvedValue({ kind: 'success', stdout: '2\n', stderr: '' });

    const report = await gradeExam(exam, {
      passed: problem('passed', ['输入：1\n输出：2']),
      empty: problem('empty', ['输入：1\n输出：2']),
      'no-sample': problem('no-sample', ['这里只是一段说明']),
    }, execute, 61_000);

    expect(report.gradingScope).toBe('public-samples');
    expect(report.score).toBe(33);
    expect(report.durationUsedMs).toBe(60_000);
    expect(report.results.map((item) => item.verdict)).toEqual(['passed', 'unanswered', 'unjudgeable']);
  });

  it('reports a failed sample and does not expose case input in the summary', async () => {
    const exam = updateExamAnswer(createExamSession(['a'], 90, 1_000, 'exam-1'), 'a', 'python', 'bad', 2_000);
    const report = await gradeExam(exam, { a: problem('a', ['输入：SECRET\n输出：ok']) }, async () => ({ kind: 'success', stdout: 'bad', stderr: '' }), 3_000);
    expect(report.results[0]).toMatchObject({ verdict: 'failed', passedCount: 0, totalCount: 1 });
    expect(report.results[0].errorSummary).not.toContain('SECRET');
  });
});

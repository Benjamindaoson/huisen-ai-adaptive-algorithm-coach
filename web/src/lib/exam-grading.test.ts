import { describe, expect, it, vi } from 'vitest';
import type { ProblemRecord } from './catalog';
import { createExamSession, updateExamAnswer } from './exam';
import { gradeExam, gradeExamWithDurableSubmissions } from './exam-grading';
import { recordCollaborationEvent } from './exam-collaboration';

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
    expect(report.dimensions).toEqual(expect.objectContaining({
      algorithmAbility: expect.objectContaining({ status: 'observed', evidenceRefs: ['result:passed', 'result:empty', 'result:no-sample'] }),
      independentCompletion: expect.objectContaining({ status: 'observed' }),
      hintDependence: expect.objectContaining({ status: 'not-observed' }),
      aiCollaboration: expect.objectContaining({ status: 'not-observed' }),
    }));
    expect(report).not.toHaveProperty('overallScore');
  });

  it('reports a failed sample and does not expose case input in the summary', async () => {
    const exam = updateExamAnswer(createExamSession(['a'], 90, 1_000, 'exam-1'), 'a', 'python', 'bad', 2_000);
    const report = await gradeExam(exam, { a: problem('a', ['输入：SECRET\n输出：ok']) }, async () => ({ kind: 'success', stdout: 'bad', stderr: '' }), 3_000);
    expect(report.results[0]).toMatchObject({ verdict: 'failed', passedCount: 0, totalCount: 1 });
    expect(report.results[0].errorSummary).not.toContain('SECRET');
  });

  it('builds the exam result only from aggregate durable hidden-submission verdicts', async () => {
    let exam = createExamSession(['a', 'b'], 90, 1_000, 'exam-hidden');
    exam = updateExamAnswer(exam, 'a', 'python', 'print(1)', 2_000);
    exam = updateExamAnswer(exam, 'b', 'cpp', 'int main(){}', 2_001);
    const submit = vi.fn()
      .mockResolvedValueOnce({ id: 's-a', problemId: 'a', problemVersionId: 'a@starter-v1', status: 'passed', submittedAt: 2_500, completedAt: 2_600, passedCount: 12, totalCount: 12, timeMs: 20, revision: 4 })
      .mockResolvedValueOnce({ id: 's-b', problemId: 'b', problemVersionId: 'b@starter-v1', status: 'failed', submittedAt: 2_500, completedAt: 2_700, passedCount: 7, totalCount: 12, timeMs: 30, revision: 4 });
    const report = await gradeExamWithDurableSubmissions(exam, submit, 3_000);
    expect(submit).toHaveBeenNthCalledWith(1, expect.objectContaining({ problemVersionId: 'a@starter-v1', language: 'python', sourceCode: 'print(1)', idempotencyKey: expect.stringContaining('exam-hidden') }));
    expect(report).toMatchObject({ gradingScope: 'trusted-hidden', score: 50, results: [{ problemId: 'a', verdict: 'passed', passedCount: 12, totalCount: 12 }, { problemId: 'b', verdict: 'failed', passedCount: 7, totalCount: 12 }] });
    expect(report.dimensions.algorithmAbility).toMatchObject({ confidence: 'high' });
    expect(JSON.stringify(report)).not.toContain('sourceCode');
  });

  it('scores AI collaboration from verified runtime artifacts and learner decisions rather than event count', async () => {
    let exam = createExamSession(['a'], 90, 1_000, 'exam-ai', 'ai-collaboration');
    const evidence = (id: string, kind: 'prompt' | 'tool-action' | 'diff' | 'test' | 'learner-decision' | 'oral-response', source: 'agent-runtime' | 'learner-action') => ({ id, kind, source, artifactRef: `exam-agent:r1:${id}`, summary: id });
    exam = recordCollaborationEvent(exam, { id: 'plan', type: 'plan', recordedAt: 2_000, evidence: [evidence('prompt', 'prompt', 'agent-runtime')] });
    exam = recordCollaborationEvent(exam, { id: 'delegate', type: 'delegation', recordedAt: 2_001, evidence: [evidence('tool', 'tool-action', 'agent-runtime')] });
    exam = recordCollaborationEvent(exam, { id: 'review', type: 'review', recordedAt: 2_002, evidence: [evidence('diff', 'diff', 'agent-runtime'), evidence('decision', 'learner-decision', 'learner-action')] });
    exam = recordCollaborationEvent(exam, { id: 'test', type: 'test', recordedAt: 2_003, evidence: [evidence('test-run', 'test', 'agent-runtime')] });
    exam = recordCollaborationEvent(exam, { id: 'oral', type: 'oral-explanation', recordedAt: 2_004, evidence: [evidence('oral-prompt', 'prompt', 'agent-runtime'), evidence('oral', 'oral-response', 'learner-action')] });
    const report = await gradeExam(exam, { a: problem('a', ['输入：1\n输出：2']) }, async () => ({ kind: 'success', stdout: '2', stderr: '' }), 3_000);
    expect(report.dimensions.aiCollaboration).toMatchObject({ status: 'observed', value: 100, confidence: 'high' });
    expect(report.dimensions.aiCollaboration.evidenceRefs.every((ref) => ref.startsWith('exam-agent:'))).toBe(true);
  });
});

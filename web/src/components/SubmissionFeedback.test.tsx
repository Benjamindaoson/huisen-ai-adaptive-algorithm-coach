// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ProblemRecord } from '../lib/catalog';
import type { PracticeAttempt } from '../lib/practice';
import type { SampleSubmissionResult } from '../lib/sample-judge';
import { SubmissionFeedback } from './SubmissionFeedback';

const problem = {
  id: 'p1', title: '数组题', collection: 'A卷', score: 100, sourcePaths: [], sourceKinds: [], tags: [], completeness: 'complete',
  sections: { description: '描述', input: '输入', output: '输出', examples: [] }, solutions: { python: 'answer' },
} as ProblemRecord;

const failedAttempt: PracticeAttempt = {
  id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'user code', outcome: 'wrong-answer',
  summary: '公开样例 0/1 通过', createdAt: '2026-08-11T00:00:00Z',
  evidence: { failedCase: { name: '示例 1', stdin: '1 2', expectedOutput: '3', actualOutput: '2', verdict: 'wrong-answer' } },
};

const failedSubmission: SampleSubmissionResult = {
  allPassed: false, passedCount: 0, totalCount: 1,
  cases: [{ caseId: 'c1', name: '示例 1', stdin: '1 2', expectedOutput: '3', actualOutput: '2', stderr: '', verdict: 'wrong-answer' }],
};

afterEach(cleanup);

it('shows verdict, failed evidence, diagnosis, and three learning actions together', () => {
  const onRetry = vi.fn(); const onHint = vi.fn(); const onReference = vi.fn();
  render(<SubmissionFeedback submission={failedSubmission} attempt={failedAttempt} problem={problem} mastery={[]} onRetry={onRetry} onHint={onHint} onReference={onReference} />);

  expect(screen.getByText('公开样例未全部通过')).toBeTruthy();
  expect(screen.getByText('实际输出')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.getByText('教练诊断')).toBeTruthy();
  expect(screen.getByText(/程序能运行/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '修正并重试' }));
  fireEvent.click(screen.getByRole('button', { name: '给我一个提示' }));
  fireEvent.click(screen.getByRole('button', { name: '查看参考答案' }));
  expect(onRetry).toHaveBeenCalledOnce(); expect(onHint).toHaveBeenCalledOnce(); expect(onReference).toHaveBeenCalledOnce();
});

it('states public-sample scope even when every case passes', () => {
  const submission: SampleSubmissionResult = { allPassed: true, passedCount: 1, totalCount: 1, cases: [{ ...failedSubmission.cases[0], actualOutput: '3', verdict: 'passed' }] };
  render(<SubmissionFeedback submission={submission} attempt={{ ...failedAttempt, outcome: 'passed', summary: '公开样例 1/1 通过' }} problem={problem} mastery={[]} onRetry={() => undefined} onHint={() => undefined} onReference={() => undefined} />);
  expect(screen.getByText('公开样例全部通过')).toBeTruthy();
  expect(screen.getByText(/不代表已通过隐藏测试/)).toBeTruthy();
  expect(screen.queryByText('正式通过')).toBeNull();
});

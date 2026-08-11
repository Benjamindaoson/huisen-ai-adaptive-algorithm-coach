// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { ProblemRecord } from '../lib/catalog';
import { createExamSession, submitExam } from '../lib/exam';
import { ExamWorkspace } from './ExamWorkspace';

const problem: ProblemRecord = {
  id: 'p1', title: '数组题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'OD', tags: [], completeness: 'complete',
  sections: { description: '只显示题目描述', input: '一行整数', output: '结果', examples: ['输入：1\n输出：2'], solution: '绝密题解' },
  solutions: { python: 'print("绝密参考答案")' },
};

afterEach(cleanup);

it('does not expose solutions, references or the AI coach during a running exam', () => {
  render(<ExamWorkspace session={createExamSession(['p1'], 90, Date.now(), 'exam-1')} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('只显示题目描述')).toBeTruthy();
  expect(screen.queryByText('绝密题解')).toBeNull();
  expect(screen.queryByText('绝密参考答案')).toBeNull();
  expect(screen.queryByText('AI 教练')).toBeNull();
  expect(screen.queryByText('解题思路')).toBeNull();
});

it('clearly labels a submitted report as a public-sample simulation score', () => {
  const running = createExamSession(['p1'], 90, 1_000, 'exam-1');
  const session = submitExam(running, {
    submittedAt: 2_000, durationUsedMs: 1_000, score: 0, gradingScope: 'public-samples',
    results: [{ problemId: 'p1', verdict: 'failed', passedCount: 0, totalCount: 1, errorSummary: '公开样例输出不匹配。' }],
  });
  render(<ExamWorkspace session={session} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('公开样例模拟分')).toBeTruthy();
  expect(screen.getByText('不代表隐藏用例 AC')).toBeTruthy();
  expect(screen.getByText('数组与序列')).toBeTruthy();
});

it('uses an in-page confirmation before the irreversible submission', () => {
  render(<ExamWorkspace session={createExamSession(['p1'], 90, Date.now(), 'exam-1')} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /提交考试/ }));
  expect(screen.getByRole('dialog', { name: '确认提交考试' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '确认并提交' })).toBeTruthy();
});

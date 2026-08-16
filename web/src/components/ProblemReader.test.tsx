// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProblemReader } from './ProblemReader';

afterEach(cleanup);

const problem = {
  id: 'p1', title: '数组边界', sourcePaths: [], sourceKinds: [], score: 100, collection: 'OD', tags: [], completeness: 'complete' as const,
  sections: { description: '题目内容', input: '输入', output: '输出', examples: [] }, solutions: { python: 'print(1)' },
};

it('offers a reversible focus mode that keeps the coding workspace available', () => {
  render(<ProblemReader problem={problem} drafts={{}} attempts={[]} mastery={[]} onUpdate={vi.fn()} onDraftChange={vi.fn()} onAttempt={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: '进入专注模式' }));
  expect(screen.getByRole('button', { name: '退出专注模式' })).toBeTruthy();
  expect(screen.getByLabelText('代码练习区')).toBeTruthy();
  expect(screen.queryByLabelText('题目内容')).toBeNull();
});

it('shows a truthful evidence-bound completion receipt after independent transfer', () => {
  const onReturnToTraining = vi.fn();
  render(<ProblemReader problem={problem} drafts={{}} attempts={[]} mastery={[]} onUpdate={vi.fn()} onDraftChange={vi.fn()} onAttempt={vi.fn()}
    verifiedTransfer={{ lessonTitle: '数组遍历', attemptId: 'attempt-pass', verifiedAt: '2026-08-12T00:02:00Z', evidenceRefs: ['event:transfer-start', 'event:transfer-pass', 'attempt:attempt-pass'] }}
    onReturnToTraining={onReturnToTraining} />);

  expect(screen.getByRole('complementary', { name: '迁移验证结果' })).toBeTruthy();
  expect(screen.getByText('独立迁移已验证')).toBeTruthy();
  expect(screen.getByText('attempt-pass')).toBeTruthy();
  expect(screen.getByText(/数组遍历/)).toBeTruthy();
  expect(screen.getByText(/不等于长期掌握/)).toBeTruthy();
  expect(screen.getByText(/event:transfer-start/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '查看下一步' }));
  expect(onReturnToTraining).toHaveBeenCalledTimes(1);
});

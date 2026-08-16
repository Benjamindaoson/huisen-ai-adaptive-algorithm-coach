// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { LearningEvent } from '../lib/learner-memory';
import { BridgeEntryDiagnosis } from './BridgeEntryDiagnosis';

afterEach(cleanup);

function event(step: 'state' | 'implementation' | 'modeling', correct: boolean, offset: number): LearningEvent {
  return {
    id: `event-${step}`,
    learnerId: 'learner-a',
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '2.0.0', diagnosticStep: step, correct },
    createdAt: new Date(Date.parse('2026-08-14T00:00:00Z') + offset).toISOString(),
  };
}

it('collects three bounded actions and reveals an evidence-based mission', () => {
  const onSignal = vi.fn();
  const onStartTraining = vi.fn();
  render(<BridgeEntryDiagnosis events={[]} onSignal={onSignal} onStartTraining={onStartTraining} />);

  fireEvent.click(screen.getByRole('button', { name: '开始 3 分钟诊断' }));
  fireEvent.click(screen.getByRole('button', { name: '8' }));
  fireEvent.click(screen.getByRole('button', { name: 'for score in scores:' }));
  fireEvent.click(screen.getByRole('button', { name: '已经见过的数字' }));

  expect(onSignal).toHaveBeenCalledWith({
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true },
  });
  expect(screen.getByText('目前最可能的卡点')).toBeTruthy();
  expect(screen.getByText('陌生题迁移')).toBeTruthy();
  expect(screen.getByText(/3 个诊断动作/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '开始 10 分钟训练' }));
  expect(onStartTraining).toHaveBeenCalledWith('starter-array-traversal');
});

it('resumes at the first unfinished diagnostic action', () => {
  render(<BridgeEntryDiagnosis events={[event('state', true, 0)]} onSignal={vi.fn()} onStartTraining={vi.fn()} />);

  expect(screen.getByText('第 2 / 3 步')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'for score in scores:' })).toBeTruthy();
});

it('shows the learner-readable evidence used for the recommended mission', () => {
  render(<BridgeEntryDiagnosis events={[
    event('state', true, 0),
    event('implementation', false, 1),
    event('modeling', false, 2),
  ]} onSignal={vi.fn()} onStartTraining={vi.fn()} />);

  const evidence = screen.getByRole('list', { name: 'AI 使用的诊断证据' });
  expect(evidence.textContent).toContain('读懂程序状态稳定');
  expect(evidence.textContent).toContain('把想法写成代码需要补强');
  expect(evidence.textContent).toContain('把题意变成状态需要补强');
  expect(screen.getByText('这些动作只用于安排起点，不等于掌握证明。')).toBeTruthy();
});

it('labels a matching started mission as continuation', () => {
  const onStartTraining = vi.fn();
  render(<BridgeEntryDiagnosis events={[
    event('state', true, 0),
    event('implementation', true, 1),
    event('modeling', true, 2),
    { id: 'training-start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z' },
  ]} onSignal={vi.fn()} onStartTraining={onStartTraining} />);

  fireEvent.click(screen.getByRole('button', { name: '继续 10 分钟训练' }));
  expect(onStartTraining).toHaveBeenCalledWith('starter-array-traversal');
  expect(screen.queryByRole('button', { name: '开始 10 分钟训练' })).toBeNull();
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { STARTER_ALGORITHM_LESSONS } from '../lib/starter-algorithm-curriculum';
import type { LearningEvent } from '../lib/learner-memory';
import { TodayPage } from './TodayPage';

afterEach(cleanup);

it('makes the AI training cabin the first-time primary action and explains the map honestly', () => {
  const onStartTraining = vi.fn();
  const events: LearningEvent[] = [
    { id: 'state', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }, createdAt: '2026-08-14T00:00:00Z' },
    { id: 'implementation', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'implementation', correct: true }, createdAt: '2026-08-14T00:00:01Z' },
    { id: 'modeling', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'modeling', correct: true }, createdAt: '2026-08-14T00:00:02Z' },
  ];
  render(<TodayPage plan={[]} evidenceCount={0} reviewCount={0} completedCount={0} onOpen={vi.fn()} events={events} starterLesson={STARTER_ALGORITHM_LESSONS[0]} trainingLesson={STARTER_ALGORITHM_LESSONS[0]} onStartTraining={onStartTraining} />);

  expect(screen.getByText('AI 成长地图')).toBeTruthy();
  expect(screen.getByText('独立迁移待验证')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /开始 AI 训练/ }));
  expect(onStartTraining).toHaveBeenCalledWith('starter-array-traversal');
});

it('shows the evidence-building diagnosis before a generic first task', () => {
  render(<TodayPage plan={[]} evidenceCount={0} reviewCount={0} completedCount={0} onOpen={vi.fn()} events={[]} trainingLesson={STARTER_ALGORITHM_LESSONS[0]} onLearningSignal={vi.fn()} onStartTraining={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '先让 AI 看见你怎么思考' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '开始 3 分钟诊断' })).toBeTruthy();
  expect(screen.queryByText('今天先完成这一件事')).toBeNull();
});

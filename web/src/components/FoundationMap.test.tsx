// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FoundationMap } from './FoundationMap';
import type { LearningEvent } from '../lib/learner-memory';

afterEach(cleanup);

it('shows a gated zero-foundation journey instead of a flat lesson list', () => {
  render(<FoundationMap events={[]} onLearn={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '零基础起步' })).toBeTruthy();
  expect((screen.getByRole('button', { name: /让程序听懂你的话/ }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: /给信息贴标签/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('0 / 12 节完成')).toBeTruthy();
});

it('shows transfer verification as stronger evidence than course completion', () => {
  const events: LearningEvent[] = [
    { id: 'complete', learnerId: 'learner-a', kind: 'lesson-completed', data: { lessonId: 'input-output', stage: 'complete', correct: true }, createdAt: '2026-08-12T00:00:00Z' },
    { id: 'transfer', learnerId: 'learner-a', kind: 'lesson-transfer-passed', problemId: 'od-a', attemptId: 'attempt-a', data: { lessonId: 'input-output', stage: 'transfer', correct: true, assisted: false }, createdAt: '2026-08-12T00:05:00Z' },
  ];
  render(<FoundationMap events={events} onLearn={vi.fn()} />);
  expect(screen.getByText('1 项迁移验证')).toBeTruthy();
  expect(screen.getByRole('button', { name: /让程序听懂你的话，已完成，迁移已验证/ })).toBeTruthy();
});

it('shows five bridge segments and honest future nodes', () => {
  render(<FoundationMap events={[]} onLearn={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '算法过桥地图' })).toBeTruthy();
  expect(screen.getByText('让程序跑起来')).toBeTruthy();
  expect(screen.getByText('把题意变成步骤')).toBeTruthy();
  expect(screen.getByText('陌生题综合迁移')).toBeTruthy();
  expect(screen.getAllByText('后续开放').length).toBeGreaterThan(0);
  expect(screen.getByText(/短入口训练：数组遍历/)).toBeTruthy();
});

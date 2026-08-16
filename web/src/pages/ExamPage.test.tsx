// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExamPage } from './ExamPage';

afterEach(cleanup);

it('starts the explicitly selected screening mode', () => {
  const onStart = vi.fn();
  render(<ExamPage exam={null} starting={false} onStart={onStart} onContinue={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /^AI 协作模式/ }));
  fireEvent.click(screen.getByRole('button', { name: '开始 AI 协作初试 →' }));
  expect(onStart).toHaveBeenCalledWith('ai-collaboration');
});

it('defaults safely to the no-AI independent mode', () => {
  const onStart = vi.fn();
  render(<ExamPage exam={null} starting={false} onStart={onStart} onContinue={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '开始无 AI 初试 →' }));
  expect(onStart).toHaveBeenCalledWith('independent');
});

it('describes authenticated exams as trusted hidden judging', () => {
  render(<ExamPage exam={null} starting={false} hiddenJudging onStart={vi.fn()} onContinue={vi.fn()} />);
  expect(screen.getByText('可信隐藏用例逐题判定，错误会进入复盘。')).toBeTruthy();
  expect(screen.queryByText('公开样例逐题判定，错误会进入复盘。')).toBeNull();
});

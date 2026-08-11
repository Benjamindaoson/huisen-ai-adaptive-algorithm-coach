// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FOUNDATION_LESSONS } from '../lib/foundation-curriculum';
import { LessonPage } from './LessonPage';

afterEach(cleanup);

it('teaches through observe, predict and completion before transfer', () => {
  const onSignal = vi.fn();
  render(<LessonPage lesson={FOUNDATION_LESSONS[0]} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);
  expect(screen.getByText(/严格的收银员/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '继续：观察程序' }));
  expect(screen.getByText('先收到文字')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '继续：先预测' }));
  fireEvent.click(screen.getByRole('button', { name: "文字 '7'" }));
  expect(screen.getByText(/input\(\) 的结果总是文字/)).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson-checkpoint-passed' }));
  fireEvent.click(screen.getByRole('button', { name: '继续：亲手补全' }));
  fireEvent.change(screen.getByLabelText('填写缺失代码'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '检查我的答案' }));
  expect(screen.getByRole('heading', { name: '把能力带到下一道题' })).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson-completed' }));
});

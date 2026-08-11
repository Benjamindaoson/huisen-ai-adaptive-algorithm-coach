// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReferenceAnswer } from './ReferenceAnswer';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('asks before revealing an early reference answer', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const onUnlock = vi.fn();
  render(<ReferenceAnswer sections={[{ id: 'code', title: 'Python 参考代码', content: 'answer', kind: 'code' }]} unlocked={false} canOpenDirectly={false} onUnlock={onUnlock} />);

  fireEvent.click(screen.getByRole('button', { name: '查看参考答案' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(onUnlock).not.toHaveBeenCalled();
  expect(screen.queryByText('answer')).toBeNull();
});

it('renders the reference after a confirmed unlock', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const onUnlock = vi.fn();
  const { rerender } = render(<ReferenceAnswer sections={[{ id: 'code', title: 'Python 参考代码', content: 'answer', kind: 'code' }]} unlocked={false} canOpenDirectly={false} onUnlock={onUnlock} />);
  fireEvent.click(screen.getByRole('button', { name: '查看参考答案' }));
  expect(onUnlock).toHaveBeenCalledOnce();
  rerender(<ReferenceAnswer sections={[{ id: 'code', title: 'Python 参考代码', content: 'answer', kind: 'code' }]} unlocked canOpenDirectly onUnlock={onUnlock} />);
  expect(screen.getByText('answer')).toBeTruthy();
});

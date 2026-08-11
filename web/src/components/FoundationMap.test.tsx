// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FoundationMap } from './FoundationMap';

afterEach(cleanup);

it('shows a gated zero-foundation journey instead of a flat lesson list', () => {
  render(<FoundationMap events={[]} onLearn={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '零基础起步' })).toBeTruthy();
  expect((screen.getByRole('button', { name: /让程序听懂你的话/ }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByRole('button', { name: /给信息贴标签/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('0 / 12 节完成')).toBeTruthy();
});

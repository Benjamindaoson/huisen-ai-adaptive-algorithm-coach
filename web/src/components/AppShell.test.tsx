// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

afterEach(cleanup);

it('renders independent navigation and exposes the active page', () => {
  render(<AppShell activeRoute="review" onExport={() => undefined} onImport={() => undefined}><h1>错题本</h1></AppShell>);

  const nav = within(screen.getByRole('navigation', { name: '主要导航' }));
  expect(nav.getByRole('link', { name: /今日/ }).getAttribute('href')).toBe('#/today');
  expect(nav.getByRole('link', { name: /题库/ }).getAttribute('href')).toBe('#/problems');
  expect(nav.getByRole('link', { name: /学习中心/ }).getAttribute('href')).toBe('#/paths');
  expect(nav.getByRole('link', { name: /错题本/ }).getAttribute('aria-current')).toBe('page');
  expect(nav.getByRole('link', { name: /模拟考试/ })).toBeTruthy();
  expect(nav.getByRole('link', { name: /能力报告/ })).toBeTruthy();
});

it('keeps backup actions available without crowding the page body', () => {
  const onExport = vi.fn();
  const onImport = vi.fn();
  render(<AppShell activeRoute="today" onExport={onExport} onImport={onImport}><div>content</div></AppShell>);

  fireEvent.click(screen.getByRole('button', { name: '导出学习数据' }));
  fireEvent.click(screen.getByRole('button', { name: '导入学习数据' }));
  expect(onExport).toHaveBeenCalledOnce();
  expect(onImport).toHaveBeenCalledOnce();
});

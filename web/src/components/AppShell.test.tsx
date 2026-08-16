// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

afterEach(cleanup);

it('renders independent navigation and exposes the active page', () => {
  render(<AppShell activeRoute="review" onExport={() => undefined} onImport={() => undefined}><h1>错题本</h1></AppShell>);

  const nav = within(screen.getByRole('navigation', { name: '主要导航' }));
  expect(nav.getByRole('link', { name: /今日驾驶舱/ }).getAttribute('href')).toBe('#/today');
  expect(nav.getByRole('link', { name: /题库练习/ }).getAttribute('href')).toBe('#/problems');
  expect(nav.getByRole('link', { name: /学习中心/ }).getAttribute('href')).toBe('#/paths');
  expect(nav.getByRole('link', { name: /错因复练/ }).getAttribute('aria-current')).toBe('page');
  expect(nav.getByRole('link', { name: /算法初试/ })).toBeTruthy();
  expect(nav.getByRole('link', { name: /能力模型/ })).toBeTruthy();
  expect(nav.getByRole('link', { name: /项目实训/ })).toBeTruthy();
  expect(nav.getAllByRole('link').slice(0, 7).map((link) => link.textContent)).toEqual(expect.arrayContaining([
    expect.stringContaining('01'), expect.stringContaining('07'),
  ]));
});

it('separates the learner journey from governance and explains the current workspace', () => {
  render(<AppShell activeRoute="problems" catalogCount={754} onExport={() => undefined} onImport={() => undefined}><h1>题库</h1></AppShell>);
  expect(screen.getByText('学习空间')).toBeTruthy();
  expect(screen.getAllByText('题库练习').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText(/754 道真实题目/)).toBeTruthy();
  const tools = within(screen.getByRole('navigation', { name: '系统工具' }));
  expect(tools.getByRole('link', { name: /质量实验室/ })).toBeTruthy();
  expect(tools.getByRole('link', { name: /信任与数据/ })).toBeTruthy();
});

it('uses the trust workspace metadata on the trust route', () => {
  render(<AppShell activeRoute="trust" onExport={() => undefined} onImport={() => undefined}><h1>信任与数据</h1></AppShell>);

  expect(screen.getAllByText('信任与数据').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('数据来源、评价边界与学习者控制')).toBeTruthy();
  expect(screen.queryByText('质量实验室')).toBeTruthy();
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

it('hosts the persistent Mentor layer outside page content', () => {
  render(<AppShell activeRoute="today" onExport={() => undefined} onImport={() => undefined} mentor={<aside>持续导师</aside>}><h1>今日任务</h1></AppShell>);
  expect(screen.getByText('持续导师')).toBeTruthy();
  expect(screen.getByText('学习编排在线')).toBeTruthy();
  expect(screen.getByText('根据你的学习证据安排下一步')).toBeTruthy();
});

it('keeps mobile navigation focused on four learner goals and exposes secondary destinations in More', () => {
  render(<AppShell activeRoute="practicum" onExport={() => undefined} onImport={() => undefined}><h1>项目实训</h1></AppShell>);

  const primary = within(screen.getByRole('navigation', { name: '移动端主要导航' }));
  expect(primary.getAllByRole('link')).toHaveLength(4);
  expect(primary.getByRole('link', { name: '今日' })).toBeTruthy();
  expect(primary.getByRole('link', { name: '学习' })).toBeTruthy();
  expect(primary.getByRole('link', { name: '练习' })).toBeTruthy();
  expect(primary.getByRole('link', { name: '我的' })).toBeTruthy();
  const more = screen.getByRole('button', { name: '更多功能' });
  expect(more.getAttribute('aria-expanded')).toBe('false');

  fireEvent.click(more);
  expect(more.getAttribute('aria-expanded')).toBe('true');
  const secondary = within(screen.getByRole('navigation', { name: '更多学习功能' }));
  expect(secondary.getByRole('link', { name: '项目' }).getAttribute('aria-current')).toBe('page');
  expect(secondary.getByRole('link', { name: '初试' })).toBeTruthy();
});

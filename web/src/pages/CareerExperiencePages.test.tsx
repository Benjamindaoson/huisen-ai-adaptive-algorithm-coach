// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TrustCenterPage } from './TrustCenterPage';
import { ProjectPracticumPage } from './ProjectPracticumPage';
import { PROJECT_PRACTICUMS } from '../lib/project-practicum';

afterEach(cleanup);

it('makes education boundaries and real data controls understandable without legal jargon', () => {
  const onLocalExport = vi.fn();
  const onDelete = vi.fn();
  render(<TrustCenterPage authenticated apiConfigured syncStatus="synced" serverExportUrl="http://api/export" onLocalExport={onLocalExport} onDelete={onDelete} />);
  expect(screen.getByRole('heading', { name: '信任与数据' })).toBeTruthy();
  expect(screen.getByText(/公开数据、模拟数据、授权脱敏数据和你的学习数据/)).toBeTruthy();
  expect(screen.getByText(/不替代教师、学校、企业或专业机构的最终评价/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '导出本机备份' }));
  fireEvent.click(screen.getByRole('button', { name: '申请删除云端学习数据' }));
  expect(onLocalExport).toHaveBeenCalledOnce();
  expect(onDelete).toHaveBeenCalledOnce();
  expect(screen.getByRole('link', { name: '导出云端数据' }).getAttribute('href')).toBe('http://api/export');
});

it('guides a learner through a project phase without revealing the complete patch', () => {
  const onSignal = vi.fn();
  render(<ProjectPracticumPage project={PROJECT_PRACTICUMS[0]} events={[]} draft={PROJECT_PRACTICUMS[0].files[1].content} onDraftChange={() => undefined} onSignal={onSignal} onRunTests={async () => ({ passed: true, passedCount: 4, totalCount: 4, failures: [] })} />);
  expect(screen.getByRole('heading', { name: '修复订单后台的分页边界缺陷' })).toBeTruthy();
  expect(screen.getByText('README.md')).toBeTruthy();
  expect(screen.getByText('src/listOrders.js')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '开始项目实训' }));
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'practicum-started', problemId: 'repo-pagination' }));
  expect(screen.queryByText(/Math\.max\(Number\.parseInt/)).toBeNull();
});

it('frames project hints as guidance from the same contextual Mentor', () => {
  const events = [{ id: 'started-1', learnerId: 'l1', kind: 'practicum-started' as const, problemId: 'repo-pagination', data: { phase: 'understanding' as const }, createdAt: '2026-08-13T00:00:00Z' }];
  render(<ProjectPracticumPage project={PROJECT_PRACTICUMS[0]} events={events} draft={PROJECT_PRACTICUMS[0].files[1].content} onDraftChange={() => undefined} onSignal={() => undefined} onRunTests={async () => ({ passed: true, passedCount: 4, totalCount: 4, failures: [] })} />);

  expect(screen.getByText('Mentor guidance')).toBeTruthy();
  expect(screen.getByText(/同一个上下文 Mentor/)).toBeTruthy();
  expect(screen.queryByText('Project Mentor')).toBeNull();
});

it('shows an ordered project path and prevents skipping locked prerequisites', () => {
  render(<ProjectPracticumPage project={PROJECT_PRACTICUMS[0]} projects={PROJECT_PRACTICUMS} events={[]} draft={PROJECT_PRACTICUMS[0].files[1].content} onDraftChange={() => undefined} onSignal={() => undefined} onRunTests={async () => ({ passed: true, passedCount: 4, totalCount: 4, failures: [] })} />);
  expect(screen.getByRole('heading', { name: '工程成长路径' })).toBeTruthy();
  expect((screen.getByRole('button', { name: /修复订单缓存过期判断/ }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: /修复跨页勾选状态漂移/ }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: /优化大批量编号去重排序/ }) as HTMLButtonElement).disabled).toBe(true);
});

it('opens the next project when its prerequisite evidence exists', () => {
  const events = [{ id: 'done-1', learnerId: 'l1', kind: 'practicum-completed' as const, problemId: 'repo-pagination', data: { phase: 'completed' as const, passed: true }, createdAt: '2026-08-13T00:00:00Z' }];
  render(<ProjectPracticumPage project={PROJECT_PRACTICUMS[0]} projects={PROJECT_PRACTICUMS} events={events} draft={PROJECT_PRACTICUMS[0].files[1].content} onDraftChange={() => undefined} onSignal={() => undefined} onRunTests={async () => ({ passed: true, passedCount: 4, totalCount: 4, failures: [] })} />);
  const nextProject = screen.getByRole('link', { name: /修复订单缓存过期判断 · 可开始/ });
  expect(nextProject.getAttribute('href')).toBe('#/practicum/repo-async-cache');
  fireEvent.click(nextProject);
});

it('runs the repository test contract and records bounded verification evidence', async () => {
  const onSignal = vi.fn();
  const events = [
    { id: 'e1', learnerId: 'l1', kind: 'practicum-started' as const, problemId: 'repo-pagination', data: { phase: 'understanding' as const }, createdAt: '2026-08-13T00:00:00Z' },
    { id: 'e2', learnerId: 'l1', kind: 'practicum-phase-completed' as const, problemId: 'repo-pagination', data: { phase: 'diagnosis' as const, choiceId: 'missing-lower-bound' }, createdAt: '2026-08-13T00:01:00Z' },
    { id: 'e3', learnerId: 'l1', kind: 'practicum-phase-completed' as const, problemId: 'repo-pagination', data: { phase: 'planning' as const, choiceId: 'clamp-contract' }, createdAt: '2026-08-13T00:02:00Z' },
  ];
  render(<ProjectPracticumPage project={PROJECT_PRACTICUMS[0]} events={events} draft="candidate" onDraftChange={() => undefined} onSignal={onSignal} onRunTests={async () => ({ passed: true, passedCount: 4, totalCount: 4, failures: [] })} />);
  fireEvent.click(screen.getByRole('button', { name: '运行项目测试' }));
  expect(await screen.findByText('4 / 4 项测试通过')).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'practicum-tested', data: expect.objectContaining({ passed: true, passedCount: 4, totalCount: 4 }) }));
});

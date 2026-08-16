// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InsightsPage } from './InsightsPage';
import type { LearnerProjection } from '../lib/learning-projection';
import type { LearningEvent } from '../lib/learner-memory';
import { buildLearningEffectEvidence } from '../lib/learning-effect-evidence';

afterEach(cleanup);

const completedDiagnosis: LearningEvent[] = [
  { id: 'diagnostic-state', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }, createdAt: '2026-08-14T00:00:00Z' },
  { id: 'diagnostic-implementation', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'implementation', correct: true }, createdAt: '2026-08-14T00:00:01Z' },
  { id: 'diagnostic-modeling', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'modeling', correct: true }, createdAt: '2026-08-14T00:00:02Z' },
];

it('acknowledges entrance evidence without promoting it to mastery', () => {
  const { container } = render(<InsightsPage mastery={[]} learningEvents={completedDiagnosis} />);

  expect(container.querySelector('.header-count')?.textContent).toBe('0 条掌握证据');
  expect(screen.getByRole('heading', { name: 'AI 已记录 3 个入口动作' })).toBeTruthy();
  expect(screen.getByText('读懂程序状态')).toBeTruthy();
  expect(screen.getByText('把想法写成代码')).toBeTruthy();
  expect(screen.getByText('把题意变成状态')).toBeTruthy();
  expect(screen.getByText(/只用于安排训练起点，不等于掌握证据/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /开始 10 分钟训练/ }).getAttribute('href')).toBe('#/training/starter-array-traversal');
  expect(screen.queryByText('先完成一个 8 分钟练习')).toBeNull();
});

it('resumes the diagnosis-selected training directly when start evidence exists', () => {
  render(<InsightsPage mastery={[]} learningEvents={[
    ...completedDiagnosis,
    { id: 'training-start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z' },
  ]} />);

  expect(screen.getByRole('link', { name: /继续 10 分钟训练/ }).getAttribute('href')).toBe('#/training/starter-array-traversal');
  expect(screen.queryByRole('link', { name: /开始 10 分钟训练/ })).toBeNull();
});

it('shows phase replay and an evidence-bound contribution ledger', () => {
  const projection: LearnerProjection = {
    phaseReplay: [{ phase: 'validation', eventIds: ['event-1'], evidenceRefs: ['attempt:a1'] }],
    skills: { array: { mastery: 0.2, misconceptionRecurrence: 0, independence: 0.1, hintDependence: 0, transfer: 0, forgetting: 0 } },
    contributionLedger: [{ skillId: 'array', dimension: 'mastery', delta: 0.2, rule: 'unassisted-submission-pass', eventIds: ['event-1'], evidenceRefs: ['attempt:a1'], at: '2026-08-12T00:00:00Z' }],
    taskSuccesses: [{ eventId: 'event-1', assisted: false, evidenceRefs: ['attempt:a1'] }], ignoredEventIds: [],
  };
  render(<InsightsPage mastery={[]} projection={projection} learningEvents={[
    { id: 'project-hint', learnerId: 'l1', kind: 'practicum-hint-used', problemId: 'repo-pagination', data: { phase: 'implementation', hintLevel: 1 }, createdAt: '2026-08-13T00:00:00Z' },
    { id: 'project-pass', learnerId: 'l1', kind: 'practicum-completed', problemId: 'repo-pagination', data: { phase: 'completed', passed: true }, createdAt: '2026-08-13T00:10:00Z' },
  ]} />);
  expect(screen.getByRole('heading', { name: '学习过程重放' })).toBeTruthy();
  expect(screen.getByText('验证')).toBeTruthy();
  expect(screen.getAllByText(/attempt:a1/)).toHaveLength(2);
  expect(screen.getByText(/规则投影/)).toBeTruthy();
  expect(screen.getByText('项目工程证据')).toBeTruthy();
  expect(screen.getByText(/1 个项目完成验证/)).toBeTruthy();
  expect(screen.getByText(/使用过 1 次过程提示/)).toBeTruthy();
});

it('shows honest evidence maturity instead of inventing a learning-effect score', () => {
  const effectEvidence = buildLearningEffectEvidence({ teacherEvidence: { eligibleCount: 0, minimum: 100, caseRefs: [] }, learningEvents: [], pedagogicalEvents: [], now: new Date('2026-08-13T00:00:00Z') });
  render(<InsightsPage mastery={[]} effectEvidence={effectEvidence} />);
  expect(screen.getByRole('heading', { name: '真实学习证据' })).toBeTruthy();
  expect(screen.getByText('0 / 100')).toBeTruthy();
  expect(screen.getAllByText('尚未采集')).toHaveLength(3);
  expect(screen.getByText(/目前不可宣称学习效果已被验证/)).toBeTruthy();
  expect(screen.queryByText(/综合得分/)).toBeNull();
});

it('keeps research evidence behind progressive disclosure for learners', () => {
  const effectEvidence = buildLearningEffectEvidence({ teacherEvidence: { eligibleCount: 0, minimum: 100, caseRefs: [] }, learningEvents: [], pedagogicalEvents: [], now: new Date('2026-08-13T00:00:00Z') });
  render(<InsightsPage mastery={[]} effectEvidence={effectEvidence} />);

  expect(screen.getByText('REAL-WORLD EVIDENCE').closest('details')).toBeTruthy();
});

it('sends a learner with no evidence to the same AI entrance diagnosis projected for Mentor', () => {
  const onStartBaseline = vi.fn();
  render(<InsightsPage mastery={[]} onStartBaseline={onStartBaseline} />);

  expect(screen.getByRole('link', { name: /开始 3 分钟诊断/ }).getAttribute('href')).toBe('#/today');
  expect(onStartBaseline).not.toHaveBeenCalled();
});

it('keeps the same diagnosis destination when no legacy baseline callback is supplied', () => {
  render(<InsightsPage mastery={[]} />);

  expect(screen.getByRole('link', { name: /开始 3 分钟诊断/ }).getAttribute('href')).toBe('#/today');
});

it('acknowledges immediate transfer and opens the exact next foundation lesson', () => {
  const completedTransfer: LearningEvent = {
    id: 'instant-transfer', learnerId: 'learner-a', kind: 'training-stage-completed',
    data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, skillIds: ['array'] }, createdAt: '2026-08-14T00:02:00Z',
  };
  const { container } = render(<InsightsPage mastery={[]} learningEvents={[completedTransfer]} />);

  expect(container.querySelector('.header-count')?.textContent).toBe('0 条掌握证据');
  expect(screen.getByRole('heading', { name: '即时迁移已通过' })).toBeTruthy();
  expect(screen.getByText(/不等于长期掌握/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /继续下一课：让程序听懂你的话/ }).getAttribute('href')).toBe('#/learn/input-output');
  expect(screen.queryByRole('heading', { name: '先完成 3 分钟 AI 入口诊断' })).toBeNull();
});

it('respects completed prerequisite evidence when choosing the next lesson', () => {
  const events: LearningEvent[] = [
    {
      id: 'input-complete', learnerId: 'learner-a', kind: 'lesson-completed',
      data: { lessonId: 'input-output', stage: 'complete', correct: true }, createdAt: '2026-08-14T00:01:30Z',
    },
    {
      id: 'instant-transfer', learnerId: 'learner-a', kind: 'training-stage-completed',
      data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, skillIds: ['array'] }, createdAt: '2026-08-14T00:02:00Z',
    },
  ];

  render(<InsightsPage mastery={[]} learningEvents={events} />);

  expect(screen.getByRole('link', { name: /继续下一课：给信息贴标签/ }).getAttribute('href')).toBe('#/learn/variables-state');
});

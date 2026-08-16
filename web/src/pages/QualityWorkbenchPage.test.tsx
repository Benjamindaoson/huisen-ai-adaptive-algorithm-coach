// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { QualityWorkbenchPage } from './QualityWorkbenchPage';
import type { QualityComparison } from '../lib/quality-review';

afterEach(cleanup);

const comparison: QualityComparison = {
  id: 'cmp-1', datasetVersion: 'mentor-v2', caseId: 'case-1',
  evidence: {
    attempt: { id: 'attempt-1', sourceHash: 'sha256:old', sourceCode: 'print(1)', createdAt: '2026-08-12T00:00:00.000Z' },
    run: { outcome: 'wrong-answer', stderr: '', failedCase: { input: '2', expected: '2', actual: '1' } },
    toolCalls: [{ name: 'run-sample', argumentsHash: 'sha256:a', resultHash: 'sha256:r' }],
    conclusions: [{ label: 'hardcoded-output', confidence: 'high', evidenceRefs: ['run.failedCase'] }],
    currentEditor: { sourceHash: 'sha256:new', sourceCode: 'print(input())' },
    diff: { stale: true, summary: '1 行已变化', hunks: ['- print(1)', '+ print(input())'] },
  },
  candidates: [
    { hash: 'sha256:mentor-a', mentorVersion: 'a', text: '先预测状态。', evidenceRefs: ['run.failedCase'] },
    { hash: 'sha256:mentor-b', mentorVersion: 'b', text: '直接给答案。', evidenceRefs: [] },
  ],
};

it('shows server-backed review evidence and never calls it browser-only', () => {
  render(<QualityWorkbenchPage comparisons={[comparison]} realEligibleCount={0} importedPublicCount={1} reviews={[]} adjudicationQueue={[]} calibrations={[]} gateFailures={['eligible-real-cases: 0/100']} storage="file-local" onSubmit={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '导师质量实验室' })).toBeTruthy();
  expect(screen.getByText('0 / 100')).toBeTruthy();
  expect(screen.getByText(/真实金标门禁未通过/)).toBeTruthy();
  expect(screen.getByText(/attempt-1/)).toBeTruthy();
  expect(screen.getByText(/当前代码已变化/)).toBeTruthy();
  expect(screen.getByText('run-sample')).toBeTruthy();
  expect(screen.getByRole('button', { name: /候选 A/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /候选 B/ })).toBeTruthy();
  expect(screen.getByText(/服务端持久化/)).toBeTruthy();
  expect(screen.queryByText(/保存在当前浏览器/)).toBeNull();
  expect(screen.getByText(/模型评审未校准/)).toBeTruthy();
  expect(screen.getByText(/eligible-real-cases/)).toBeTruthy();
});

it('shows an honest empty state instead of a synthetic demo when the server has no comparison', () => {
  render(<QualityWorkbenchPage comparisons={[]} realEligibleCount={0} importedPublicCount={0} reviews={[]} adjudicationQueue={[]} calibrations={[]} gateFailures={[]} storage="memory" onSubmit={vi.fn()} />);
  expect(screen.getByText(/没有可评审案例/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /候选 A/ })).toBeNull();
});

it('shows disagreement queue status from durable teacher reviews', () => {
  render(<QualityWorkbenchPage comparisons={[comparison]} realEligibleCount={0} importedPublicCount={1} reviews={[]} adjudicationQueue={[{ comparisonId: 'cmp-1', reviewerIds: ['teacher-1', 'teacher-2'], candidateHashes: ['sha256:mentor-a', 'sha256:mentor-b'] }]} calibrations={[]} gateFailures={[]} storage="file-local" onSubmit={vi.fn()} />);
  expect(screen.getByText('1 个冲突待仲裁')).toBeTruthy();
});

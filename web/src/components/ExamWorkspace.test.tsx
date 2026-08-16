// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ProblemRecord } from '../lib/catalog';
import { createExamSession, submitExam, updateExamAnswer } from '../lib/exam';
import { recordCollaborationEvent } from '../lib/exam-collaboration';
import { ExamWorkspace } from './ExamWorkspace';

const problem: ProblemRecord = {
  id: 'p1', title: '数组题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'OD', tags: [], completeness: 'complete',
  sections: { description: '只显示题目描述', input: '一行整数', output: '结果', examples: ['输入：1\n输出：2'], solution: '绝密题解' },
  solutions: { python: 'print("绝密参考答案")' },
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('does not expose solutions, references or the AI coach during a running exam', () => {
  render(<ExamWorkspace session={createExamSession(['p1'], 90, Date.now(), 'exam-1')} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('只显示题目描述')).toBeTruthy();
  expect(screen.queryByText('绝密题解')).toBeNull();
  expect(screen.queryByText('绝密参考答案')).toBeNull();
  expect(screen.queryByText('AI 教练')).toBeNull();
  expect(screen.queryByText('解题思路')).toBeNull();
});

it('labels independent sessions as no-AI and shows bounded evidence for collaboration sessions', () => {
  const independent = render(<ExamWorkspace session={createExamSession(['p1'], 90, Date.now(), 'independent-1')} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('Independent mode · AI assistance disabled')).toBeTruthy();
  expect(screen.queryByLabelText('AI collaboration evidence')).toBeNull();
  independent.unmount();

  const collaboration = recordCollaborationEvent(createExamSession(['p1'], 90, Date.now(), 'collaboration-1', 'ai-collaboration'), {
    id: 'plan-1', type: 'plan', recordedAt: Date.now(), problemId: 'p1',
    evidence: [{ id: 'prompt-1', kind: 'prompt', summary: 'Plan a two-pointer approach.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:prompt' }],
  });
  render(<ExamWorkspace session={collaboration} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('AI collaboration mode · bounded evidence')).toBeTruthy();
  expect(screen.getByLabelText('AI collaboration evidence').textContent).toContain('Plan a two-pointer approach.');
});

it('records only collaboration evidence produced by the Agent runtime', async () => {
  const onChange = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    version: 1, runId: 'exam-agent-r1', mode: 'deepseek', model: 'deepseek-chat', message: '边界测试已执行。',
    executions: [{ id: 'e1', tool: 'run_test', summary: 'success', evidenceRefs: ['exam-agent:r1:test'], durationMs: 5 }],
    evidence: [{ id: 'v1', kind: 'test', summary: 'Executed candidate input.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:test' }],
    usage: { inputTokens: 10, outputTokens: 4, latencyMs: 30 },
  }), { status: 200 })));
  const collaboration = createExamSession(['p1'], 90, Date.now(), 'collaboration-input', 'ai-collaboration');
  render(<ExamWorkspace session={collaboration} problems={{ p1: problem }} onChange={onChange} onExit={() => undefined} onRestart={() => undefined} agentBaseUrl="http://127.0.0.1:8787" />);
  fireEvent.change(screen.getByLabelText('协作阶段'), { target: { value: 'test' } });
  fireEvent.change(screen.getByLabelText('给 Mentor 的任务'), { target: { value: '运行一个边界用例并报告证据。' } });
  fireEvent.click(screen.getByRole('button', { name: '让 Mentor 执行证据轮次' }));
  await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
  expect(onChange.mock.calls[0][0].collaborationEvents[0]).toMatchObject({ type: 'test', problemId: 'p1', evidence: [{ kind: 'test' }] });
  expect(onChange.mock.calls[0][0].collaborationEvents[0].evidence[0].artifactRef).toBe('exam-agent:r1:test');
});

it('never applies an Agent diff until the learner explicitly accepts it', async () => {
  const onChange = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    version: 1, runId: 'exam-agent-r2', mode: 'deepseek', message: '请核对这个修改。', executions: [],
    evidence: [{ id: 'd1', kind: 'diff', summary: '修复边界条件', source: 'agent-runtime', artifactRef: 'exam-agent:r2:diff' }],
    proposedDiff: { beforeHash: 'a'.repeat(64), replacementSource: 'print(2)', rationale: '修复边界条件', artifactRef: 'exam-agent:r2:diff' },
    usage: { inputTokens: 10, outputTokens: 4, latencyMs: 30 },
  }), { status: 200 })));
  const collaboration = createExamSession(['p1'], 90, Date.now(), 'collaboration-diff', 'ai-collaboration');
  render(<ExamWorkspace session={collaboration} problems={{ p1: problem }} onChange={onChange} onExit={() => undefined} onRestart={() => undefined} agentBaseUrl="http://127.0.0.1:8787" />);
  fireEvent.change(screen.getByLabelText('协作阶段'), { target: { value: 'review' } });
  fireEvent.change(screen.getByLabelText('给 Mentor 的任务'), { target: { value: '审查当前实现。' } });
  fireEvent.click(screen.getByRole('button', { name: '让 Mentor 执行证据轮次' }));
  await screen.findByText('print(2)');
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '接受修改' }));
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange.mock.calls[0][0].answers.p1.sourceCode).toBe('print(2)');
  expect(onChange.mock.calls[0][0].collaborationEvents[0].evidence).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'learner-decision', source: 'learner-action' })]));
});

it('clearly labels a submitted report as a public-sample simulation score', () => {
  const running = createExamSession(['p1'], 90, 1_000, 'exam-1');
  const session = submitExam(running, {
    submittedAt: 2_000, durationUsedMs: 1_000, score: 0, gradingScope: 'public-samples',
    results: [{ problemId: 'p1', verdict: 'failed', passedCount: 0, totalCount: 1, errorSummary: '公开样例输出不匹配。' }],
  });
  render(<ExamWorkspace session={session} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('公开样例模拟分')).toBeTruthy();
  expect(screen.getByText('不代表隐藏用例 AC')).toBeTruthy();
  expect(screen.getByText('数组与序列')).toBeTruthy();
});

it('labels a trusted hidden report without the public-sample disclaimer', () => {
  const session = submitExam(createExamSession(['p1'], 90, 1_000, 'hidden-report'), {
    submittedAt: 2_000, durationUsedMs: 1_000, score: 100, gradingScope: 'trusted-hidden',
    results: [{ problemId: 'p1', verdict: 'passed', passedCount: 10, totalCount: 10, errorSummary: '' }],
  });
  render(<ExamWorkspace session={session} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('可信隐藏判题分')).toBeTruthy();
  expect(screen.getByText('隐藏用例仅在私有判题域执行')).toBeTruthy();
  expect(screen.queryByText('公开样例模拟分')).toBeNull();
});

it('renders four independent report dimensions without a composite score', () => {
  const session = submitExam(createExamSession(['p1'], 90, 1_000, 'report-1'), {
    submittedAt: 2_000,
    durationUsedMs: 1_000,
    score: 0,
    gradingScope: 'public-samples',
    results: [{ problemId: 'p1', verdict: 'failed', passedCount: 0, totalCount: 1, errorSummary: '' }],
    dimensions: {
      algorithmAbility: { status: 'observed', value: 0, confidence: 'low', evidenceRefs: ['result:p1'], rationale: 'Public samples only.' },
      independentCompletion: { status: 'observed', value: 100, confidence: 'high', evidenceRefs: ['answer:p1'], rationale: 'No AI.' },
      hintDependence: { status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale: 'No hint evidence.' },
      aiCollaboration: { status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale: 'No collaboration evidence.' },
    },
  });
  render(<ExamWorkspace session={session} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  expect(screen.getByText('Algorithm ability')).toBeTruthy();
  expect(screen.getByText('Independent completion')).toBeTruthy();
  expect(screen.getByText('Hint dependence')).toBeTruthy();
  expect(screen.getByText('AI collaboration')).toBeTruthy();
  expect(screen.queryByText(/overall|composite/i)).toBeNull();
});

it('uses an in-page confirmation before the irreversible submission', () => {
  render(<ExamWorkspace session={createExamSession(['p1'], 90, Date.now(), 'exam-1')} problems={{ p1: problem }} onChange={() => undefined} onExit={() => undefined} onRestart={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /提交考试/ }));
  expect(screen.getByRole('dialog', { name: '确认提交考试' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '确认并提交' })).toBeTruthy();
});

it('submits an authenticated exam through durable hidden judging and persists that scope', async () => {
  const session = updateExamAnswer(createExamSession(['p1'], 90, Date.now(), 'hidden-exam'), 'p1', 'python', 'print(2)');
  const onChange = vi.fn();
  const submitHidden = vi.fn().mockResolvedValue({ id: 'submission-1', problemId: 'p1', problemVersionId: 'p1@starter-v1', status: 'passed', submittedAt: Date.now(), completedAt: Date.now(), passedCount: 10, totalCount: 10, revision: 4 });
  render(<ExamWorkspace session={session} problems={{ p1: problem }} onChange={onChange} onExit={() => undefined} onRestart={() => undefined} submitHidden={submitHidden} />);
  fireEvent.click(screen.getByRole('button', { name: /提交考试/ }));
  fireEvent.click(screen.getByRole('button', { name: '确认并提交' }));
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect(submitHidden).toHaveBeenCalledWith(expect.objectContaining({ problemVersionId: 'p1@starter-v1', sourceCode: 'print(2)' }));
  expect(onChange.mock.calls.at(-1)?.[0].report).toMatchObject({ gradingScope: 'trusted-hidden', score: 100 });
});

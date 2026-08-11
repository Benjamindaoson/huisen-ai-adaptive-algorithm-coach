// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ProblemRecord } from '../lib/catalog';
import type { PracticeAttempt } from '../lib/practice';
import { CoachPanel } from './CoachPanel';

const problem: ProblemRecord = {
  id: 'p1', title: '数组题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test',
  sections: { description: '描述', input: '输入', output: '输出', examples: [] },
  solutions: { python: 'reference' }, tags: [], completeness: 'complete',
};
const attempt: PracticeAttempt = {
  id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'user code',
  outcome: 'wrong-answer', summary: '公开样例 0/1 通过', createdAt: '2026-08-11T00:00:00Z',
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('labels a configured provider response as model diagnosis', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', hintLevel: 1,
    judgeOutcome: 'wrong-answer', confidence: 0.8,
  }), { status: 200 })));

  const onIntervention = vi.fn();
  render(<CoachPanel problem={problem} attempt={attempt} mastery={[]} coachUrl="http://127.0.0.1:8790" onIntervention={onIntervention} />);
  fireEvent.click(screen.getByRole('button', { name: '1 · 定位' }));

  expect(await screen.findByText(/模型建议优先检查边界条件/)).toBeTruthy();
  expect(screen.getByText('模型诊断 · 置信度 80%')).toBeTruthy();
  expect(screen.queryByText('展开完整参考代码')).toBeNull();
  expect(onIntervention).toHaveBeenNthCalledWith(1, 'hint-requested', 1, 'a1');
  expect(onIntervention).toHaveBeenNthCalledWith(2, 'hint-received', 1, 'a1');
});

it('shows a real executed Agent trace when the learning gateway is configured', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    version: 1, traceId: 'trace-1', mode: 'deterministic', judgeOutcome: 'failed',
    hypothesis: { message: '输入解析可能有误', confidence: 0.82, proven: false, evidenceRefs: ['judge:p1:public'] },
    evidence: [{ ref: 'problem:p1', kind: 'problem', title: '数组题', text: '描述', skillIds: ['array'], verification: 'candidate', score: 0.8, excerpt: '连续数组' }],
    nextAction: '逐行检查输入结构',
    masteryImpact: { probability: 0.18, confidence: 0.22, effectiveEvidence: 0.75, needsTransfer: false, evidenceRefs: ['attempt:a1'], observations: [{ kind: 'failure', evidenceRef: 'attempt:a1' }] },
    tools: [
      { id: 'tool-1', role: 'diagnostician', name: 'retrieve_evidence', status: 'completed', startedAt: 1, endedAt: 2, durationMs: 1, input: { problemId: 'p1' }, summary: '检索到 1 条证据', evidenceRefs: ['problem:p1'] },
      { id: 'tool-2', role: 'diagnostician', name: 'inspect_code', status: 'completed', startedAt: 2, endedAt: 3, durationMs: 1, input: { problemId: 'p1' }, summary: '执行静态检查', evidenceRefs: ['judge:p1:public'] },
    ],
    handoffs: [{ traceId: 'trace-1', from: 'diagnostician', to: 'tutor', task: '选择动作', allowedTools: ['select_tutor_action'], evidenceRefs: ['judge:p1:public'], remainingBudget: 2, result: '输入解析可能有误', confidence: 0.82 }],
  }), { status: 200 })));

  render(<CoachPanel problem={problem} attempt={attempt} mastery={[]} coachUrl="" agentUrl="http://127.0.0.1:8787" />);
  fireEvent.click(screen.getByRole('button', { name: '1 · 定位' }));

  expect(await screen.findByText('输入解析可能有误')).toBeTruthy();
  expect(screen.getByText('确定性 Agent · 置信度 82%')).toBeTruthy();
  expect(screen.getByText(/掌握概率 18%/)).toBeTruthy();
  expect(screen.getByText('逐行检查输入结构')).toBeTruthy();
  fireEvent.click(screen.getByText(/已执行工具 2/));
  expect(screen.getByText(/执行静态检查/)).toBeTruthy();
});

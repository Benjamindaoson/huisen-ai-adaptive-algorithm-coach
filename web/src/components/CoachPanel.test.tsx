import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ProblemRecord } from '../lib/catalog';
import type { PracticeAttempt } from '../lib/practice';
import { CoachPanel } from './CoachPanel';

const problem: ProblemRecord = {
  id: 'p1', title: '数组题', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test',
  sections: { description: '描述', input: '输入', output: '输出', examples: [] },
  solutions: { python: 'print(1)' }, tags: [], completeness: 'complete',
};
const attempt: PracticeAttempt = {
  id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(0)', outcome: 'wrong-answer',
  summary: '公开样例 0/1 通过', createdAt: '2026-08-11T00:00:00Z',
  evidence: { failedCase: { name: '示例 1', stdin: '1', expectedOutput: '1', actualOutput: '0', verdict: 'wrong-answer' } },
};

describe('CoachPanel', () => {
  it('shows the exact evidence source and four progressive levels', () => {
    const html = renderToStaticMarkup(<CoachPanel problem={problem} attempt={attempt} mastery={[]} coachUrl="" />);
    expect(html).toContain('本地证据诊断');
    expect(html).toContain('公开样例 0/1 通过');
    expect(html).toContain('预期 1 · 实际 0');
    expect(html).toContain('1 · 定位');
    expect(html).toContain('4 · 完整解法');
  });

  it('disables diagnosis when there is no attempt evidence', () => {
    const html = renderToStaticMarkup(<CoachPanel problem={problem} mastery={[]} coachUrl="" />);
    expect(html).toContain('先运行或提交一次代码');
    expect(html).toContain('disabled=""');
  });
});

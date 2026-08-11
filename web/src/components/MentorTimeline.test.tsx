// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import type { ProblemRecord } from '../lib/catalog';
import type { PracticeAttempt } from '../lib/practice';
import { MentorTimeline } from './MentorTimeline';

const problem: ProblemRecord = {
  id: 'p1', title: '数组边界', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test', tags: [], completeness: 'complete', skills: ['array'],
  sections: { description: '描述', input: '输入', output: '输出', examples: [] }, solutions: { javascript: 'answer' },
};
const attempt: PracticeAttempt = { id: 'a1', problemId: 'p1', language: 'javascript', mode: 'sample-submit', codeSnapshot: 'for(let i=0;i<=a.length;i++){}', outcome: 'wrong-answer', summary: '公开样例 0/1', passedCount: 0, totalCount: 1, createdAt: '2026-08-11T00:00:00Z' };

function response(phase: 'awaiting-prediction' | 'awaiting-edit') {
  return {
    version: 1,
    session: {
      version: 1, id: 'session-1', learnerId: 'learner-a', problemId: 'p1', phase, mode: 'deepseek', model: 'deepseek-v4-flash', judgeOutcome: 'wrong-answer', nextAction: phase === 'awaiting-prediction' ? '预测访问的下标' : '只修改循环上界',
      timeline: [
        { id: 'e1', type: 'observation', title: '我观察到了什么', detail: '公开样例 0/1', at: '2026-08-11T00:00:00Z', evidenceRefs: ['judge:p1:public'], status: 'complete' },
        { id: 'e2', type: phase === 'awaiting-prediction' ? 'learner-question' : 'learner-action', title: phase === 'awaiting-prediction' ? '先预测，再修改' : '建议你下一步只改哪里', detail: phase === 'awaiting-prediction' ? '当 i 等于 length 时访问什么？' : '只修改循环上界', at: '2026-08-11T00:00:01Z', evidenceRefs: ['ast:line:1'], status: 'unverified' },
      ],
      twin: { version: 1, learnerId: 'learner-a', updatedAt: '2026-08-11T00:00:00Z', skills: {}, lastChanges: [] },
    },
    executions: [], provider: { mode: 'deepseek', model: 'deepseek-v4-flash', calls: 2, inputTokens: 100, outputTokens: 30, latencyMs: 420 },
    platform: { storage: 'postgres', identity: 'signed' },
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('keeps a live Mentor timeline beside the editor and closes the prediction loop', async () => {
  let mentorCall = 0;
  const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => {
    const url = String(_input);
    if (url.endsWith('/auth/anonymous')) return Promise.resolve(new Response(JSON.stringify({ version: 1, learnerId: 'learner-a', token: 'signed-token', expiresAt: '2026-08-12T00:00:00Z', mode: 'signed' }), { status: 201 }));
    mentorCall += 1;
    if (mentorCall === 1) return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
    return Promise.resolve(new Response(JSON.stringify(response(mentorCall === 2 ? 'awaiting-prediction' : 'awaiting-edit')), { status: mentorCall === 2 ? 201 : 200 }));
  });
  vi.stubGlobal('fetch', fetcher);
  render(<StrictMode><MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} /></StrictMode>);
  expect(await screen.findByText('我观察到了什么')).toBeTruthy();
  expect(screen.getByText(/DeepSeek · deepseek-v4-flash/)).toBeTruthy();
  expect(screen.getByText('PostgreSQL 持久化 · 签名身份')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('你的状态预测'), { target: { value: '会访问 length 下标并越界' } });
  fireEvent.click(screen.getByRole('button', { name: '提交预测' }));
  expect(await screen.findByText('建议你下一步只改哪里')).toBeTruthy();
  expect(fetcher.mock.calls.some(([url]) => String(url).includes('/mentor/sessions/session-1/turns'))).toBe(true);
});

it('labels the non-model local fallback honestly when the service is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
  render(<MentorTimeline learnerId="learner-a" agentUrl="http://127.0.0.1:8787" problem={problem} attempt={attempt} sampleCases={[]} />);
  expect(await screen.findByText('本地静态回退 · 未验证')).toBeTruthy();
  expect(screen.getByText(/没有伪造模型诊断/)).toBeTruthy();
});

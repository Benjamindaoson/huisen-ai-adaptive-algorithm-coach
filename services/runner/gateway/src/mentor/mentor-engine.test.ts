import { describe, expect, it, vi } from 'vitest';
import type { MentorModelAdapter, MentorModelResult } from './deepseek-provider.js';
import { createCorpusRetriever, type MentorRetrievalIndex } from './corpus-retrieval.js';
import { runMentorTurn } from './mentor-engine.js';

const index: MentorRetrievalIndex = {
  version: 1, problemCount: 1, documentCount: 2,
  documents: [
    { ref: 'problem:p1', kind: 'problem', title: '窗口最大值', text: '数组滑动窗口边界', skillIds: ['array'], verification: 'verified', authoritative: true, metadata: {} },
    { ref: 'misconception:off-by-one', kind: 'misconception', title: '边界误区', text: '循环右边界多走一步', skillIds: ['array'], verification: 'candidate', authoritative: false, metadata: { misconceptionId: 'off-by-one' } },
  ],
};

const input = {
  version: 1 as const,
  learnerId: 'learner-a',
  problem: { id: 'p1', title: '窗口最大值', description: '求数组窗口最大值', input: '第一行 n，第二行数组', output: '最大值', skillIds: ['array'], publicInputs: ['4\n1 2 3 4'] },
  attempt: { id: 'a1', language: 'javascript' as const, outcome: 'failed' as const, summary: '0/2', sourceCode: 'function solve(a){ for(let i=0;i<=a.length;i++){ if(a[i]>0) return a[i]; }}', passedCount: 0, totalCount: 2 },
};

function modelResult(toolCalls: MentorModelResult['toolCalls'], content = ''): MentorModelResult {
  return { model: 'deepseek-v4-flash', content, finishReason: toolCalls.length ? 'tool_calls' : 'stop', toolCalls, usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 }, latencyMs: 15 };
}

function sequenceModel(results: MentorModelResult[]): MentorModelAdapter & { complete: ReturnType<typeof vi.fn> } {
  const complete = vi.fn();
  for (const result of results) complete.mockResolvedValueOnce(result);
  return { mode: 'deepseek', model: 'deepseek-v4-flash', complete };
}

describe('dynamic Mentor engine', () => {
  it('executes model-selected tools with arguments and replans from tool observations', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'c1', name: 'inspect_syntax', arguments: { focus: 'loop-boundary' } }]),
      modelResult([{ id: 'c2', name: 'search_evidence', arguments: { query: '窗口边界', limit: 3 } }]),
      modelResult([{ id: 'c3', name: 'ask_learner', arguments: { question: '当 i 等于数组长度时会访问什么？', expectedConcept: '越界', evidenceRefs: ['ast:line:1'] } }]),
    ]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-1', now: () => new Date('2026-08-11T00:00:00Z') });
    expect(result.session).toMatchObject({ id: 'session-1', mode: 'deepseek', phase: 'awaiting-prediction', judgeOutcome: 'failed' });
    expect(result.executions.map((item) => [item.tool, item.arguments])).toEqual([
      ['inspect_syntax', { focus: 'loop-boundary' }],
      ['search_evidence', { query: '窗口边界', limit: 3 }],
      ['ask_learner', { question: '当 i 等于数组长度时会访问什么？', expectedConcept: '越界', evidenceRefs: ['ast:line:1'] }],
    ]);
    expect(model.complete).toHaveBeenCalledTimes(3);
    expect(model.complete.mock.calls[1][0].messages.some((message: { role: string }) => message.role === 'tool')).toBe(true);
    expect(result.session.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(['observation', 'tool', 'hypothesis', 'learner-question']));
  });

  it('allows an evidence-sufficient model to finish early', async () => {
    const model = sequenceModel([modelResult([{ id: 'finish-1', name: 'finish', arguments: { summary: '已有充分证据', nextAction: '只修改循环上界并重新运行', status: 'awaiting-edit' } }])]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-2', now: () => new Date('2026-08-11T00:00:00Z') });
    expect(result.session.phase).toBe('awaiting-edit');
    expect(result.session.nextAction).toBe('只修改循环上界并重新运行');
    expect(result.executions).toHaveLength(1);
    expect(model.complete).toHaveBeenCalledOnce();
  });

  it('rejects invalid model tools and continues with an honest deterministic fallback', async () => {
    const model = sequenceModel([modelResult([{ id: 'bad', name: 'declare_passed', arguments: { verdict: 'passed' } }])]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-3', now: () => new Date('2026-08-11T00:00:00Z') });
    expect(result.session.mode).toBe('fallback');
    expect(result.session.judgeOutcome).toBe('failed');
    expect(result.session.phase).toBe('awaiting-prediction');
    expect(result.session.timeline.some((event) => event.type === 'rejected-model-action')).toBe(true);
    expect(result.executions.some((item) => item.tool === 'inspect_syntax')).toBe(true);
  });

  it('returns a rejected tool result to the model and lets it self-correct before fallback', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'invalid', name: 'inspect_syntax', arguments: { focus: 3 } }]),
      modelResult([{ id: 'corrected', name: 'inspect_syntax', arguments: { focus: 'loop-boundary' } }]),
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '边界状态是什么？', expectedConcept: '越界', evidenceRefs: ['ast:current'] } }]),
    ]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-correction' });
    expect(result.session.mode).toBe('deepseek');
    expect(result.executions.map((item) => item.tool)).toEqual(['inspect_syntax', 'ask_learner']);
    expect(result.session.timeline).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'rejected-model-action', status: 'rejected' })]));
    expect(model.complete).toHaveBeenCalledTimes(3);
  });

  it('uses the learner prediction to choose a smaller next intervention', async () => {
    const first = await runMentorTurn(input, { retriever: createCorpusRetriever(index), id: () => 'session-4', now: () => new Date('2026-08-11T00:00:00Z') });
    const second = await runMentorTurn({ ...input, session: first.session, learnerResponse: 'i 等于 length 时会数组越界' }, { retriever: createCorpusRetriever(index), now: () => new Date('2026-08-11T00:01:00Z') });
    expect(second.session.phase).toBe('awaiting-edit');
    expect(second.session.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(['learner-response', 'learner-action']));
    expect(second.session.nextAction).toContain('循环上界');
    expect(second.session.twin.skills.array.misconceptions['off-by-one'].evidenceRefs.length).toBeGreaterThan(0);
  });

  it('promotes a hypothesis only after trusted differential execution reproduces it', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'generate', name: 'generate_counterexample', arguments: { strategy: 'boundary' } }]),
      modelResult([{ id: 'verify', name: 'verify_hypothesis', arguments: { hypothesisId: 'hypothesis:off-by-one', candidateId: 'candidate:1' } }]),
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '零边界时哪个状态先偏离？', expectedConcept: '下标', evidenceRefs: ['execution:candidate:1'] } }]),
    ]);
    const executeSubmission = vi.fn(async () => ({ kind: 'success' as const, stdout: 'wrong' }));
    const result = await runMentorTurn(input, {
      model, retriever: createCorpusRetriever(index), id: () => 'session-5',
      expectedFor: async () => ({ output: 'ok', evidenceRef: 'trusted:reference:candidate:1', authority: 'human-reviewed' }),
      executeSubmission,
    });
    expect(executeSubmission).toHaveBeenCalledWith(expect.objectContaining({ sourceCode: input.attempt.sourceCode, candidateInput: expect.any(String) }));
    expect(result.session.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'verification', status: 'supported' }),
    ]));
  });

  it('surfaces interprocedural structure and parsed runtime values as diagnostic evidence', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'inspect', name: 'inspect_syntax', arguments: { focus: 'state divergence' } }]),
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '哪个状态先偏离？', expectedConcept: 'i', evidenceRefs: ['runtime:probe:1:1'] } }]),
    ]);
    const result = await runMentorTurn(input, {
      model, retriever: createCorpusRetriever(index), id: () => 'session-semantic-trace',
      executeInstrumented: async () => ({
        kind: 'success', stdout: '',
        stderr: '__mentorTrace:{"version":1,"probeId":"probe:1","line":1,"state":{"i":"4","a":"[1,2,3,4]"}}',
      }),
    });
    expect(result.session.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '我构建了跨函数语义图', status: 'complete' }),
      expect.objectContaining({ title: '我捕获了运行时状态', detail: expect.stringContaining('i=4') }),
    ]));
  });

  it('treats a pass after Mentor help as assisted and starts a different same-skill transfer task', async () => {
    const transferIndex: MentorRetrievalIndex = {
      ...index,
      problemCount: 2,
      documentCount: 3,
      documents: [...index.documents, { ref: 'problem:p2', kind: 'problem', title: '区间边界迁移题', text: '不同情境的数组边界', skillIds: ['array'], verification: 'verified', authoritative: true, metadata: { problemId: 'p2' } }],
    };
    const first = await runMentorTurn(input, { retriever: createCorpusRetriever(transferIndex), id: () => 'session-6' });
    const predicted = await runMentorTurn({ ...input, session: first.session, learnerResponse: '会访问 length 下标并越界' }, { retriever: createCorpusRetriever(transferIndex) });
    const passed = await runMentorTurn({ ...input, session: predicted.session, attempt: { ...input.attempt, id: 'a2', outcome: 'passed', summary: '2/2' } }, { retriever: createCorpusRetriever(transferIndex) });
    expect(passed.session.phase).toBe('transfer');
    expect(passed.session.nextAction).toContain('区间边界迁移题');
    expect(passed.session.twin.skills.array.assistedPasses).toBe(1);
    expect(passed.session.timeline).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'verification', status: 'supported' })]));
  });
});

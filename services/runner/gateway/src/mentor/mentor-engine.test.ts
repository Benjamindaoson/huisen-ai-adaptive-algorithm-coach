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
  it('does not present capability changes left over from a previous mentor turn', async () => {
    const result = await runMentorTurn(input, {
      retriever: createCorpusRetriever(index),
      id: () => 'session-clean-capability-changes',
      now: () => new Date('2026-08-11T00:00:00Z'),
      initialTwin: {
        version: 1,
        learnerId: input.learnerId,
        updatedAt: '2026-08-10T00:00:00.000Z',
        skills: {},
        lastChanges: [{
          skillId: 'array',
          prior: 0.25,
          posterior: 0.19,
          evidenceRef: 'mentor:previous-turn',
          kind: 'assisted-pass',
        }],
      },
    });

    expect(result.session.twin.lastChanges).toEqual([]);
  });

  it('executes model-selected tools with arguments and replans from tool observations', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'c1', name: 'inspect_syntax', arguments: { focus: 'loop-boundary' } }]),
      modelResult([{ id: 'c2', name: 'search_evidence', arguments: { query: '窗口边界', limit: 3 } }]),
      modelResult([{ id: 'c3', name: 'ask_learner', arguments: { question: '当 i 等于数组长度时会访问什么？', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['ast:line:1'] } }]),
    ]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-1', now: () => new Date('2026-08-11T00:00:00Z') });
    expect(result.session).toMatchObject({ id: 'session-1', mode: 'deepseek', phase: 'awaiting-prediction', judgeOutcome: 'failed' });
    expect(result.executions.map((item) => [item.tool, item.arguments])).toEqual([
      ['inspect_syntax', { focus: 'loop-boundary' }],
      ['search_evidence', { query: '窗口边界', limit: 3 }],
      ['ask_learner', { question: '当 i 等于数组长度时会访问什么？', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['ast:line:1'] }],
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

  it('resumes deterministic fallback without repeating evidence tools completed before a provider timeout', async () => {
    const complete = vi.fn()
      .mockResolvedValueOnce(modelResult([{ id: 'inspect-before-timeout', name: 'inspect_syntax', arguments: { focus: 'loop-boundary' } }]))
      .mockResolvedValueOnce(modelResult([{ id: 'search-before-timeout', name: 'search_evidence', arguments: { query: '窗口边界', limit: 3 } }]))
      .mockRejectedValueOnce(new Error('provider timeout'));
    const model: MentorModelAdapter = { mode: 'deepseek', model: 'deepseek-v4-flash', complete };

    const result = await runMentorTurn(input, {
      model,
      retriever: createCorpusRetriever(index),
      id: () => 'session-resume-fallback',
      now: () => new Date('2026-08-11T00:00:00Z'),
    });

    expect(result.session.mode).toBe('fallback');
    expect(result.session.phase).toBe('awaiting-prediction');
    expect(result.executions.map((item) => item.tool)).toEqual([
      'inspect_syntax',
      'search_evidence',
      'ask_learner',
    ]);
  });

  it('reports a recovered model-backed turn as DeepSeek instead of inheriting an earlier fallback mode', async () => {
    const unavailableModel: MentorModelAdapter = {
      mode: 'deepseek',
      model: 'deepseek-v4-flash',
      complete: vi.fn().mockRejectedValue(new Error('provider timeout')),
    };
    const degraded = await runMentorTurn(input, {
      model: unavailableModel,
      retriever: createCorpusRetriever(index),
      id: () => 'session-recovers-provider-mode',
    });
    const recoveredModel = sequenceModel([
      modelResult([{ id: 'recovered-ask', name: 'ask_learner', arguments: { question: '先说出边界状态。', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['ast:current'] } }]),
    ]);

    const recovered = await runMentorTurn({
      ...input,
      session: degraded.session,
      attempt: { ...input.attempt, id: 'a-recovered' },
    }, {
      model: recoveredModel,
      retriever: createCorpusRetriever(index),
    });

    expect(recovered.provider).toMatchObject({ mode: 'deepseek', calls: 1, inputTokens: 20, outputTokens: 10 });
    expect(recovered.session).toMatchObject({ mode: 'deepseek', model: 'deepseek-v4-flash' });
  });

  it('returns a rejected tool result to the model and lets it self-correct before fallback', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'invalid', name: 'inspect_syntax', arguments: { focus: 3 } }]),
      modelResult([{ id: 'corrected', name: 'inspect_syntax', arguments: { focus: 'loop-boundary' } }]),
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '边界状态是什么？', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['ast:current'] } }]),
    ]);
    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-correction' });
    expect(result.session.mode).toBe('deepseek');
    expect(result.executions.map((item) => item.tool)).toEqual(['inspect_syntax', 'ask_learner']);
    expect(result.session.timeline).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'rejected-model-action', status: 'rejected' })]));
    expect(model.complete).toHaveBeenCalledTimes(3);
  });

  it('rejects a third corpus search and lets the model replan to a learner action', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'search-1', name: 'search_evidence', arguments: { query: '窗口边界', limit: 3 } }]),
      modelResult([{ id: 'search-2', name: 'search_evidence', arguments: { query: '数组越界误区', limit: 3 } }]),
      modelResult([{ id: 'search-3', name: 'search_evidence', arguments: { query: '循环下标反例', limit: 3 } }]),
      modelResult([{ id: 'ask-after-budget', name: 'ask_learner', arguments: { question: '先预测边界状态。', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['problem:p1'] } }]),
    ]);

    const result = await runMentorTurn(input, {
      model,
      retriever: createCorpusRetriever(index),
      id: () => 'session-retrieval-budget',
    });

    expect(result.session.mode).toBe('deepseek');
    expect(result.executions.map((execution) => execution.tool)).toEqual([
      'search_evidence',
      'search_evidence',
      'ask_learner',
    ]);
    expect(result.session.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'rejected-model-action', detail: expect.stringContaining('search_evidence') }),
      expect.objectContaining({ type: 'learner-question', title: '先预测，再修改' }),
    ]));
  });

  it('uses the learner prediction to choose a smaller next intervention', async () => {
    const first = await runMentorTurn(input, { retriever: createCorpusRetriever(index), id: () => 'session-4', now: () => new Date('2026-08-11T00:00:00Z') });
    const second = await runMentorTurn({ ...input, session: first.session, learnerResponse: 'i 等于 length 时会数组越界' }, { retriever: createCorpusRetriever(index), now: () => new Date('2026-08-11T00:01:00Z') });
    expect(second.session.phase).toBe('awaiting-edit');
    expect(second.session.timeline.map((event) => event.type)).toEqual(expect.arrayContaining(['learner-response', 'learner-action']));
    expect(second.session.nextAction).toContain('循环上界');
    expect(second.session.twin.skills.array.misconceptions['off-by-one'].evidenceRefs.length).toBeGreaterThan(0);
  });

  it('accepts a concrete concept shared by a verbose expected concept and the learner explanation', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'ask-comparator', name: 'ask_learner', arguments: {
        question: '总分相同时，A 有 3 个 10 分、B 有 2 个 10 分，谁在前面？为什么？',
        expectedConcept: '先比10分数量再比9分数量的字典序比较',
        targetSkillId: 'array',
        evidenceRefs: ['problem:p1'],
      } }]),
    ]);
    const asked = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-semantic-prediction' });

    const assessed = await runMentorTurn({
      ...input,
      session: asked.session,
      learnerResponse: '选手A，因为总分相同先比较10分数量，A有3个，B有2个。',
    }, { retriever: createCorpusRetriever(index) });

    expect(assessed.session.phase).toBe('awaiting-edit');
    expect(assessed.session.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'learner-action', title: '概念判断正确，缩小到实现修改' }),
    ]));
    expect(assessed.session.twin.lastChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 'array', kind: 'prediction-correct' }),
    ]));
  });

  it('keeps an ambiguous prediction in clarification without recording failure evidence', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'ask-uncertain', name: 'ask_learner', arguments: {
        question: '总分相同时应该先比较什么？',
        expectedConcept: '先比10分数量再比9分数量的字典序比较',
        targetSkillId: 'array',
        evidenceRefs: ['problem:p1'],
      } }]),
    ]);
    const asked = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-uncertain-prediction' });

    const assessed = await runMentorTurn({
      ...input,
      session: asked.session,
      learnerResponse: '我不知道，先试试代码。',
    }, { retriever: createCorpusRetriever(index) });

    expect(assessed.session.phase).toBe('awaiting-prediction');
    expect(assessed.session.pendingPrompt).toBeDefined();
    expect(assessed.session.twin.skills.array).toBeUndefined();
    expect(assessed.session.nextAction).toContain('还不能可靠判断');
    expect(assessed.session.nextAction).not.toMatch(/循环变量|访问下标/);
  });

  it('recognizes an instantiated input-row explanation without accepting a wrong total or bare guess', async () => {
    const structuredInput = {
      ...input,
      problem: { ...input.problem, skillIds: ['io-parsing'] },
    };
    const model = sequenceModel([
      modelResult([{ id: 'ask-input-rows', name: 'ask_learner', arguments: {
        question: '如果 M=3、N=5，输入文件总共有多少行数据（包括第一行）？',
        expectedConcept: '输入行数 = 1 + M，即第一行参数行加上M行评分行',
        targetSkillId: 'io-parsing',
        evidenceRefs: ['problem:p1'],
      } }]),
    ]);
    const asked = await runMentorTurn(structuredInput, { model, retriever: createCorpusRetriever(index), id: () => 'session-input-rows' });

    const accepted = await runMentorTurn({
      ...structuredInput,
      session: asked.session,
      learnerResponse: '一共4行：第一行是M,N，后面还有M=3行评分数据。',
    }, { retriever: createCorpusRetriever(index) });
    const wrong = await runMentorTurn({
      ...structuredInput,
      session: asked.session,
      learnerResponse: '一共5行：第一行加上后面的评分数据。',
    }, { retriever: createCorpusRetriever(index) });
    const bareGuess = await runMentorTurn({
      ...structuredInput,
      session: asked.session,
      learnerResponse: '我猜是4。',
    }, { retriever: createCorpusRetriever(index) });

    expect(accepted.session.phase).toBe('awaiting-edit');
    expect(accepted.session.twin.lastChanges.map((change) => change.skillId)).toEqual(['io-parsing']);
    expect(wrong.session.phase).toBe('awaiting-prediction');
    expect(wrong.session.twin.lastChanges).toEqual([]);
    expect(bareGuess.session.phase).toBe('awaiting-prediction');
    expect(bareGuess.session.twin.lastChanges).toEqual([]);
  });

  it('projects a supported prediction only to the skill targeted by the learner question', async () => {
    const scopedInput = {
      ...input,
      problem: { ...input.problem, skillIds: ['io-parsing', 'array', 'sorting', 'interval'] },
    };
    const model = sequenceModel([
      modelResult([{ id: 'ask-sorting', name: 'ask_learner', arguments: {
        question: '总分相同时如何继续排序？',
        expectedConcept: '排序比较器逐级比较',
        targetSkillId: 'sorting',
        evidenceRefs: ['problem:p1'],
      } }]),
    ]);
    const asked = await runMentorTurn(scopedInput, { model, retriever: createCorpusRetriever(index), id: () => 'session-target-skill' });

    const assessed = await runMentorTurn({
      ...scopedInput,
      session: asked.session,
      learnerResponse: '使用排序比较器逐级比较每个分值的数量。',
    }, { retriever: createCorpusRetriever(index) });

    expect(asked.session.pendingPrompt?.targetSkillId).toBe('sorting');
    expect(assessed.session.twin.lastChanges.map((change) => change.skillId)).toEqual(['sorting']);
  });

  it('rejects a learner-question target outside the current problem skills and accepts a correction', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'ask-foreign', name: 'ask_learner', arguments: { question: '图状态是什么？', expectedConcept: '图', targetSkillId: 'graph', evidenceRefs: ['problem:p1'] } }]),
      modelResult([{ id: 'ask-corrected-skill', name: 'ask_learner', arguments: { question: '边界状态是什么？', expectedConcept: '越界', targetSkillId: 'array', evidenceRefs: ['problem:p1'] } }]),
    ]);

    const result = await runMentorTurn(input, { model, retriever: createCorpusRetriever(index), id: () => 'session-reject-foreign-skill' });

    expect(result.session.mode).toBe('deepseek');
    expect(result.session.pendingPrompt?.targetSkillId).toBe('array');
    expect(result.session.timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'rejected-model-action', detail: expect.stringContaining('target skill') }),
    ]));
  });

  it('uses a modeling question for an empty solution scaffold and debugging only after implementation', async () => {
    const scaffoldSource = `const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);
function solve(lines) {
  // 在这里编写你的解法
}
solve(lines);`;
    const scaffold = await runMentorTurn({ ...input, attempt: { ...input.attempt, id: 'a-scaffold', sourceCode: scaffoldSource } }, { retriever: createCorpusRetriever(index) });
    expect(scaffold.session.nextAction).toContain('输入');
    expect(scaffold.session.nextAction).toContain('输出');
    expect(scaffold.session.nextAction).not.toContain('哪个变量会首先偏离');

    const implemented = await runMentorTurn(input, { retriever: createCorpusRetriever(index) });
    expect(implemented.session.nextAction).toMatch(/length|下标|边界/);
  });

  it('starts a new evidence cycle when a later attempt needs fresh analysis', async () => {
    const first = await runMentorTurn(input, { retriever: createCorpusRetriever(index), id: () => 'session-new-cycle', now: () => new Date('2026-08-11T00:00:00Z') });
    const nextAttempt = { ...input.attempt, id: 'a-next', summary: '新一次运行', outcome: 'failed' as const };
    const second = await runMentorTurn({ ...input, session: first.session, attempt: nextAttempt }, { retriever: createCorpusRetriever(index), now: () => new Date('2026-08-11T00:02:00Z') });
    const currentObservation = [...second.session.timeline].reverse().find((event) => event.type === 'observation' && event.title === '判题器给出的确定事实');
    expect(currentObservation).toMatchObject({ detail: expect.stringContaining('新一次运行'), evidenceRefs: expect.arrayContaining(['attempt:a-next']) });
  });

  it('promotes a hypothesis only after trusted differential execution reproduces it', async () => {
    const model = sequenceModel([
      modelResult([{ id: 'generate', name: 'generate_counterexample', arguments: { strategy: 'boundary' } }]),
      modelResult([{ id: 'verify', name: 'verify_hypothesis', arguments: { hypothesisId: 'hypothesis:off-by-one', candidateId: 'candidate:1' } }]),
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '零边界时哪个状态先偏离？', expectedConcept: '下标', targetSkillId: 'array', evidenceRefs: ['execution:candidate:1'] } }]),
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
      modelResult([{ id: 'ask', name: 'ask_learner', arguments: { question: '哪个状态先偏离？', expectedConcept: 'i', targetSkillId: 'array', evidenceRefs: ['runtime:probe:1:1'] } }]),
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
    expect(passed.session.transferTask).toEqual({
      problemId: 'p2', title: '区间边界迁移题', skillIds: ['array'], evidenceRefs: ['problem:p2'],
    });
    expect(passed.session.twin.skills.array.assistedPasses).toBe(1);
    expect(passed.session.timeline).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'verification', status: 'supported' })]));
  });
});

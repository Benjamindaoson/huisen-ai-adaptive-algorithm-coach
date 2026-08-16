import { randomUUID } from 'node:crypto';
import type { AllowedLanguage } from '../validation.js';
import { analyzeProgram, instrumentSource, planCounterexamples, planRuntimeProbes, verifyHypothesis, type CodeIntelligenceReport, type CounterexampleCandidate, type ExecutionObservation, type ExpectedObservation } from './code-intelligence.js';
import { parseSource } from './code-parser.js';
import type { CorpusRetriever, MentorRetrievalResult } from './corpus-retrieval.js';
import type { MentorModelAdapter, MentorModelMessage } from './deepseek-provider.js';
import { createLearnerTwin, projectLearnerTwin, type LearnerTwin, type TwinObservationKind } from './learner-twin.js';
import { MENTOR_TOOL_DEFINITIONS, validateMentorToolCall, type MentorToolName } from './mentor-tools.js';
import { parseRuntimeTrace, type RuntimeTraceEvent } from './runtime-trace.js';
import { analyzeSemantics, type SemanticReport } from './semantic-analysis.js';

export type MentorPhase = 'observing' | 'awaiting-prediction' | 'awaiting-edit' | 'verifying' | 'transfer' | 'complete';
export type MentorTimelineType = 'observation' | 'hypothesis' | 'missing-evidence' | 'tool' | 'verification' | 'learner-question' | 'learner-response' | 'learner-action' | 'rejected-model-action';
export type MentorTimelineEvent = { id: string; type: MentorTimelineType; title: string; detail: string; at: string; evidenceRefs: string[]; status?: 'unverified' | 'supported' | 'rejected' | 'complete'; tool?: MentorToolName };
export type MentorSession = {
  version: 1;
  id: string;
  learnerId: string;
  problemId: string;
  phase: MentorPhase;
  mode: 'deepseek' | 'deterministic' | 'fallback';
  model?: string;
  judgeOutcome: string;
  nextAction: string;
  timeline: MentorTimelineEvent[];
  twin: LearnerTwin;
  lastAttemptId?: string;
  pendingPrompt?: { question: string; expectedConcept: string; targetSkillId?: string; evidenceRefs: string[]; misconceptionId?: string };
  transferTask?: { problemId: string; title: string; skillIds: string[]; evidenceRefs: string[] };
};
export type MentorTurnInput = {
  version: 1;
  learnerId: string;
  session?: MentorSession;
  learnerResponse?: string;
  problem: { id: string; title: string; description: string; input: string; output: string; skillIds: string[]; publicInputs: string[] };
  attempt: { id: string; language: AllowedLanguage; outcome: string; summary: string; sourceCode: string; passedCount?: number; totalCount?: number };
};
export type MentorToolExecution = { id: string; tool: MentorToolName; arguments: Record<string, unknown>; summary: string; evidenceRefs: string[]; durationMs: number };
export type MentorTurnResult = { version: 1; session: MentorSession; executions: MentorToolExecution[]; provider: { mode: MentorSession['mode']; model?: string; calls: number; inputTokens: number; outputTokens: number; latencyMs: number } };

type RuntimeContext = { report?: CodeIntelligenceReport; semantic?: SemanticReport; traces?: RuntimeTraceEvent[]; evidence?: MentorRetrievalResult[]; candidates?: CounterexampleCandidate[] };
export type MentorRuntimeOptions = {
  model?: MentorModelAdapter;
  retriever: CorpusRetriever;
  id?: () => string;
  now?: () => Date;
  initialTwin?: LearnerTwin;
  expectedFor?: (request: { problem: MentorTurnInput['problem']; candidate: CounterexampleCandidate }) => Promise<ExpectedObservation | null>;
  executeSubmission?: (request: { language: AllowedLanguage; sourceCode: string; candidateInput: string }) => Promise<ExecutionObservation>;
  executeInstrumented?: (request: { language: AllowedLanguage; instrumentedSource: string; candidateInput: string }) => Promise<ExecutionObservation>;
};

function addEvent(session: MentorSession, now: Date, event: Omit<MentorTimelineEvent, 'id' | 'at'>): void {
  session.timeline.push({ ...event, id: `${session.id}:event:${session.timeline.length + 1}`, at: now.toISOString() });
  session.timeline = session.timeline.slice(-200);
}

function createSession(input: MentorTurnInput, id: string, now: Date, mode: MentorSession['mode'], model?: string): MentorSession {
  const session: MentorSession = {
    version: 1, id, learnerId: input.learnerId, problemId: input.problem.id, phase: 'observing', mode,
    ...(model ? { model } : {}), judgeOutcome: input.attempt.outcome, nextAction: '正在收集证据。', timeline: [],
    twin: createLearnerTwin(input.learnerId, now), lastAttemptId: input.attempt.id,
  };
  addAttemptObservation(session, input, now);
  return session;
}

function addAttemptObservation(session: MentorSession, input: MentorTurnInput, now: Date): void {
  addEvent(session, now, {
    type: 'observation', title: '判题器给出的确定事实',
    detail: `${input.attempt.summary}；结果 ${input.attempt.outcome}`,
    evidenceRefs: [`judge:${input.problem.id}:public`, `attempt:${input.attempt.id}`], status: 'complete',
  });
}

function toolMessage(callId: string, content: unknown): MentorModelMessage {
  return { role: 'tool', tool_call_id: callId, content: JSON.stringify(content).slice(0, 12_000) };
}

async function executeTool(
  session: MentorSession,
  input: MentorTurnInput,
  context: RuntimeContext,
  name: MentorToolName,
  args: Record<string, unknown>,
  options: MentorRuntimeOptions,
  now: Date,
): Promise<{ result: unknown; summary: string; evidenceRefs: string[]; stop: boolean }> {
  if (name === 'inspect_syntax') {
    const parsed = await parseSource({ language: input.attempt.language, sourceCode: input.attempt.sourceCode });
    context.report = analyzeProgram({ parsed, sourceCode: input.attempt.sourceCode });
    context.semantic = analyzeSemantics({ parsed, report: context.report, sourceCode: input.attempt.sourceCode });
    const evidenceRefs = [...context.report.controlFlow.nodes.slice(0, 8).map((node) => node.id), ...parsed.errors.map((item) => item.evidenceRef)];
    addEvent(session, now, { type: 'tool', tool: name, title: '我检查了代码结构', detail: `${parsed.parser}；${context.report.controlFlow.nodes.length} 个控制节点；${context.report.symbols.length} 个 def-use 符号`, evidenceRefs, status: parsed.degraded ? 'unverified' : 'complete' });
    addEvent(session, now, {
      type: 'observation', title: '我构建了跨函数语义图',
      detail: `${context.semantic.precision}；${context.semantic.functions.length} 个函数；${context.semantic.callGraph.length} 条直接调用；${context.semantic.reachingDefinitions.length} 条 reaching-definition 证据。`,
      evidenceRefs: [...context.semantic.functions.map((item) => item.evidenceRef), ...context.semantic.callGraph.map((item) => item.evidenceRef)].slice(0, 12),
      status: parsed.degraded ? 'unverified' : 'complete',
    });
    const hypotheses = [...context.report.hypotheses];
    if (/<=\s*[A-Za-z_$][\w$]*\.length/.test(input.attempt.sourceCode)) hypotheses.unshift({ id: 'hypothesis:off-by-one', message: '循环上界可能访问 length 位置，需要失败输入验证。', status: 'unverified', evidenceRefs: ['code:line:1'] });
    hypotheses.push(...context.semantic.pathRisks.map((risk) => ({ id: risk.id, message: risk.message, status: 'unverified' as const, evidenceRefs: risk.evidenceRefs })));
    for (const hypothesis of hypotheses.slice(0, 3)) addEvent(session, now, { type: 'hypothesis', title: '目前最可能的问题', detail: hypothesis.message, evidenceRefs: hypothesis.evidenceRefs, status: 'unverified' });
    const probes = planRuntimeProbes(context.report);
    let runtimeTrace: { kind: ExecutionObservation['kind']; traceCount: number; traceRefs: string[] } | undefined;
    if (options.executeInstrumented && input.problem.publicInputs[0] && probes.length) {
      const instrumented = instrumentSource({ language: input.attempt.language, sourceCode: input.attempt.sourceCode, probes });
      const observation = await options.executeInstrumented({ language: input.attempt.language, instrumentedSource: instrumented.instrumentedSource, candidateInput: input.problem.publicInputs[0] });
      context.traces = parseRuntimeTrace(observation.stderr ?? '');
      const traceCount = context.traces.length;
      runtimeTrace = { kind: observation.kind, traceCount, traceRefs: instrumented.traceRefs };
      addEvent(session, now, {
        type: 'observation', title: '我运行了诊断插桩副本',
        detail: `诊断运行 ${observation.kind}，捕获 ${traceCount} 条状态轨迹；正式判题仍使用原始代码。`,
        evidenceRefs: instrumented.traceRefs.map((ref) => `runtime:${ref}`), status: observation.kind === 'success' ? 'complete' : 'unverified',
      });
      if (context.traces.length) {
        const state = context.traces.slice(0, 3).flatMap((trace) => Object.entries(trace.state).map(([key, value]) => `${key}=${value}`)).slice(0, 8);
        addEvent(session, now, {
          type: 'observation', title: '我捕获了运行时状态', detail: state.length ? state.join('；') : '控制点已到达，但没有可安全读取的局部标量。',
          evidenceRefs: context.traces.map((trace) => trace.evidenceRef), status: 'complete',
        });
      }
    }
    return { result: { report: context.report, semantic: context.semantic, probes, ...(runtimeTrace ? { runtimeTrace, traces: context.traces } : {}) }, summary: `解析 ${context.report.controlFlow.nodes.length} 个控制节点和 ${context.semantic.callGraph.length} 条调用边`, evidenceRefs, stop: false };
  }
  if (name === 'search_evidence') {
    context.evidence = options.retriever.search({ text: String(args.query), skillIds: input.problem.skillIds, misconceptionIds: ['off-by-one'], limit: Number(args.limit) });
    const evidenceRefs = context.evidence.map((item) => item.ref);
    addEvent(session, now, { type: 'tool', tool: name, title: '我检索了完整题库证据', detail: `在 ${options.retriever.size} 条索引文档中找到 ${context.evidence.length} 条相关证据`, evidenceRefs, status: 'complete' });
    return { result: context.evidence.map(({ ref, kind, title, excerpt, verification, authoritative, score }) => ({ ref, kind, title, excerpt, verification, authoritative, score })), summary: `检索 ${context.evidence.length} 条证据`, evidenceRefs, stop: false };
  }
  if (name === 'generate_counterexample') {
    context.candidates = planCounterexamples({ inputDescription: input.problem.input, publicInputs: input.problem.publicInputs });
    const refs = context.candidates.map((item) => item.id);
    addEvent(session, now, { type: 'tool', tool: name, title: '我生成了待验证反例', detail: `${context.candidates.length} 个候选输入；它们尚不是正确性证据`, evidenceRefs: refs, status: 'unverified' });
    return { result: context.candidates.map(({ id, rationale }) => ({ id, rationale })), summary: `生成 ${context.candidates.length} 个候选反例`, evidenceRefs: refs, stop: false };
  }
  if (name === 'verify_hypothesis') {
    const hypothesisId = String(args.hypothesisId);
    const candidateId = String(args.candidateId);
    const candidate = context.candidates?.find((item) => item.id === candidateId);
    const baseRefs = [hypothesisId, candidateId];
    if (!candidate || !options.expectedFor || !options.executeSubmission) {
      addEvent(session, now, { type: 'missing-evidence', tool: name, title: '还缺什么证据', detail: '缺少候选输入、可信期望输出或可用执行器，因此不能把静态猜测升级为已验证结论。', evidenceRefs: baseRefs, status: 'unverified' });
      return { result: { status: 'unverified', missingEvidence: 'candidate, trusted expected output, or executor' }, summary: '缺少可验证执行证据', evidenceRefs: baseRefs, stop: false };
    }
    const verified = await verifyHypothesis({
      hypothesis: { id: hypothesisId, message: hypothesisId, evidenceRefs: [hypothesisId] },
      candidates: [candidate],
      expectedFor: (item) => options.expectedFor!({ problem: input.problem, candidate: item }),
      executeSubmission: (candidateInput) => options.executeSubmission!({ language: input.attempt.language, sourceCode: input.attempt.sourceCode, candidateInput }),
    });
    const supported = verified.status === 'supported';
    addEvent(session, now, {
      type: supported ? 'verification' : 'missing-evidence', tool: name,
      title: supported ? '诊断已被差分测试验证' : '诊断尚未被验证',
      detail: supported ? `候选 ${candidate.id}：期望 ${verified.expected}，实际 ${verified.actual}；期望依据 ${verified.expectedAuthority}` : (verified.missingEvidence ?? '没有候选复现该诊断。'),
      evidenceRefs: verified.evidenceRefs, status: supported ? 'supported' : 'unverified',
    });
    return { result: verified, summary: supported ? '差分测试支持该诊断' : '诊断仍待验证', evidenceRefs: verified.evidenceRefs, stop: false };
  }
  if (name === 'update_twin') {
    const misconceptionId = String(args.misconceptionId || '');
    session.twin = projectLearnerTwin(session.twin, [{
      kind: args.kind as TwinObservationKind, skillIds: args.skillIds as string[], evidenceRef: String(args.evidenceRef), at: now.toISOString(),
      ...(misconceptionId ? { misconceptionId } : {}),
    }], now);
    return { result: session.twin.lastChanges, summary: `更新 ${session.twin.lastChanges.length} 项学习者证据`, evidenceRefs: [String(args.evidenceRef)], stop: false };
  }
  if (name === 'ask_learner') {
    const evidenceRefs = args.evidenceRefs as string[];
    const targetSkillId = String(args.targetSkillId);
    if (!input.problem.skillIds.includes(targetSkillId)) throw new Error(`Invalid learner question target skill: ${targetSkillId}`);
    const misconception = context.evidence?.find((item) => item.kind === 'misconception')?.metadata.misconceptionId;
    session.pendingPrompt = { question: String(args.question), expectedConcept: String(args.expectedConcept), targetSkillId, evidenceRefs, ...(misconception ? { misconceptionId: String(misconception) } : {}) };
    session.phase = 'awaiting-prediction'; session.nextAction = String(args.question);
    addEvent(session, now, { type: 'learner-question', tool: name, title: '先预测，再修改', detail: String(args.question), evidenceRefs, status: 'unverified' });
    return { result: { phase: session.phase, question: session.nextAction }, summary: '等待学习者预测', evidenceRefs, stop: true };
  }
  if (name === 'finish') {
    session.phase = args.status as MentorPhase; session.nextAction = String(args.nextAction);
    addEvent(session, now, { type: 'learner-action', tool: name, title: String(args.summary), detail: session.nextAction, evidenceRefs: session.timeline.slice(-3).flatMap((item) => item.evidenceRefs).slice(-8), status: 'complete' });
    return { result: { phase: session.phase, nextAction: session.nextAction }, summary: 'Mentor 主动结束本轮', evidenceRefs: [], stop: true };
  }
  throw new Error(`Unsupported Mentor tool: ${name}`);
}

function hasEmptySolutionScaffold(language: AllowedLanguage, sourceCode: string): boolean {
  const clean = (value: string) => value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '')
    .replace(/\bpass\b/g, '')
    .replace(/[;\s]/g, '');
  if (language === 'javascript') {
    const body = sourceCode.match(/function\s+(?:solve|solution)\s*\([^)]*\)\s*\{([\s\S]*?)\}/i)?.[1]
      ?? sourceCode.match(/(?:const|let|var)\s+(?:solve|solution)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{([\s\S]*?)\}/i)?.[1];
    return body !== undefined && clean(body) === '';
  }
  if (language === 'python') {
    const body = sourceCode.match(/def\s+(?:solve|solution)\s*\([^)]*\)\s*:\s*((?:\r?\n[ \t]+[^\r\n]*)+)/i)?.[1];
    return body !== undefined && clean(body) === '';
  }
  return false;
}

async function deterministicPolicy(session: MentorSession, input: MentorTurnInput, context: RuntimeContext, options: MentorRuntimeOptions, executions: MentorToolExecution[], now: Date): Promise<void> {
  const modeling = hasEmptySolutionScaffold(input.attempt.language, input.attempt.sourceCode);
  const boundary = /<=\s*[A-Za-z_$][\w$]*\.length/.test(input.attempt.sourceCode);
  const question = modeling
    ? '先不要调试变量。请用一句话说明：输入里的哪些信息决定输出，以及你准备先得到哪个中间结果？'
    : boundary
      ? '当循环变量等于数组 length 时，代码会访问哪个下标？'
      : '请预测第一个失败用例执行到关键分支时，哪个变量会首先偏离预期？';
  const expectedConcept = modeling ? '输入到输出的中间结果' : boundary ? '越界' : '首次偏离';
  const targetSkillId = (boundary ? input.problem.skillIds.find((skillId) => skillId === 'array') : undefined) ?? input.problem.skillIds[0];
  if (!targetSkillId) throw new Error('Mentor requires at least one problem skill before asking the learner');
  const steps: Array<{ name: MentorToolName; arguments: Record<string, unknown> }> = [];
  if (!context.report) steps.push({ name: 'inspect_syntax', arguments: { focus: 'first failing path' } });
  if (!context.evidence) steps.push({ name: 'search_evidence', arguments: { query: `${input.problem.title} ${input.attempt.summary} 边界`, limit: 5 } });
  steps.push({ name: 'ask_learner', arguments: { question, expectedConcept, targetSkillId, evidenceRefs: ['judge:public', 'ast:current'] } });
  for (const step of steps) {
    const started = Date.now();
    const execution = await executeTool(session, input, context, step.name, step.arguments, options, now);
    executions.push({ id: `${session.id}:tool:${executions.length + 1}`, tool: step.name, arguments: step.arguments, summary: execution.summary, evidenceRefs: execution.evidenceRefs, durationMs: Math.max(0, Date.now() - started) });
    if (execution.stop) break;
  }
}

function providerFor(session: MentorSession): MentorTurnResult['provider'] {
  return { mode: session.mode, ...(session.model ? { model: session.model } : {}), calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 };
}

function handleEditOrTransferOutcome(session: MentorSession, input: MentorTurnInput, options: MentorRuntimeOptions, now: Date): MentorTurnResult | null {
  if (session.lastAttemptId === input.attempt.id) return null;
  const passed = input.attempt.outcome === 'passed' || (input.attempt.totalCount !== undefined && input.attempt.totalCount > 0 && input.attempt.passedCount === input.attempt.totalCount);
  if (session.phase === 'awaiting-edit' && passed) {
    const evidenceRef = `judge:${input.problem.id}:${input.attempt.id}`;
    session.twin = projectLearnerTwin(session.twin, [{ kind: 'assisted-pass', skillIds: input.problem.skillIds, evidenceRef, at: now.toISOString() }], now);
    addEvent(session, now, { type: 'verification', title: '修改后的结论已验证', detail: `${input.attempt.summary}；这次通过发生在 Mentor 提示之后，因此记录为 assisted-pass，而不是独立掌握。`, evidenceRefs: [evidenceRef], status: 'supported' });
    const transfer = options.retriever.search({ text: `${input.problem.title} 迁移 边界`, skillIds: input.problem.skillIds, misconceptionIds: [], limit: 10 })
      .find((item) => item.kind === 'problem' && String(item.metadata.problemId ?? item.ref.replace(/^problem:/, '')) !== session.problemId);
    session.phase = 'transfer';
    if (transfer) {
      session.transferTask = {
        problemId: String(transfer.metadata.problemId ?? transfer.ref.replace(/^problem:/, '')),
        title: transfer.title,
        skillIds: input.problem.skillIds,
        evidenceRefs: [transfer.ref],
      };
    }
    session.nextAction = transfer ? `迁移验证：请独立完成「${transfer.title}」，本轮不提供同型提示。` : '迁移验证：请用相同技能解决一个不同输入结构的问题，本轮不提供同型提示。';
    addEvent(session, now, { type: 'learner-action', title: '进入迁移验证', detail: session.nextAction, evidenceRefs: transfer ? [transfer.ref] : input.problem.skillIds.map((id) => `skill:${id}`), status: 'complete' });
    session.lastAttemptId = input.attempt.id;
    return { version: 1, session, executions: [], provider: providerFor(session) };
  }
  if (session.phase === 'transfer' && passed && input.problem.id !== session.problemId) {
    const evidenceRef = `judge:${input.problem.id}:${input.attempt.id}`;
    session.twin = projectLearnerTwin(session.twin, [{ kind: 'transfer-pass', skillIds: input.problem.skillIds, evidenceRef, at: now.toISOString() }], now);
    session.phase = 'complete'; session.nextAction = '该技能已通过独立迁移验证；按遗忘曲线安排下一次复习。';
    addEvent(session, now, { type: 'verification', title: '迁移能力已验证', detail: session.nextAction, evidenceRefs: [evidenceRef], status: 'supported' });
    session.lastAttemptId = input.attempt.id;
    return { version: 1, session, executions: [], provider: providerFor(session) };
  }
  return null;
}

function supportsInstantiatedRowCount(prompt: NonNullable<MentorSession['pendingPrompt']>, response: string): boolean {
  if (!/行数|参数行|评分行/.test(prompt.expectedConcept) || !/多少行|几行/.test(prompt.question)) return false;
  const formula = prompt.expectedConcept.match(/(\d+)\s*\+\s*([a-z])/i);
  if (!formula) return false;
  const constant = Number(formula[1]);
  const variable = formula[2];
  const assignment = prompt.question.match(new RegExp(`${variable}\\s*=\\s*(\\d+)`, 'i'));
  if (!assignment) return false;
  const variableValue = Number(assignment[1]);
  const statedTotal = response.match(/(?:一共|总共|共)\s*(\d+)\s*行/);
  if (!statedTotal || Number(statedTotal[1]) !== constant + variableValue) return false;
  const explainsStructure = /第一行/.test(response) && /后面|评分|数据|输入/.test(response);
  const instantiatesVariable = new RegExp(`${variable}\\s*=\\s*${variableValue}`, 'i').test(response)
    || new RegExp(`${variableValue}\\s*行`).test(response);
  return explainsStructure && instantiatesVariable;
}

function handleLearnerResponse(session: MentorSession, input: MentorTurnInput, now: Date): MentorTurnResult | null {
  if (!input.learnerResponse || !session.pendingPrompt) return null;
  const response = input.learnerResponse.trim().slice(0, 1_000);
  const normalize = (value: string) => value.toLowerCase().replace(/比较/g, '比').replace(/[^\p{L}\p{N}]/gu, '');
  const expected = normalize(session.pendingPrompt.expectedConcept);
  const actual = normalize(response);
  const hasSharedSpecificPhrase = expected.length >= 5 && Array.from({ length: expected.length - 4 }, (_, index) => expected.slice(index, index + 5)).some((phrase) => actual.includes(phrase));
  const boundaryConcept = /越界|边界/.test(expected);
  const correct = actual.includes(expected) || hasSharedSpecificPhrase || (boundaryConcept && /越界|length|下标/.test(actual))
    || supportsInstantiatedRowCount(session.pendingPrompt, response);
  const responseRef = `learner-response:${session.id}:${session.timeline.length + 1}`;
  addEvent(session, now, { type: 'learner-response', title: '你的预测', detail: response, evidenceRefs: [responseRef], status: correct ? 'supported' : 'unverified' });
  if (!correct) {
    session.phase = 'awaiting-prediction';
    session.nextAction = '我还不能可靠判断你的预测是否正确。请再补充一句：你依据的是哪条规则，或哪个关键状态会先发生变化？先不要改代码。';
    addEvent(session, now, { type: 'learner-action', title: '还需要一个关键判断', detail: session.nextAction, evidenceRefs: [responseRef, ...session.pendingPrompt.evidenceRefs], status: 'unverified' });
    return { version: 1, session, executions: [], provider: providerFor(session) };
  }
  const targetSkillId = session.pendingPrompt.targetSkillId ?? input.problem.skillIds[0];
  session.twin = projectLearnerTwin(session.twin, targetSkillId ? [{
    kind: 'prediction-correct', skillIds: [targetSkillId], evidenceRef: responseRef, at: now.toISOString(),
    ...(session.pendingPrompt.misconceptionId ? { misconceptionId: session.pendingPrompt.misconceptionId } : {}),
  }] : [], now);
  session.phase = 'awaiting-edit';
  session.nextAction = boundaryConcept
    ? '只修改循环上界，重新运行同一个失败用例；先不要改算法主体。'
    : '你的关键判断有依据。现在只实现或修改与这个判断直接相关的一小步，然后重新运行；先不要一次写完整答案。';
  addEvent(session, now, { type: 'learner-action', title: '概念判断正确，缩小到实现修改', detail: session.nextAction, evidenceRefs: [responseRef, ...session.pendingPrompt.evidenceRefs], status: 'complete' });
  delete session.pendingPrompt;
  return { version: 1, session, executions: [], provider: { mode: session.mode, ...(session.model ? { model: session.model } : {}), calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 } };
}

export async function runMentorTurn(input: MentorTurnInput, options: MentorRuntimeOptions): Promise<MentorTurnResult> {
  const now = (options.now ?? (() => new Date()))();
  const initialMode: MentorSession['mode'] = options.model ? 'deepseek' : 'deterministic';
  const session = input.session ? structuredClone(input.session) : createSession(input, (options.id ?? (() => `mentor-${randomUUID()}`))(), now, initialMode, options.model?.model);
  if (!input.session && options.initialTwin?.learnerId === input.learnerId) session.twin = structuredClone(options.initialTwin);
  session.twin.lastChanges = [];
  session.judgeOutcome = input.attempt.outcome;
  const response = handleLearnerResponse(session, input, now);
  if (response) return response;
  const outcome = handleEditOrTransferOutcome(session, input, options, now);
  if (outcome) return outcome;
  if (input.session && session.lastAttemptId !== input.attempt.id) {
    addAttemptObservation(session, input, now);
    session.lastAttemptId = input.attempt.id;
  }
  session.mode = options.model ? 'deepseek' : 'deterministic';
  if (options.model) session.model = options.model.model;
  else delete session.model;
  const context: RuntimeContext = {};
  const executions: MentorToolExecution[] = [];
  const provider: MentorTurnResult['provider'] = { mode: session.mode, ...(session.model ? { model: session.model } : {}), calls: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0 };
  if (!options.model) {
    await deterministicPolicy(session, input, context, options, executions, now);
    return { version: 1, session, executions, provider };
  }
  const messages: MentorModelMessage[] = [
    { role: 'system', content: '你是单一 Mentor Agent。判题结果不可修改。只能调用给定工具；静态发现必须标记为待验证。优先提问让学习者预测，证据充分时调用 finish。如果工具结果拒绝了某个动作，必须根据错误更正工具名或参数，不要重复原动作。禁止索取隐藏测试或输出参考答案。所有给学习者的提问、摘要与下一步都必须使用简体中文。' },
    { role: 'user', content: JSON.stringify({ problem: input.problem, attempt: { ...input.attempt, sourceCode: input.attempt.sourceCode.slice(0, 50_000) }, twin: session.twin }) },
  ];
  const fingerprints = new Map<string, number>();
  let invalidActions = 0;
  let evidenceSearches = 0;
  try {
    for (let step = 0; step < 8; step += 1) {
      const result = await options.model.complete({ messages, tools: MENTOR_TOOL_DEFINITIONS });
      provider.calls += 1; provider.inputTokens += result.usage.inputTokens; provider.outputTokens += result.usage.outputTokens; provider.latencyMs += result.latencyMs;
      if (!result.toolCalls.length) throw new Error('Model returned no Mentor action');
      messages.push({
        role: 'assistant', content: result.content || null, ...(result.reasoningContent ? { reasoning_content: result.reasoningContent } : {}),
        tool_calls: result.toolCalls.map((call) => ({ id: call.id, type: 'function', function: { name: call.name, arguments: call.rawArguments ?? JSON.stringify(call.arguments) } })),
      });
      for (const call of result.toolCalls.slice(0, 3)) {
        try {
          if (call.argumentError) throw new Error(call.argumentError);
          const validated = validateMentorToolCall(call.name, call.arguments);
          const fingerprint = `${validated.name}:${JSON.stringify(validated.arguments)}`;
          const repeats = (fingerprints.get(fingerprint) ?? 0) + 1;
          fingerprints.set(fingerprint, repeats);
          if (repeats > 2) throw new Error(`Mentor tool repeat budget exceeded: ${validated.name}`);
          if (validated.name === 'search_evidence' && evidenceSearches >= 2) throw new Error('Mentor tool budget exceeded: search_evidence');
          if (validated.name === 'search_evidence') evidenceSearches += 1;
          const started = Date.now();
          const execution = await executeTool(session, input, context, validated.name, validated.arguments, options, now);
          executions.push({ id: `${session.id}:tool:${executions.length + 1}`, tool: validated.name, arguments: validated.arguments, summary: execution.summary, evidenceRefs: execution.evidenceRefs, durationMs: Math.max(0, Date.now() - started) });
          messages.push(toolMessage(call.id, execution.result));
          if (execution.stop) return { version: 1, session, executions, provider };
        } catch (error) {
          invalidActions += 1;
          const detail = error instanceof Error ? error.message : 'Invalid model action';
          addEvent(session, now, { type: 'rejected-model-action', title: '模型动作被安全策略拒绝', detail, evidenceRefs: [], status: 'rejected' });
          messages.push(toolMessage(call.id, {
            error: 'tool_action_rejected',
            message: detail,
            validTools: MENTOR_TOOL_DEFINITIONS.map((definition) => definition.function.name),
            instruction: 'Correct the tool name or arguments and replan. Do not repeat the rejected action.',
          }));
          if (invalidActions >= 3) throw new Error('Mentor invalid action budget exhausted');
        }
      }
    }
    throw new Error('Mentor step budget exhausted');
  } catch (error) {
    session.mode = 'fallback'; provider.mode = 'fallback';
    const detail = error instanceof Error ? error.message : 'Invalid model action';
    const unavailable = /timeout|aborted|unavailable|circuit|fetch/i.test(detail);
    addEvent(session, now, { type: 'rejected-model-action', title: unavailable ? '模型请求未完成，已切换确定性工具' : '模型动作被安全策略拒绝', detail, evidenceRefs: [], status: 'rejected' });
    await deterministicPolicy(session, input, context, options, executions, now);
    return { version: 1, session, executions, provider };
  }
}

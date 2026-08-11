import { randomUUID } from 'node:crypto';
import { diagnoseCode, type DiagnosticReport, type JudgeOutcome } from './code-diagnostics.js';
import { retrieveLearningEvidence, type LearningEvidenceItem, type RetrievedEvidence } from './learning-retrieval.js';
import { projectMastery, type MasteryObservation, type MasteryProjection } from './probabilistic-mastery.js';
import type { AllowedLanguage } from './validation.js';

export type AgentRole = 'planner' | 'diagnostician' | 'tutor' | 'assessor';
export type AgentToolName = 'retrieve_evidence' | 'inspect_code' | 'select_tutor_action' | 'project_mastery';

export type AgentRuntimeRequest = {
  version: 1;
  hintLevel: 1 | 2 | 3 | 4;
  problem: { id: string; title: string; description: string; input: string; output: string; skillIds: string[] };
  attempt: { id: string; language: AllowedLanguage; outcome: JudgeOutcome; summary: string; code: string };
  judge: { outcome: JudgeOutcome; passedCount?: number; totalCount?: number; evidenceRef: string };
  mastery: { prior: number; observations: MasteryObservation[] };
  evidence: LearningEvidenceItem[];
  maxSteps?: number;
};

type RuntimeState = { outputs: Map<AgentToolName, unknown> };

export type AgentToolExecution = {
  id: string;
  role: AgentRole;
  name: AgentToolName;
  status: 'completed';
  startedAt: number;
  endedAt: number;
  durationMs: number;
  input: Record<string, string | number>;
  summary: string;
  evidenceRefs: string[];
};

export type AgentHandoff = {
  traceId: string;
  from: AgentRole;
  to: AgentRole;
  task: string;
  allowedTools: AgentToolName[];
  evidenceRefs: string[];
  remainingBudget: number;
  result: string;
  confidence: number;
};

export type AgentRun = {
  version: 1;
  traceId: string;
  mode: 'deterministic' | 'model-assisted' | 'fallback';
  judgeOutcome: JudgeOutcome;
  hypothesis: DiagnosticReport['hypothesis'];
  evidence: RetrievedEvidence[];
  nextAction: string;
  masteryImpact: MasteryProjection;
  tools: AgentToolExecution[];
  handoffs: AgentHandoff[];
};

export type AgentPolicyContext = {
  problem: { id: string; title: string; outcome: JudgeOutcome };
  step: number;
  completed: Array<{ role: AgentRole; name: AgentToolName; summary: string }>;
  available: Array<{ role: AgentRole; name: AgentToolName }>;
};
export type AgentPolicy = (context: AgentPolicyContext) => Promise<{ role: AgentRole; name: AgentToolName } | null>;

const ROLE_TOOLS: Record<AgentRole, AgentToolName[]> = {
  planner: ['retrieve_evidence', 'project_mastery'],
  diagnostician: ['retrieve_evidence', 'inspect_code'],
  tutor: ['retrieve_evidence', 'select_tutor_action'],
  assessor: ['project_mastery'],
};

function tutorAction(report: DiagnosticReport, level: number): string {
  const parser = report.observations.find((item) => item.kind === 'input-parser-risk');
  const boundary = report.observations.find((item) => item.kind === 'boundary-risk');
  const complexity = report.observations.find((item) => item.kind === 'complexity-risk');
  if (parser) return level === 1
    ? `先不要改算法：请逐行写出输入被切分后的数组，检查第 ${parser.line ?? '?'} 行是否保留了输入的行结构。`
    : `把输入解析按行拆开，再分别解析每一行；先用最小多行用例验证输入边界。`;
  if (boundary) return `用长度为 0、1 和最大下标的数组跟踪第 ${boundary.line ?? '?'} 行，回答最后一次循环访问了哪个下标。`;
  if (complexity) return `先估算第 ${complexity.line ?? '?'} 行嵌套循环的执行次数，再寻找能复用状态的数据结构。`;
  return report.judgeOutcome === 'passed'
    ? '请不用参考答案，口头说明关键不变量，并完成一题同技能迁移题。'
    : '请选取第一个失败用例，逐步记录每轮循环前后的关键状态，找出首次与预期不同的位置。';
}

export async function executeAgentTool(
  role: AgentRole,
  name: AgentToolName,
  request: AgentRuntimeRequest,
  state: RuntimeState,
): Promise<{ result: unknown; summary: string; evidenceRefs: string[] }> {
  if (!ROLE_TOOLS[role].includes(name)) throw new Error(`Tool ${name} is not allowed for ${role}`);
  if (name === 'retrieve_evidence') {
    const result = retrieveLearningEvidence({
      text: `${request.problem.title} ${request.problem.description} ${request.attempt.summary}`,
      skillIds: request.problem.skillIds,
    }, request.evidence, { limit: 5 });
    return { result, summary: `检索到 ${result.length} 条有引用的学习证据`, evidenceRefs: result.map((item) => item.ref) };
  }
  if (name === 'inspect_code') {
    const result = diagnoseCode({
      language: request.attempt.language, sourceCode: request.attempt.code,
      problem: { id: request.problem.id, title: request.problem.title, inputDescription: request.problem.input, skillIds: request.problem.skillIds },
      judge: request.judge,
    });
    return { result, summary: `形成 ${result.observations.length} 条确定性观察和一条待验证假设`, evidenceRefs: result.hypothesis.evidenceRefs };
  }
  if (name === 'select_tutor_action') {
    const report = state.outputs.get('inspect_code');
    if (!report) throw new Error('Diagnostic evidence is required before tutor action');
    const result = tutorAction(report as DiagnosticReport, request.hintLevel);
    return { result, summary: '根据诊断证据选择一个苏格拉底式下一步', evidenceRefs: (report as DiagnosticReport).hypothesis.evidenceRefs };
  }
  const result = projectMastery(request.mastery.prior, request.mastery.observations);
  return { result, summary: `掌握概率 ${Math.round(result.probability * 100)}%，证据置信度 ${Math.round(result.confidence * 100)}%`, evidenceRefs: result.evidenceRefs };
}

export async function runLearningAgent(
  request: AgentRuntimeRequest,
  options: { traceId?: () => string; now?: () => number; policy?: AgentPolicy } = {},
): Promise<AgentRun> {
  const maxSteps = request.maxSteps ?? 6;
  const plan: Array<{ role: AgentRole; name: AgentToolName }> = [
    { role: 'diagnostician', name: 'retrieve_evidence' },
    { role: 'diagnostician', name: 'inspect_code' },
    { role: 'tutor', name: 'select_tutor_action' },
    { role: 'assessor', name: 'project_mastery' },
  ];
  if (!Number.isInteger(maxSteps) || maxSteps < plan.length || maxSteps > 12) throw new Error('Agent step budget exceeded');
  const now = options.now ?? Date.now;
  const traceId = (options.traceId ?? (() => `agent-${randomUUID()}`))();
  const state: RuntimeState = { outputs: new Map() };
  const tools: AgentToolExecution[] = [];
  const remaining = [...plan];
  let modelSelected = false;
  let policyFallback = false;
  for (let index = 0; remaining.length; index += 1) {
    const inspectComplete = state.outputs.has('inspect_code');
    const tutorComplete = state.outputs.has('select_tutor_action');
    const available = remaining.filter((candidate) =>
      (candidate.name !== 'select_tutor_action' || inspectComplete) &&
      (candidate.name !== 'project_mastery' || tutorComplete));
    let selected = available[0];
    if (options.policy) {
      try {
        const choice = await options.policy({
          problem: { id: request.problem.id, title: request.problem.title, outcome: request.judge.outcome }, step: index,
          completed: tools.map((tool) => ({ role: tool.role, name: tool.name, summary: tool.summary })), available,
        });
        const valid = choice && available.find((candidate) => candidate.role === choice.role && candidate.name === choice.name);
        if (valid) { selected = valid; modelSelected = true; } else policyFallback = true;
      } catch { policyFallback = true; }
    }
    const position = remaining.findIndex((candidate) => candidate.role === selected.role && candidate.name === selected.name);
    const [step] = remaining.splice(position, 1);
    const startedAt = now();
    const execution = await executeAgentTool(step.role, step.name, request, state);
    const endedAt = now();
    state.outputs.set(step.name, execution.result);
    tools.push({
      id: `${traceId}:tool:${index + 1}`, role: step.role, name: step.name, status: 'completed',
      startedAt, endedAt, durationMs: Math.max(0, endedAt - startedAt),
      input: { problemId: request.problem.id, language: request.attempt.language, sourceCharacters: request.attempt.code.length },
      summary: execution.summary, evidenceRefs: execution.evidenceRefs,
    });
  }
  const report = state.outputs.get('inspect_code') as DiagnosticReport;
  const evidence = state.outputs.get('retrieve_evidence') as RetrievedEvidence[];
  const nextAction = state.outputs.get('select_tutor_action') as string;
  const masteryImpact = state.outputs.get('project_mastery') as MasteryProjection;
  const remainingBudget = maxSteps - plan.length;
  const handoffs: AgentHandoff[] = [
    { traceId, from: 'planner', to: 'diagnostician', task: '收集代码与判题证据', allowedTools: ROLE_TOOLS.diagnostician, evidenceRefs: [request.judge.evidenceRef], remainingBudget: remainingBudget + 3, result: '开始诊断', confidence: 1 },
    { traceId, from: 'diagnostician', to: 'tutor', task: '根据待验证假设选择教学动作', allowedTools: ROLE_TOOLS.tutor, evidenceRefs: report.hypothesis.evidenceRefs, remainingBudget: remainingBudget + 1, result: report.hypothesis.message, confidence: report.hypothesis.confidence },
    { traceId, from: 'tutor', to: 'assessor', task: '投影掌握度并判断迁移需求', allowedTools: ROLE_TOOLS.assessor, evidenceRefs: masteryImpact.evidenceRefs, remainingBudget, result: nextAction, confidence: masteryImpact.confidence },
  ];
  const mode: AgentRun['mode'] = options.policy ? policyFallback ? 'fallback' : modelSelected ? 'model-assisted' : 'fallback' : 'deterministic';
  return { version: 1, traceId, mode, judgeOutcome: request.judge.outcome, hypothesis: report.hypothesis, evidence, nextAction, masteryImpact, tools, handoffs };
}

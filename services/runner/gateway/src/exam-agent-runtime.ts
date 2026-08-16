import { createHash, randomUUID } from 'node:crypto';
import type { MentorModelAdapter, MentorModelMessage, MentorToolDefinition } from './mentor/deepseek-provider.js';
import { parseSource } from './mentor/code-parser.js';
import { analyzeProgram } from './mentor/code-intelligence.js';
import type { RunRequest } from './validation.js';
import type { RunResult } from './judge0.js';

const PHASES = ['plan', 'delegation', 'review', 'test', 'correction', 'oral-explanation'] as const;
type ExamAgentPhase = typeof PHASES[number];
type ExamAgentRequest = {
  version: 1;
  sessionId: string;
  phase: ExamAgentPhase;
  problem: { id: string; title: string; description: string; input: string; output: string };
  answer: { language: RunRequest['language']; sourceCode: string };
  learnerPrompt: string;
};
type ExamAgentEvidence = { id: string; kind: 'prompt' | 'tool-action' | 'diff' | 'test' | 'oral-response'; summary: string; source: 'agent-runtime'; artifactRef: string };
type ExamAgentExecution = { id: string; tool: string; summary: string; evidenceRefs: string[]; durationMs: number };
export type ExamAgentTurnResult = {
  version: 1;
  runId: string;
  mode: 'deepseek' | 'unavailable';
  model?: string;
  message: string;
  executions: ExamAgentExecution[];
  evidence: ExamAgentEvidence[];
  proposedDiff?: { beforeHash: string; replacementSource: string; rationale: string; artifactRef: string };
  oralQuestion?: string;
  usage: { inputTokens: number; outputTokens: number; latencyMs: number };
};

type Options = {
  model?: MentorModelAdapter;
  execute(request: RunRequest): Promise<RunResult>;
  now?: () => number;
};

const TOOLS: MentorToolDefinition[] = [
  { type: 'function', function: { name: 'run_test', description: 'Run the learner current code on one bounded candidate stdin to gather evidence.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { stdin: { type: 'string', maxLength: 10_000 } }, required: ['stdin'] } } },
  { type: 'function', function: { name: 'propose_diff', description: 'Propose a bounded replacement source. Never apply it; the learner must accept or reject it.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { replacementSource: { type: 'string', maxLength: 50_000 }, rationale: { type: 'string', maxLength: 1_000 } }, required: ['replacementSource', 'rationale'] } } },
  { type: 'function', function: { name: 'ask_oral', description: 'Ask one oral question that checks whether the learner understands the algorithm or proposed change.', strict: true, parameters: { type: 'object', additionalProperties: false, properties: { question: { type: 'string', maxLength: 1_000 } }, required: ['question'] } } },
];

function validText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function parseRequest(value: ExamAgentRequest): ExamAgentRequest {
  if (!value || value.version !== 1 || !/^[a-zA-Z0-9._:-]{1,200}$/.test(value.sessionId) || !PHASES.includes(value.phase) ||
    !/^[a-zA-Z0-9._:-]{1,200}$/.test(value.problem?.id ?? '') || !validText(value.problem?.title, 500) || !validText(value.problem?.description, 30_000) ||
    typeof value.problem.input !== 'string' || value.problem.input.length > 10_000 || typeof value.problem.output !== 'string' || value.problem.output.length > 10_000 ||
    !['javascript', 'python', 'java', 'cpp'].includes(value.answer?.language) || !validText(value.answer?.sourceCode, 50_000) || !validText(value.learnerPrompt, 2_000)) {
    throw new Error('Invalid exam agent request');
  }
  return value;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function compact(value: unknown, max = 400): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export async function runExamAgentTurn(rawRequest: ExamAgentRequest, options: Options): Promise<ExamAgentTurnResult> {
  const request = parseRequest(rawRequest);
  const runId = `exam-agent-${randomUUID()}`;
  if (!options.model) return { version: 1, runId, mode: 'unavailable', message: 'AI 协作服务未配置；本轮没有生成任何 Agent 证据。', executions: [], evidence: [], usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 } };
  const now = options.now ?? Date.now;
  const executions: ExamAgentExecution[] = [];
  const evidence: ExamAgentEvidence[] = [];
  let proposedDiff: ExamAgentTurnResult['proposedDiff'];
  let oralQuestion: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let latencyMs = 0;

  const inspectionStarted = now();
  const parsed = await parseSource(request.answer);
  const inspection = analyzeProgram({ parsed, sourceCode: request.answer.sourceCode });
  const inspectRef = `exam-agent:${runId}:inspect`;
  executions.push({ id: `${runId}:inspect`, tool: 'inspect_code', summary: `${inspection.controlFlow.nodes.length} control-flow nodes, ${inspection.symbols.length} symbols`, evidenceRefs: [inspectRef], durationMs: Math.max(0, now() - inspectionStarted) });
  evidence.push({ id: `${runId}:inspect-evidence`, kind: 'tool-action', summary: 'Tree-sitter/CFG inspection executed on the current answer snapshot.', source: 'agent-runtime', artifactRef: inspectRef });

  const messages: MentorModelMessage[] = [
    { role: 'system', content: 'You are a bounded coding interview collaboration agent. Gather executable evidence before conclusions. You may propose a diff but never apply it. Do not claim learner understanding; ask an oral question when evidence is insufficient. Stop when one actionable verified next step is available.' },
    { role: 'user', content: JSON.stringify({ phase: request.phase, problem: request.problem, learnerPrompt: request.learnerPrompt, sourceHash: digest(request.answer.sourceCode), inspection: { controlFlow: inspection.controlFlow, symbols: inspection.symbols, hypotheses: inspection.hypotheses } }) },
  ];
  evidence.push({ id: `${runId}:prompt`, kind: 'prompt', summary: request.learnerPrompt, source: 'agent-runtime', artifactRef: `exam-agent:${runId}:prompt` });

  let message = '';
  for (let step = 0; step < 4; step += 1) {
    const result = await options.model.complete({ messages, tools: TOOLS });
    inputTokens += result.usage.inputTokens;
    outputTokens += result.usage.outputTokens;
    latencyMs += result.latencyMs;
    message = result.content.trim() || message;
    messages.push({
      role: 'assistant', content: result.content || null,
      ...(result.reasoningContent ? { reasoning_content: result.reasoningContent } : {}),
      ...(result.toolCalls.length ? { tool_calls: result.toolCalls.map((call) => ({ id: call.id, type: 'function' as const, function: { name: call.name, arguments: call.rawArguments ?? JSON.stringify(call.arguments) } })) } : {}),
    });
    if (!result.toolCalls.length) break;
    for (const call of result.toolCalls) {
      const started = now();
      const ref = `exam-agent:${runId}:tool:${call.id}`;
      let toolResult: Record<string, unknown>;
      if (call.argumentError) toolResult = { ok: false, error: call.argumentError };
      else if (call.name === 'run_test' && validText(call.arguments.stdin, 10_000)) {
        const run = await options.execute({ ...request.answer, stdin: call.arguments.stdin });
        toolResult = { ok: true, kind: run.kind, stdout: compact(run.stdout), stderr: compact(run.stderr) };
        evidence.push({ id: `${runId}:${call.id}`, kind: 'test', summary: `Executed candidate input; result ${run.kind}.`, source: 'agent-runtime', artifactRef: ref });
      } else if (call.name === 'propose_diff' && validText(call.arguments.replacementSource, 50_000) && validText(call.arguments.rationale, 1_000) && call.arguments.replacementSource !== request.answer.sourceCode) {
        proposedDiff = { beforeHash: digest(request.answer.sourceCode), replacementSource: call.arguments.replacementSource, rationale: call.arguments.rationale, artifactRef: ref };
        toolResult = { ok: true, beforeHash: proposedDiff.beforeHash, replacementHash: digest(proposedDiff.replacementSource), rationale: proposedDiff.rationale };
        evidence.push({ id: `${runId}:${call.id}`, kind: 'diff', summary: proposedDiff.rationale, source: 'agent-runtime', artifactRef: ref });
      } else if (call.name === 'ask_oral' && validText(call.arguments.question, 1_000)) {
        oralQuestion = call.arguments.question;
        toolResult = { ok: true, question: oralQuestion };
        evidence.push({ id: `${runId}:${call.id}`, kind: 'oral-response', summary: `Agent asked: ${oralQuestion}`, source: 'agent-runtime', artifactRef: ref });
      } else toolResult = { ok: false, error: 'Rejected invalid or unsupported tool call' };
      executions.push({ id: `${runId}:${call.id}`, tool: call.name, summary: compact(toolResult), evidenceRefs: [ref], durationMs: Math.max(0, now() - started) });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) });
    }
  }

  return {
    version: 1, runId, mode: 'deepseek', model: options.model.model,
    message: message || (proposedDiff ? '已生成一个待你检查的 bounded diff。' : '本轮工具执行完成，请根据证据继续。'),
    executions, evidence, ...(proposedDiff ? { proposedDiff } : {}), ...(oralQuestion ? { oralQuestion } : {}),
    usage: { inputTokens, outputTokens, latencyMs },
  };
}

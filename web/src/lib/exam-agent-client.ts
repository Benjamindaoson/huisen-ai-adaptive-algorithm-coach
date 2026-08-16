import type { ProblemLanguage } from './catalog';

export type ExamAgentPhase = 'plan' | 'delegation' | 'review' | 'test' | 'correction' | 'oral-explanation';
export type ExamAgentRequest = {
  version: 1;
  sessionId: string;
  phase: ExamAgentPhase;
  problem: { id: string; title: string; description: string; input: string; output: string };
  answer: { language: ProblemLanguage; sourceCode: string };
  learnerPrompt: string;
};
export type ExamAgentEvidence = { id: string; kind: 'prompt' | 'tool-action' | 'diff' | 'test' | 'oral-response'; summary: string; source: 'agent-runtime'; artifactRef: string };
export type ExamAgentTurn = {
  version: 1;
  runId: string;
  mode: 'deepseek' | 'unavailable';
  model?: string;
  message: string;
  executions: Array<{ id: string; tool: string; summary: string; evidenceRefs: string[]; durationMs: number }>;
  evidence: ExamAgentEvidence[];
  proposedDiff?: { beforeHash: string; replacementSource: string; rationale: string; artifactRef: string };
  oralQuestion?: string;
  usage: { inputTokens: number; outputTokens: number; latencyMs: number };
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function unavailable(message = 'AI 协作服务不可用；本轮没有生成可计分证据。'): ExamAgentTurn {
  return { version: 1, runId: 'unavailable', mode: 'unavailable', message, executions: [], evidence: [], usage: { inputTokens: 0, outputTokens: 0, latencyMs: 0 } };
}

function isTurn(value: unknown): value is ExamAgentTurn {
  if (!value || typeof value !== 'object') return false;
  const turn = value as Partial<ExamAgentTurn>;
  return turn.version === 1 && typeof turn.runId === 'string' && ['deepseek', 'unavailable'].includes(turn.mode ?? '')
    && typeof turn.message === 'string' && Array.isArray(turn.executions) && Array.isArray(turn.evidence)
    && turn.evidence.every((item) => item?.source === 'agent-runtime' && typeof item.artifactRef === 'string' && item.artifactRef.startsWith('exam-agent:'))
    && Boolean(turn.usage && Number.isFinite(turn.usage.inputTokens) && Number.isFinite(turn.usage.outputTokens) && Number.isFinite(turn.usage.latencyMs));
}

export async function runExamAgentTurn(baseUrl: string, request: ExamAgentRequest, fetcher: Fetcher = fetch): Promise<ExamAgentTurn> {
  if (!baseUrl.trim()) return unavailable('未配置学习网关；AI 协作不可用。');
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/exam-agent/turn`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return unavailable();
    const payload: unknown = await response.json();
    return isTurn(payload) ? payload : unavailable('AI 协作返回了无效证据，本轮不计分。');
  } catch { return unavailable(); }
}

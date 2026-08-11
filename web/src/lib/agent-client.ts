import type { ProblemRecord } from './catalog';
import type { HintLevel } from './coach';
import type { SkillMastery } from './mastery';
import type { PracticeAttempt } from './practice';
import { inferProblemSkills } from './skills';

type AgentJudgeOutcome = 'passed' | 'failed' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable' | 'not-run';
type MasteryObservationKind = 'failure' | 'assisted-pass' | 'independent-pass' | 'transfer-pass';

export type AgentRunRequest = {
  version: 1;
  hintLevel: HintLevel;
  problem: { id: string; title: string; description: string; input: string; output: string; skillIds: string[] };
  attempt: { id: string; language: PracticeAttempt['language']; outcome: AgentJudgeOutcome; summary: string; code: string };
  judge: { outcome: AgentJudgeOutcome; passedCount?: number; totalCount?: number; evidenceRef: string };
  mastery: { prior: number; observations: Array<{ kind: MasteryObservationKind; evidenceRef: string }> };
};

export type AgentRunResponse = {
  version: 1;
  traceId: string;
  mode: 'deterministic' | 'model-assisted' | 'fallback';
  judgeOutcome: AgentJudgeOutcome;
  hypothesis: { message: string; confidence: number; proven: false; evidenceRefs: string[] };
  evidence: Array<{ ref: string; kind: string; title: string; verification: 'verified' | 'candidate' | 'unverified'; score: number; excerpt: string }>;
  nextAction: string;
  masteryImpact: { probability: number; confidence: number; effectiveEvidence: number; needsTransfer: boolean; evidenceRefs: string[] };
  tools: Array<{ id: string; role: string; name: string; status: 'completed'; durationMs: number; summary: string; evidenceRefs: string[] }>;
  handoffs: Array<{ from: string; to: string; task: string; result: string; confidence: number }>;
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const TOOL_NAMES = ['retrieve_evidence', 'inspect_code', 'select_tutor_action', 'project_mastery'];
const ROLES = ['planner', 'diagnostician', 'tutor', 'assessor'];
const OUTCOMES: AgentJudgeOutcome[] = ['passed', 'failed', 'compile-error', 'runtime-error', 'timeout', 'unavailable', 'not-run'];

function outcome(attempt: PracticeAttempt): AgentJudgeOutcome {
  if (attempt.outcome === 'wrong-answer') return 'failed';
  if (attempt.outcome === 'executed') return 'not-run';
  return attempt.outcome;
}

export function buildAgentRequest(problem: ProblemRecord, attempt: PracticeAttempt, mastery: SkillMastery[], hintLevel: HintLevel): AgentRunRequest {
  const description = problem.sections.description ?? '';
  const input = problem.sections.input ?? '';
  const output = problem.sections.output ?? '';
  const skillIds = inferProblemSkills({ title: problem.title, searchText: `${description}\n${input}\n${output}`, skills: problem.skills });
  const related = mastery.filter((item) => skillIds.includes(item.skillId));
  const prior = related.length ? related.reduce((sum, item) => sum + item.score, 0) / related.length : 0.25;
  const judgeOutcome = outcome(attempt);
  const observations: AgentRunRequest['mastery']['observations'] = judgeOutcome === 'passed'
    ? [{ kind: 'independent-pass', evidenceRef: `attempt:${attempt.id}` }]
    : ['failed', 'compile-error', 'runtime-error', 'timeout'].includes(judgeOutcome)
      ? [{ kind: 'failure', evidenceRef: `attempt:${attempt.id}` }]
      : [];
  return {
    version: 1, hintLevel,
    problem: {
      id: problem.id, title: problem.title.slice(0, 300), description: description.slice(0, 12_000),
      input: input.slice(0, 4_000), output: output.slice(0, 4_000), skillIds,
    },
    attempt: { id: attempt.id, language: attempt.language, outcome: judgeOutcome, summary: attempt.summary.slice(0, 1_000), code: attempt.codeSnapshot.slice(0, 50_000) },
    judge: {
      outcome: judgeOutcome,
      ...(attempt.passedCount !== undefined ? { passedCount: attempt.passedCount } : {}),
      ...(attempt.totalCount !== undefined ? { totalCount: attempt.totalCount } : {}),
      evidenceRef: `judge:${problem.id}:${attempt.mode === 'sample-submit' ? 'public-samples' : 'custom-run'}`,
    },
    mastery: { prior: Math.round(prior * 1_000) / 1_000, observations },
  };
}

function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === 'string'); }

function parseResponse(value: unknown): AgentRunResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const run = value as Partial<AgentRunResponse>;
  if (run.version !== 1 || typeof run.traceId !== 'string' || !['deterministic', 'model-assisted', 'fallback'].includes(run.mode ?? '') || !OUTCOMES.includes(run.judgeOutcome as AgentJudgeOutcome)) return null;
  if (!run.hypothesis || typeof run.hypothesis.message !== 'string' || typeof run.hypothesis.confidence !== 'number' || run.hypothesis.proven !== false || !stringArray(run.hypothesis.evidenceRefs)) return null;
  if (typeof run.nextAction !== 'string' || !run.masteryImpact || typeof run.masteryImpact.probability !== 'number' || typeof run.masteryImpact.confidence !== 'number') return null;
  if (!Array.isArray(run.evidence) || !Array.isArray(run.tools) || !Array.isArray(run.handoffs)) return null;
  if (run.tools.some((tool) => !tool || tool.status !== 'completed' || !TOOL_NAMES.includes(tool.name) || !ROLES.includes(tool.role) || typeof tool.summary !== 'string' || !stringArray(tool.evidenceRefs))) return null;
  if (run.evidence.some((item) => !item || typeof item.ref !== 'string' || typeof item.excerpt !== 'string' || !['verified', 'candidate', 'unverified'].includes(item.verification))) return null;
  if (run.handoffs.some((item) => !item || !ROLES.includes(item.from) || !ROLES.includes(item.to) || typeof item.task !== 'string')) return null;
  return run as AgentRunResponse;
}

export async function requestAgentRun(baseUrl: string, request: AgentRunRequest, fetcher: Fetcher = fetch, signal?: AbortSignal): Promise<AgentRunResponse | null> {
  if (!baseUrl.trim()) return null;
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/agent/run`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: signal ?? AbortSignal.timeout(12_000),
    });
    if (!response.ok) return null;
    return parseResponse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return null;
  }
}

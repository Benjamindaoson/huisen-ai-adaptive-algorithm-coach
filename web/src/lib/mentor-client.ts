import type { ProblemRecord } from './catalog';
import type { PracticeAttempt } from './practice';
import { inferProblemSkills } from './skills';
import type { SampleTestCase } from './testcase';
import { learnerIdentityClient, type LearnerIdentityClient } from './learner-identity-client';

export type MentorRequest = {
  version: 1;
  learnerId: string;
  problem: { id: string; title: string; description: string; input: string; output: string; skillIds: string[]; publicInputs: string[] };
  attempt: { id: string; language: PracticeAttempt['language']; outcome: string; summary: string; sourceCode: string; passedCount?: number; totalCount?: number };
  learnerResponse?: string;
};
export type MentorTimelineEvent = {
  id: string;
  type: 'observation' | 'hypothesis' | 'missing-evidence' | 'tool' | 'verification' | 'learner-question' | 'learner-response' | 'learner-action' | 'rejected-model-action';
  title: string;
  detail: string;
  at: string;
  evidenceRefs: string[];
  status?: 'unverified' | 'supported' | 'rejected' | 'complete';
  tool?: string;
};
export type MentorTransferTask = { problemId: string; title: string; skillIds: string[]; evidenceRefs: string[] };
export type MentorSession = {
  version: 1;
  id: string;
  learnerId: string;
  problemId: string;
  phase: 'observing' | 'awaiting-prediction' | 'awaiting-edit' | 'verifying' | 'transfer' | 'complete';
  mode: 'deepseek' | 'deterministic' | 'fallback';
  model?: string;
  judgeOutcome: string;
  nextAction: string;
  timeline: MentorTimelineEvent[];
  pendingPrompt?: { question: string; expectedConcept: string; targetSkillId?: string; evidenceRefs: string[]; misconceptionId?: string };
  transferTask?: MentorTransferTask;
  twin?: {
    version: 1;
    learnerId: string;
    updatedAt: string;
    lastChanges: Array<{ skillId: string; prior: number; posterior: number; evidenceRef: string; kind: string }>;
  };
};
export type MentorTurnResponse = {
  version: 1;
  session: MentorSession;
  executions: Array<{ id: string; tool: string; summary: string; evidenceRefs: string[]; durationMs: number }>;
  provider: { mode: MentorSession['mode']; model?: string; calls: number; inputTokens: number; outputTokens: number; latencyMs: number };
  platform?: { storage: 'postgres' | 'file-local'; identity: 'signed' | 'permissive-local' };
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const PHASES = ['observing', 'awaiting-prediction', 'awaiting-edit', 'verifying', 'transfer', 'complete'];
const MODES = ['deepseek', 'deterministic', 'fallback'];
const EVENT_TYPES = ['observation', 'hypothesis', 'missing-evidence', 'tool', 'verification', 'learner-question', 'learner-response', 'learner-action', 'rejected-model-action'];

export function buildMentorRequest(learnerId: string, problem: ProblemRecord, attempt: PracticeAttempt, sampleCases: SampleTestCase[]): MentorRequest {
  const description = problem.sections.description ?? '';
  const input = problem.sections.input ?? '';
  const output = problem.sections.output ?? '';
  const skillIds = inferProblemSkills({ title: problem.title, searchText: `${description}\n${input}\n${output}`, skills: problem.skills, classification: problem.classification });
  return {
    version: 1, learnerId,
    problem: {
      id: problem.id, title: problem.title.slice(0, 300), description: description.slice(0, 30_000), input: input.slice(0, 10_000), output: output.slice(0, 10_000),
      skillIds: skillIds.slice(0, 12), publicInputs: sampleCases.map((item) => item.stdin.slice(0, 10_000)).slice(0, 5),
    },
    attempt: {
      id: attempt.id, language: attempt.language, outcome: attempt.outcome, summary: attempt.summary.slice(0, 1_000), sourceCode: attempt.codeSnapshot.slice(0, 50_000),
      ...(attempt.passedCount !== undefined ? { passedCount: attempt.passedCount } : {}), ...(attempt.totalCount !== undefined ? { totalCount: attempt.totalCount } : {}),
    },
  };
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseMentorResponse(value: unknown): MentorTurnResponse | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as Partial<MentorTurnResponse>;
  const session = result.session;
  if (result.version !== 1 || !session || session.version !== 1 || typeof session.id !== 'string' || typeof session.learnerId !== 'string' ||
    typeof session.problemId !== 'string' || !PHASES.includes(session.phase) || !MODES.includes(session.mode) || typeof session.judgeOutcome !== 'string' || typeof session.nextAction !== 'string' || !Array.isArray(session.timeline)) return null;
  if (session.timeline.some((event) => !event || typeof event.id !== 'string' || !EVENT_TYPES.includes(event.type) || typeof event.title !== 'string' || typeof event.detail !== 'string' || typeof event.at !== 'string' || !strings(event.evidenceRefs))) return null;
  if (!Array.isArray(result.executions) || !result.provider || !MODES.includes(result.provider.mode) || typeof result.provider.calls !== 'number' || typeof result.provider.latencyMs !== 'number') return null;
  if (result.platform && (!['postgres', 'file-local'].includes(result.platform.storage) || !['signed', 'permissive-local'].includes(result.platform.identity))) return null;
  return result as MentorTurnResponse;
}

async function post(baseUrl: string, path: string, request: MentorRequest, fetcher: Fetcher, signal?: AbortSignal, identity: LearnerIdentityClient = learnerIdentityClient): Promise<MentorTurnResponse | null> {
  if (!baseUrl.trim()) return null;
  try {
    const authorization = await identity.headers(baseUrl, request.learnerId);
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify(request), signal: signal ?? AbortSignal.timeout(25_000),
    });
    if (!response.ok) return null;
    return parseMentorResponse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return null;
  }
}

export function startMentorSession(baseUrl: string, request: MentorRequest, fetcher: Fetcher = fetch, signal?: AbortSignal, identity: LearnerIdentityClient = learnerIdentityClient): Promise<MentorTurnResponse | null> {
  return post(baseUrl, '/mentor/sessions', request, fetcher, signal, identity);
}

export function continueMentorSession(baseUrl: string, sessionId: string, request: MentorRequest, fetcher: Fetcher = fetch, signal?: AbortSignal, identity: LearnerIdentityClient = learnerIdentityClient): Promise<MentorTurnResponse | null> {
  return post(baseUrl, `/mentor/sessions/${encodeURIComponent(sessionId)}/turns`, request, fetcher, signal, identity);
}

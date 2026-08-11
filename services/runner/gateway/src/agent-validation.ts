import type { AgentRuntimeRequest } from './agent-runtime.js';
import type { LearningEvidenceItem } from './learning-retrieval.js';
import { ALLOWED_LANGUAGES } from './validation.js';

export type AgentApiRequest = Omit<AgentRuntimeRequest, 'evidence'>;

const OUTCOMES = ['passed', 'failed', 'compile-error', 'runtime-error', 'timeout', 'unavailable', 'not-run'];
const OBSERVATIONS = ['failure', 'assisted-pass', 'independent-pass', 'transfer-pass'];
const FORBIDDEN = new Set(['hidden', 'hiddentests', 'officialcases', 'referencesolution']);

function object(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, allowed: string[]): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new Error(`Invalid agent field: ${unknown}`);
}

function rejectForbidden(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) return value.forEach(rejectForbidden);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN.has(key.toLowerCase())) throw new Error('Invalid agent hidden evidence');
    rejectForbidden(child);
  }
}

function text(value: unknown, name: string, max: number, required = true): string {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > max) throw new Error(`Invalid agent ${name}`);
  return value;
}

function stringArray(value: unknown, name: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some((item) => typeof item !== 'string' || !item || item.length > 100)) throw new Error(`Invalid agent ${name}`);
  return [...new Set(value)] as string[];
}

export function validateAgentRequest(body: unknown): AgentApiRequest {
  rejectForbidden(body);
  const value = object(body, 'Invalid agent request');
  keys(value, ['version', 'hintLevel', 'problem', 'attempt', 'judge', 'mastery', 'maxSteps']);
  if (value.version !== 1) throw new Error('Unsupported agent version');
  if (![1, 2, 3, 4].includes(value.hintLevel as number)) throw new Error('Invalid agent hint level');
  if (value.maxSteps !== undefined && (!Number.isInteger(value.maxSteps) || (value.maxSteps as number) < 4 || (value.maxSteps as number) > 12)) throw new Error('Invalid agent max steps');

  const problem = object(value.problem, 'Invalid agent problem');
  keys(problem, ['id', 'title', 'description', 'input', 'output', 'skillIds']);
  text(problem.id, 'problem id', 200); text(problem.title, 'problem title', 300);
  text(problem.description, 'problem description', 12_000, false); text(problem.input, 'problem input', 4_000, false);
  text(problem.output, 'problem output', 4_000, false); stringArray(problem.skillIds, 'skills', 8);

  const attempt = object(value.attempt, 'Invalid agent attempt');
  keys(attempt, ['id', 'language', 'outcome', 'summary', 'code']);
  text(attempt.id, 'attempt id', 200);
  if (!ALLOWED_LANGUAGES.includes(attempt.language as never)) throw new Error('Unsupported agent language');
  if (!OUTCOMES.includes(attempt.outcome as string)) throw new Error('Invalid agent attempt outcome');
  text(attempt.summary, 'attempt summary', 1_000, false); text(attempt.code, 'source code', 50_000, false);

  const judge = object(value.judge, 'Invalid agent judge evidence');
  keys(judge, ['outcome', 'passedCount', 'totalCount', 'evidenceRef']);
  if (!OUTCOMES.includes(judge.outcome as string)) throw new Error('Invalid agent judge outcome');
  text(judge.evidenceRef, 'judge evidence reference', 300);
  for (const name of ['passedCount', 'totalCount'] as const) if (judge[name] !== undefined && (!Number.isInteger(judge[name]) || (judge[name] as number) < 0 || (judge[name] as number) > 100_000)) throw new Error(`Invalid agent ${name}`);
  if (judge.passedCount !== undefined && judge.totalCount !== undefined && (judge.passedCount as number) > (judge.totalCount as number)) throw new Error('Invalid agent judge counts');
  if (attempt.outcome !== judge.outcome) throw new Error('Invalid agent judge conflict');

  const mastery = object(value.mastery, 'Invalid agent mastery');
  keys(mastery, ['prior', 'observations']);
  if (typeof mastery.prior !== 'number' || !Number.isFinite(mastery.prior) || mastery.prior < 0 || mastery.prior > 1) throw new Error('Invalid agent mastery prior');
  if (!Array.isArray(mastery.observations) || mastery.observations.length > 50) throw new Error('Invalid agent mastery observations');
  for (const raw of mastery.observations) {
    const observation = object(raw, 'Invalid agent mastery observation');
    keys(observation, ['kind', 'evidenceRef']);
    if (!OBSERVATIONS.includes(observation.kind as string)) throw new Error('Invalid agent mastery observation');
    text(observation.evidenceRef, 'mastery evidence reference', 300);
  }
  return value as unknown as AgentApiRequest;
}

export function defaultAgentEvidence(request: AgentApiRequest): LearningEvidenceItem[] {
  return [{
    ref: `problem:${request.problem.id}`, kind: 'problem', title: request.problem.title,
    text: `${request.problem.description}\n${request.problem.input}\n${request.problem.output}`,
    skillIds: request.problem.skillIds, verification: 'candidate',
  }];
}

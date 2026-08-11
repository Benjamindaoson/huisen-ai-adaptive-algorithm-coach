import { validateLearnerId } from '../learning-validation.js';
import { validateRunRequest } from '../validation.js';
import type { MentorTurnInput } from './mentor-engine.js';

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: string[], message: string): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(message);
}

function text(value: unknown, label: string, limit: number, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > limit) throw new Error(`Invalid ${label}`);
  return value;
}

function id(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9._:-]{1,200}$/.test(value) || ['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase())) throw new Error(`Invalid ${label}`);
  return value;
}

function validateCore(body: unknown, allowResponse: boolean): Omit<MentorTurnInput, 'session'> {
  const value = record(body, 'Invalid Mentor request');
  onlyKeys(value, allowResponse ? ['version', 'learnerId', 'problem', 'attempt', 'learnerResponse'] : ['version', 'learnerId', 'problem', 'attempt'], 'Invalid Mentor request fields');
  if (value.version !== 1) throw new Error('Invalid Mentor request version');
  const learnerId = validateLearnerId(value.learnerId);
  const rawProblem = record(value.problem, 'Invalid Mentor problem');
  onlyKeys(rawProblem, ['id', 'title', 'description', 'input', 'output', 'skillIds', 'publicInputs'], 'Invalid Mentor problem fields');
  if (!Array.isArray(rawProblem.skillIds) || rawProblem.skillIds.length > 12 || rawProblem.skillIds.some((item) => typeof item !== 'string' || !item.trim() || item.length > 100)) throw new Error('Invalid Mentor skill ids');
  if (!Array.isArray(rawProblem.publicInputs) || rawProblem.publicInputs.length > 5 || rawProblem.publicInputs.some((item) => typeof item !== 'string' || item.length > 10_000)) throw new Error('Invalid Mentor public inputs');
  const problem: MentorTurnInput['problem'] = {
    id: id(rawProblem.id, 'Mentor problem id'), title: text(rawProblem.title, 'Mentor problem title', 300),
    description: text(rawProblem.description, 'Mentor problem description', 30_000, true), input: text(rawProblem.input, 'Mentor input description', 10_000, true),
    output: text(rawProblem.output, 'Mentor output description', 10_000, true), skillIds: [...new Set(rawProblem.skillIds as string[])], publicInputs: [...rawProblem.publicInputs as string[]],
  };
  const rawAttempt = record(value.attempt, 'Invalid Mentor attempt');
  onlyKeys(rawAttempt, ['id', 'language', 'outcome', 'summary', 'sourceCode', 'passedCount', 'totalCount'], 'Invalid Mentor attempt fields');
  const run = validateRunRequest({ language: rawAttempt.language, sourceCode: rawAttempt.sourceCode, stdin: '' });
  if (rawAttempt.passedCount !== undefined && (!Number.isInteger(rawAttempt.passedCount) || (rawAttempt.passedCount as number) < 0)) throw new Error('Invalid Mentor passed count');
  if (rawAttempt.totalCount !== undefined && (!Number.isInteger(rawAttempt.totalCount) || (rawAttempt.totalCount as number) < 0)) throw new Error('Invalid Mentor total count');
  if (typeof rawAttempt.passedCount === 'number' && typeof rawAttempt.totalCount === 'number' && rawAttempt.passedCount > rawAttempt.totalCount) throw new Error('Invalid Mentor passed count');
  const attempt: MentorTurnInput['attempt'] = {
    id: id(rawAttempt.id, 'Mentor attempt id'), language: run.language, outcome: text(rawAttempt.outcome, 'Mentor attempt outcome', 100),
    summary: text(rawAttempt.summary, 'Mentor attempt summary', 1_000, true), sourceCode: run.sourceCode,
    ...(typeof rawAttempt.passedCount === 'number' ? { passedCount: rawAttempt.passedCount } : {}),
    ...(typeof rawAttempt.totalCount === 'number' ? { totalCount: rawAttempt.totalCount } : {}),
  };
  const learnerResponse = value.learnerResponse === undefined ? undefined : text(value.learnerResponse, 'Mentor learner response', 1_000);
  return { version: 1, learnerId, problem, attempt, ...(learnerResponse ? { learnerResponse } : {}) };
}

export function validateMentorStartRequest(body: unknown): Omit<MentorTurnInput, 'session' | 'learnerResponse'> {
  return validateCore(body, false) as Omit<MentorTurnInput, 'session' | 'learnerResponse'>;
}

export function validateMentorTurnRequest(body: unknown): Omit<MentorTurnInput, 'session'> {
  return validateCore(body, true);
}

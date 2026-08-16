import { createHash, randomUUID } from 'node:crypto';
import type { RunResult } from './judge0.js';
import { ALLOWED_LANGUAGES, type AllowedLanguage, type RunRequest } from './validation.js';

export type ContentExecutionRequest = {
  language: AllowedLanguage;
  solution: string;
  tests: Array<{ input: string; expectedOutput: string }>;
  constraints: { timeLimitMs: number; memoryLimitMb: number };
};

type Executor = (request: RunRequest) => Promise<RunResult>;

function normalize(value: string): string {
  return value.replace(/\r\n/g, '\n').trimEnd();
}

function validate(request: ContentExecutionRequest): void {
  if (!request || !ALLOWED_LANGUAGES.includes(request.language) || typeof request.solution !== 'string' || !request.solution.trim() || request.solution.length > 50_000
    || !Array.isArray(request.tests) || request.tests.length < 1 || request.tests.length > 50
    || request.tests.some((test) => typeof test.input !== 'string' || test.input.length > 10_000 || typeof test.expectedOutput !== 'string' || test.expectedOutput.length > 32_000)
    || !Number.isFinite(request.constraints?.timeLimitMs) || request.constraints.timeLimitMs <= 0 || request.constraints.timeLimitMs > 10_000
    || !Number.isFinite(request.constraints?.memoryLimitMb) || request.constraints.memoryLimitMb <= 0 || request.constraints.memoryLimitMb > 1024) throw new Error('Invalid generated content execution request');
}

export async function validateContentExecution(request: ContentExecutionRequest, execute: Executor) {
  validate(request);
  const validationId = `content-validation-${randomUUID()}`;
  const solutionHash = createHash('sha256').update(request.solution).digest('hex');
  const results = [];
  for (let index = 0; index < request.tests.length; index += 1) {
    const run = await execute({ language: request.language, sourceCode: request.solution, stdin: request.tests[index].input });
    const outputMatches = run.kind === 'success' && normalize(run.stdout) === normalize(request.tests[index].expectedOutput);
    const withinBounds = (run.timeMs ?? 0) <= request.constraints.timeLimitMs;
    results.push({ index, passed: outputMatches && withinBounds, kind: run.kind, output: run.stdout, durationMs: run.timeMs ?? 0, artifactRef: `content-validation:${validationId}:test:${index}` });
  }
  return { version: 1 as const, validationId, solutionHash, passed: results.every((item) => item.passed), executedCount: results.length, results };
}

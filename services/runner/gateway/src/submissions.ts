import type { RunResult } from './judge0.js';
import { ALLOWED_LANGUAGES, type AllowedLanguage, type RunRequest } from './validation.js';

export type SubmissionRequest = { problemId: string; language: AllowedLanguage; sourceCode: string };
export type HiddenTestCase = { stdin: string; expectedOutput: string };
export type SubmissionStatus = 'queued' | 'running' | 'passed' | 'failed' | 'error';
export type PublicSubmission = {
  id: string;
  problemId: string;
  status: SubmissionStatus;
  submittedAt: number;
  completedAt?: number;
  passedCount: number;
  totalCount: number;
  timeMs?: number;
  error?: string;
};

type SubmissionDependencies = {
  lookupTests: (problemId: string) => HiddenTestCase[] | undefined;
  execute: (request: RunRequest) => Promise<RunResult>;
  createId?: () => string;
  now?: () => number;
};

export type SubmissionService = ReturnType<typeof createSubmissionService>;
const MAX_SOURCE_CHARACTERS = 50_000;

export function validateSubmissionRequest(body: unknown): SubmissionRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid submission request');
  const value = body as Record<string, unknown>;
  const unknown = Object.keys(value).filter((key) => !['problemId', 'language', 'sourceCode'].includes(key));
  if (unknown.length) throw new Error(`Unknown submission field: ${unknown[0]}`);
  if (typeof value.problemId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value.problemId)) throw new Error('Invalid problem id');
  if (!ALLOWED_LANGUAGES.includes(value.language as AllowedLanguage)) throw new Error('Unsupported language');
  if (typeof value.sourceCode !== 'string' || !value.sourceCode.trim()) throw new Error('Source code must be a non-empty string');
  if (value.sourceCode.length > MAX_SOURCE_CHARACTERS) throw new Error(`Source code exceeds ${MAX_SOURCE_CHARACTERS} characters`);
  return { problemId: value.problemId, language: value.language as AllowedLanguage, sourceCode: value.sourceCode };
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/[\t ]+$/g, '')).join('\n').replace(/\n+$/g, '');
}

export function createSubmissionService(dependencies: SubmissionDependencies) {
  const records = new Map<string, PublicSubmission>();
  const jobs = new Map<string, Promise<void>>();
  const now = dependencies.now ?? Date.now;
  const createId = dependencies.createId ?? (() => globalThis.crypto.randomUUID());

  async function run(id: string, request: SubmissionRequest, tests: HiddenTestCase[]): Promise<void> {
    const record = records.get(id);
    if (!record) return;
    records.set(id, { ...record, status: 'running' });
    let passedCount = 0;
    let timeMs = 0;
    try {
      for (const test of tests) {
        const result = await dependencies.execute({ language: request.language, sourceCode: request.sourceCode, stdin: test.stdin });
        timeMs += result.timeMs ?? 0;
        if (result.kind !== 'success') {
          records.set(id, { ...record, status: 'error', completedAt: now(), passedCount, totalCount: tests.length, timeMs, error: result.kind === 'timeout' ? '程序运行超时。' : '程序未能完成隐藏用例。' });
          return;
        }
        if (normalizeOutput(result.stdout) === normalizeOutput(test.expectedOutput)) passedCount += 1;
      }
      records.set(id, { ...record, status: passedCount === tests.length ? 'passed' : 'failed', completedAt: now(), passedCount, totalCount: tests.length, timeMs });
    } catch {
      records.set(id, { ...record, status: 'error', completedAt: now(), passedCount, totalCount: tests.length, timeMs, error: '隐藏判题服务暂不可用。' });
    }
  }

  function submit(input: SubmissionRequest): PublicSubmission {
    const request = validateSubmissionRequest(input);
    const tests = dependencies.lookupTests(request.problemId);
    if (!tests?.length) throw new Error('Unknown problem or hidden tests unavailable');
    const id = createId();
    const record: PublicSubmission = { id, problemId: request.problemId, status: 'queued', submittedAt: now(), passedCount: 0, totalCount: tests.length };
    records.set(id, record);
    const job = Promise.resolve().then(() => run(id, request, tests));
    jobs.set(id, job);
    void job.finally(() => jobs.delete(id));
    return { ...record };
  }

  return {
    submit,
    get(id: string): PublicSubmission | undefined { const record = records.get(id); return record ? { ...record } : undefined; },
    async settle(id: string): Promise<void> { await jobs.get(id); },
  };
}

import type { AllowedLanguage, RunRequest } from './validation.js';

export type RunResult = {
  kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';
  stdout: string;
  stderr: string;
  timeMs?: number;
};

type Judge0Submission = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  status?: { id?: number; description?: string };
};

const OUTPUT_LIMIT = 32_000;

function limitOutput(value: string): string {
  return value.length > OUTPUT_LIMIT ? `${value.slice(0, OUTPUT_LIMIT)}\n[输出已截断]` : value;
}

function languageId(language: AllowedLanguage): number {
  const configured = process.env[`JUDGE0_LANGUAGE_${language.toUpperCase()}`];
  const value = Number(configured);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Missing Judge0 language mapping for ${language}`);
  return value;
}

function normalizeSubmission(submission: Judge0Submission): RunResult {
  const status = submission.status?.id;
  const stderr = limitOutput([submission.compile_output, submission.stderr, submission.message].filter(Boolean).join('\n'));
  const stdout = limitOutput(submission.stdout ?? '');
  const time = Number(submission.time);
  const timeMs = Number.isFinite(time) ? Math.round(time * 1_000) : undefined;
  if (status === 3) return { kind: 'success', stdout, stderr, timeMs };
  if (status === 5) return { kind: 'timeout', stdout, stderr: stderr || '程序超出时间限制。', timeMs };
  if (status === 6) return { kind: 'compile-error', stdout, stderr: stderr || '编译失败。', timeMs };
  return { kind: 'runtime-error', stdout, stderr: stderr || submission.status?.description || '程序未能正常执行。', timeMs };
}

export async function executeRun(request: RunRequest): Promise<RunResult> {
  const baseUrl = process.env.JUDGE0_URL;
  if (!baseUrl) throw new Error('JUDGE0_URL is not configured');
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      language_id: languageId(request.language),
      source_code: request.sourceCode,
      stdin: request.stdin,
      cpu_time_limit: 5,
      wall_time_limit: 10,
      // Judge0 1.13.1 on Docker Desktop uses RLIMIT_AS when cgroups v1 is
      // unavailable. JVM/V8 reserve large virtual address ranges even when
      // resident memory stays small, so the virtual-memory ceiling must be
      // higher than a cgroup resident-memory ceiling.
      memory_limit: 2_048_000,
      max_file_size: 1_024,
      enable_network: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('Judge0 did not accept the submission');
  return normalizeSubmission(await response.json() as Judge0Submission);
}

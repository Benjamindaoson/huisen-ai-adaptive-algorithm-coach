import type { ProblemLanguage } from './catalog';

export type RunRequest = { language: ProblemLanguage; sourceCode: string; stdin: string };
export type RunResult = {
  kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';
  stdout: string;
  stderr: string;
  timeMs?: number;
};

type Judge0Result = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  status?: { id?: number; description?: string };
};

export const PUBLIC_RUNNER_URL = 'https://ce.judge0.com';
const PUBLIC_LANGUAGE_IDS: Record<RunRequest['language'], number> = { java: 62, python: 71, javascript: 63, cpp: 54 };

export function resolveRunnerUrl(override?: string): string {
  return (override?.trim() || PUBLIC_RUNNER_URL).replace(/\/$/, '');
}

export function hasRunnableSource(sourceCode: string): boolean {
  return sourceCode.trim().length > 0;
}

function isPublicRunner(baseUrl: string): boolean {
  return baseUrl === PUBLIC_RUNNER_URL;
}

function encodeBase64(value: string): string {
  const binary = Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary);
}

function decodeBase64(value: string | null | undefined): string {
  if (!value) return '';
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function isRunResult(value: unknown): value is RunResult {
  return Boolean(value && typeof value === 'object' && 'kind' in value);
}

function normalizeJudge0Result(value: Judge0Result, base64Encoded: boolean): RunResult {
  const decode = base64Encoded ? decodeBase64 : (content: string | null | undefined) => content ?? '';
  const stderr = [value.compile_output, value.stderr, value.message].map(decode).filter(Boolean).join('\n');
  const time = Number(value.time);
  const timeMs = Number.isFinite(time) ? Math.round(time * 1_000) : undefined;
  const stdout = decode(value.stdout);
  if (value.status?.id === 3) return { kind: 'success', stdout, stderr, timeMs };
  if (value.status?.id === 5) return { kind: 'timeout', stdout, stderr: stderr || '程序运行超时。', timeMs };
  if (value.status?.id === 6) return { kind: 'compile-error', stdout, stderr: stderr || '编译失败。', timeMs };
  return { kind: 'runtime-error', stdout, stderr: stderr || value.status?.description || '程序未能正常执行。', timeMs };
}

export async function runCode(baseUrl: string, request: RunRequest, signal?: AbortSignal): Promise<RunResult> {
  try {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const publicRunner = isPublicRunner(normalizedBaseUrl);
    const response = await fetch(publicRunner ? `${normalizedBaseUrl}/submissions?base64_encoded=true&wait=true` : `${normalizedBaseUrl}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(publicRunner ? {
        language_id: PUBLIC_LANGUAGE_IDS[request.language],
        source_code: encodeBase64(request.sourceCode),
        stdin: encodeBase64(request.stdin),
      } : request),
      signal,
    });
    if (!response.ok) return { kind: 'unavailable', stdout: '', stderr: '运行服务暂不可用，请稍后再试。' };
    const payload = await response.json() as RunResult | Judge0Result;
    return isRunResult(payload) ? payload : normalizeJudge0Result(payload, publicRunner);
  } catch {
    return { kind: 'unavailable', stdout: '', stderr: '无法连接运行服务。' };
  }
}

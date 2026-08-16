import type { ProblemLanguage } from './catalog';

export type RunRequest = { language: ProblemLanguage; sourceCode: string; stdin: string };
export type RunResult = {
  kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';
  stdout: string;
  stderr: string;
  timeMs?: number;
  unavailableReason?: 'not-configured' | 'service-error' | 'network-error';
};

export function resolveRunnerUrl(override?: string): string {
  return (override?.trim() ?? '').replace(/\/$/, '');
}

export function hasRunnableSource(sourceCode: string): boolean {
  return sourceCode.trim().length > 0;
}

export async function runCode(baseUrl: string, request: RunRequest, signal?: AbortSignal): Promise<RunResult> {
  try {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    if (!normalizedBaseUrl) return { kind: 'unavailable', stdout: '', stderr: '未配置私有运行服务；源码未发送。', unavailableReason: 'not-configured' };
    const response = await fetch(`${normalizedBaseUrl}/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) return { kind: 'unavailable', stdout: '', stderr: '运行服务暂不可用，请稍后再试。', unavailableReason: 'service-error' };
    return await response.json() as RunResult;
  } catch {
    return { kind: 'unavailable', stdout: '', stderr: '无法连接运行服务。', unavailableReason: 'network-error' };
  }
}

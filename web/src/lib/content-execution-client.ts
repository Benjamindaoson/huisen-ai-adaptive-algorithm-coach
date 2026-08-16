import type { GeneratedContentCandidate } from './content-trust';

type ExecutionRequest = Pick<GeneratedContentCandidate, 'language' | 'solution' | 'tests' | 'constraints'>;
type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type GeneratedExecutionValidation = {
  version: 1; validationId: string; solutionHash: string; passed: boolean; executedCount: number;
  results: Array<{ index: number; passed: boolean; kind: string; output: string; durationMs: number; artifactRef: string }>;
};

function valid(value: unknown): value is GeneratedExecutionValidation {
  const item = value as Partial<GeneratedExecutionValidation> | null;
  return Boolean(item && item.version === 1 && typeof item.validationId === 'string' && typeof item.solutionHash === 'string'
    && typeof item.passed === 'boolean' && Number.isInteger(item.executedCount) && Array.isArray(item.results)
    && item.results.length === item.executedCount && item.results.every((result) => typeof result.artifactRef === 'string' && result.artifactRef.startsWith('content-validation:')));
}

export async function validateGeneratedExecution(baseUrl: string, request: ExecutionRequest, fetcher: Fetcher = fetch): Promise<GeneratedExecutionValidation | null> {
  if (!baseUrl.trim()) return null;
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/content/validate-execution`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    return valid(value) ? value : null;
  } catch { return null; }
}

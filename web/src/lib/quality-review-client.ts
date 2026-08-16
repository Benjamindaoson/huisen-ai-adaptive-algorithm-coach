import type { QualityComparison, TeacherReview } from './quality-review';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type AdjudicationQueueItem = { comparisonId: string; reviewerIds: string[]; candidateHashes: [string, string] };
export type QualityWorkbench = {
  comparisons: QualityComparison[];
  teacherReviews: TeacherReview[];
  adjudicationQueue: AdjudicationQueueItem[];
  calibrations: Array<{ modelId: string; heldOutCases: number; agreement: number; authoritative: boolean }>;
  qualityGate: { passed: boolean; eligibleRealCaseCount: number; minimumEligibleRealCases: number; failures: string[] } | null;
  storage: 'memory' | 'file-local';
};

export type RemoteTeacherReviewInput = {
  id: string;
  comparisonId: string;
  reviewerId: string;
  preferredHash: string;
  rubric: { localization: boolean; cause: boolean; evidence: boolean; minimalHint: boolean; leakage: boolean };
  evidenceRefs: string[];
  notes: string;
  reviewedAt: string;
};

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function parseWorkbench(value: unknown): QualityWorkbench | null {
  const item = value as Partial<QualityWorkbench> | null;
  if (!item || !Array.isArray(item.comparisons) || !Array.isArray(item.teacherReviews) || !Array.isArray(item.adjudicationQueue) || !Array.isArray(item.calibrations) ||
    (item.qualityGate !== null && typeof item.qualityGate !== 'object') || !['memory', 'file-local'].includes(item.storage ?? '')) return null;
  return item as QualityWorkbench;
}

export async function fetchQualityWorkbench(baseUrl: string, fetcher: Fetcher = fetch, signal?: AbortSignal): Promise<QualityWorkbench | null> {
  if (!baseUrl) return null;
  try {
    const response = await fetcher(endpoint(baseUrl, '/quality/workbench'), { signal: signal ?? AbortSignal.timeout(6_000) });
    if (!response.ok) return null;
    return parseWorkbench(await response.json());
  } catch { return null; }
}

export async function submitQualityReview(baseUrl: string, input: RemoteTeacherReviewInput, fetcher: Fetcher = fetch): Promise<TeacherReview | null> {
  if (!baseUrl) return null;
  try {
    const response = await fetcher(endpoint(baseUrl, '/quality/reviews'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    return await response.json() as TeacherReview;
  } catch { return null; }
}

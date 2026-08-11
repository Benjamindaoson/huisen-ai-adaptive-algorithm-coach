import type { LearnerProfile, LearningEvent } from './learner-memory';
import type { AgentDecision } from './learning-orchestrator';
import { learnerIdentityClient, type LearnerIdentityClient } from './learner-identity-client';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type RemotePlanRequest = {
  learnerId: string;
  now?: string;
  candidates: Array<{ problemId: string; title: string; skillId: string }>;
};

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithRetry(action: () => Promise<Response>, attempts = 3): Promise<Response | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await action();
      if (response.ok || !retryable(response.status) || attempt === attempts - 1) return response;
    } catch {
      if (attempt === attempts - 1) return null;
    }
    await new Promise((resolve) => setTimeout(resolve, 75 * (2 ** attempt)));
  }
  return null;
}

export function resolveLearningApiUrl(): string {
  return (import.meta.env.VITE_LEARNING_API_URL ?? '').trim();
}

export async function syncLearnerProfile(baseUrl: string, profile: LearnerProfile, fetcher: Fetcher = fetch, identity: LearnerIdentityClient = learnerIdentityClient): Promise<boolean> {
  if (!baseUrl) return false;
  const { learnerId, ...body } = profile;
  try {
    const authorization = await identity.headers(baseUrl, learnerId);
    const response = await fetchWithRetry(() => fetcher(endpoint(baseUrl, `/learners/${encodeURIComponent(learnerId)}/profile`), {
      method: 'PUT', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify(body), signal: AbortSignal.timeout(6_000),
    }));
    return response?.ok ?? false;
  } catch { return false; }
}

export async function syncLearningEvent(baseUrl: string, event: LearningEvent, fetcher: Fetcher = fetch, identity: LearnerIdentityClient = learnerIdentityClient): Promise<boolean> {
  if (!baseUrl) return false;
  const { learnerId, ...body } = event;
  try {
    const authorization = await identity.headers(baseUrl, learnerId);
    const response = await fetchWithRetry(() => fetcher(endpoint(baseUrl, `/learners/${encodeURIComponent(learnerId)}/events`), {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify(body), signal: AbortSignal.timeout(6_000),
    }));
    return response?.ok ?? false;
  } catch { return false; }
}

export async function syncLearningEventsBatch(baseUrl: string, learnerId: string, events: LearningEvent[], fetcher: Fetcher = fetch, identity: LearnerIdentityClient = learnerIdentityClient): Promise<boolean> {
  if (!baseUrl) return false;
  if (!events.length) return true;
  if (events.length > 100 || events.some((event) => event.learnerId !== learnerId)) return false;
  const safeEvents = events.map(({ learnerId: _learnerId, ...event }) => event);
  try {
    const authorization = await identity.headers(baseUrl, learnerId);
    const response = await fetchWithRetry(() => fetcher(endpoint(baseUrl, `/learners/${encodeURIComponent(learnerId)}/events/batch`), {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify({ events: safeEvents }), signal: AbortSignal.timeout(8_000),
    }));
    return response?.ok ?? false;
  } catch { return false; }
}

export async function requestRemotePlan(baseUrl: string, request: RemotePlanRequest, fetcher: Fetcher = fetch, signal?: AbortSignal, identity: LearnerIdentityClient = learnerIdentityClient): Promise<AgentDecision | null> {
  if (!baseUrl) return null;
  try {
    const authorization = await identity.headers(baseUrl, request.learnerId);
    const response = await fetchWithRetry(() => fetcher(endpoint(baseUrl, '/agent/plan'), {
      method: 'POST', headers: { 'content-type': 'application/json', ...authorization }, body: JSON.stringify(request), signal: signal ?? AbortSignal.timeout(6_000),
    }));
    if (!response?.ok) return null;
    const value = await response.json() as Partial<AgentDecision>;
    if (value.version !== 1 || value.role !== 'learning-orchestrator' || typeof value.traceId !== 'string' ||
      !Array.isArray(value.tools) || !Array.isArray(value.evidence) || !Array.isArray(value.actions)) return null;
    return value as AgentDecision;
  } catch { return null; }
}

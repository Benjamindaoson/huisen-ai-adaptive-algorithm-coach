type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export type LearningStateKind = 'drafts' | 'progress' | 'practice' | 'exam' | 'mastery' | 'delayed-reviews';
export type AccountSummary = { id: string; roles: Array<'learner' | 'reviewer' | 'admin'>; email?: string; emailVerified?: boolean };
export type PlatformSession = { authenticated: boolean; account?: AccountSummary };
export type PlatformBootstrap = {
  profile?: Record<string, unknown>; events: Array<Record<string, unknown>>; attempts: Array<Record<string, unknown>>;
  states: Array<{ learnerId: string; kind: LearningStateKind; version: number; payload: Record<string, unknown>; updatedAt: string }>;
  cursor: number;
};
export type DurableSubmission = { id:string; problemId:string; problemVersionId:string; status:'queued'|'running'|'cancelled'|'passed'|'failed'|'error'; submittedAt:number; completedAt?:number; passedCount:number; totalCount:number; timeMs?:number; error?:string; revision:number };
export type AvailableJudgePack = { problemId:string;problemVersionId:string;trustLevel:'starter'|'gold' };

export class PlatformApiError extends Error {
  override readonly name = 'PlatformApiError';
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;
  constructor(status: number, code: string, detail?: unknown) { super(code); this.status = status; this.code = code; this.detail = detail; }
}

function endpoint(baseUrl: string, path: string): string { return `${baseUrl.replace(/\/$/, '')}${path}`; }

export function resolvePlatformApiUrl(): string {
  return (import.meta.env.VITE_PLATFORM_API_URL ?? import.meta.env.VITE_LEARNING_API_URL ?? '').trim();
}

export function createPlatformClient(options: { baseUrl: string; fetcher?: Fetcher; csrfToken?: string }) {
  const fetcher = options.fetcher ?? ((input: string | URL | Request, init?: RequestInit) => fetch(input, init));
  let csrfToken = options.csrfToken ?? '';

  async function request<T>(path: string, init: RequestInit = {}, write = false, allowCsrfRefresh = true): Promise<T> {
    const headers: Record<string, string> = { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers as Record<string, string> | undefined) };
    if (write && csrfToken) headers['x-csrf-token'] = csrfToken;
    const response = await fetcher(endpoint(options.baseUrl, path), { ...init, headers, credentials: 'include' });
    const body = response.status === 204 ? undefined : await response.json().catch(() => undefined) as unknown;
    if (!response.ok) {
      const envelope = body && typeof body === 'object' ? body as { error?: unknown; state?: unknown } : {};
      const code = typeof envelope.error === 'string' ? envelope.error : envelope.error && typeof envelope.error === 'object' && typeof (envelope.error as { code?: unknown }).code === 'string'
        ? String((envelope.error as { code: string }).code) : `http-${response.status}`;
      const message = envelope.error && typeof envelope.error === 'object' && typeof (envelope.error as { message?: unknown }).message === 'string'
        ? String((envelope.error as { message: string }).message) : code;
      if (write && allowCsrfRefresh && code === 'invalid-session-or-csrf') {
        const refreshed = await request<{ csrfToken: string }>('/api/v1/auth/sessions/csrf', { method: 'POST' }, false, false);
        csrfToken = refreshed.csrfToken;
        return request<T>(path, init, true, false);
      }
      const failure = new PlatformApiError(response.status, code, body); failure.message = message; throw failure;
    }
    return body as T;
  }

  return {
    capabilities: () => request<Record<string, unknown>>('/api/v1/capabilities'),
    session: () => request<PlatformSession>('/api/v1/auth/session'),
    async restoreSession() {
      const session = await request<PlatformSession>('/api/v1/auth/session');
      if (session.authenticated) csrfToken = (await request<{ csrfToken: string }>('/api/v1/auth/sessions/csrf', { method: 'POST' })).csrfToken;
      return session;
    },
    register: (input: { email: string; password: string }) => request<{ account: AccountSummary; developmentVerificationToken?: string }>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    verifyEmail: (token: string) => request<{ account: AccountSummary }>('/api/v1/auth/verify', { method: 'POST', body: JSON.stringify({ token }) }),
    async signIn(input: { email: string; password: string; deviceName?: string }) {
      const result = await request<{ account: AccountSummary; csrfToken: string; expiresAt: string }>('/api/v1/auth/sessions', { method: 'POST', body: JSON.stringify(input) });
      csrfToken = result.csrfToken; return result;
    },
    async refreshSession() {
      const result = await request<{ account: AccountSummary; csrfToken: string; expiresAt: string }>('/api/v1/auth/sessions/refresh', { method: 'POST' }, true);
      csrfToken = result.csrfToken; return result;
    },
    async signOut() { await request<void>('/api/v1/auth/sessions/current', { method: 'DELETE' }, true); csrfToken = ''; },
    requestRecovery: (email: string) => request<{ accepted: true }>('/api/v1/auth/recovery', { method: 'POST', body: JSON.stringify({ email }) }),
    completeRecovery: (token: string, password: string) => request<{ completed: true }>('/api/v1/auth/recovery/complete', { method: 'POST', body: JSON.stringify({ token, password }) }),
    claimAnonymous: (anonymousLearnerId: string, idempotencyKey: string) => request<Record<string, unknown>>('/api/v1/auth/anonymous/claim', { method: 'POST', body: JSON.stringify({ anonymousLearnerId, idempotencyKey }) }, true),
    bootstrap: (learnerId: string) => request<PlatformBootstrap>(`/api/v1/learners/${encodeURIComponent(learnerId)}/bootstrap`),
    sync: (learnerId: string, after: number) => request<{ cursor: number; events: Array<Record<string, unknown>> }>(`/api/v1/learners/${encodeURIComponent(learnerId)}/sync?after=${after}`),
    putProfile: (learnerId: string, profile: Record<string, unknown>) => request<Record<string, unknown>>(`/api/v1/learners/${encodeURIComponent(learnerId)}/profile`, { method: 'PUT', body: JSON.stringify(profile) }, true),
    appendEvent: (learnerId: string, event: Record<string, unknown>) => request<Record<string, unknown>>(`/api/v1/learners/${encodeURIComponent(learnerId)}/events`, { method: 'POST', body: JSON.stringify(event) }, true),
    appendEvents: (learnerId: string, events: Array<Record<string, unknown>>) => request<{ accepted: number; created: number }>(`/api/v1/learners/${encodeURIComponent(learnerId)}/events/batch`, { method: 'POST', body: JSON.stringify({ events }) }, true),
    putState: (learnerId: string, kind: LearningStateKind, state: { expectedVersion: number; payload: Record<string, unknown>; updatedAt: string }) => request<Record<string, unknown>>(`/api/v1/learners/${encodeURIComponent(learnerId)}/states/${kind}`, { method: 'PUT', body: JSON.stringify(state) }, true),
    appendAttempt: (learnerId: string, attempt: Record<string, unknown>) => request<Record<string, unknown>>(`/api/v1/learners/${encodeURIComponent(learnerId)}/attempts`, { method: 'POST', body: JSON.stringify(attempt) }, true),
    createSubmission: (input:{problemVersionId:string;language:'python'|'javascript'|'java'|'cpp';sourceCode:string;idempotencyKey:string}) => request<DurableSubmission>('/api/v1/submissions',{method:'POST',body:JSON.stringify(input)},true),
    getSubmission: (id:string) => request<DurableSubmission>(`/api/v1/submissions/${encodeURIComponent(id)}`),
    cancelSubmission: (id:string) => request<DurableSubmission>(`/api/v1/submissions/${encodeURIComponent(id)}`,{method:'DELETE'},true),
    availableJudgePacks: async () => (await request<{packs:AvailableJudgePack[]}>('/api/v1/judge-packs/available')).packs,
    exportUrl: (learnerId: string) => endpoint(options.baseUrl, `/api/v1/learners/${encodeURIComponent(learnerId)}/export`),
    deleteLearner: (learnerId: string) => request<void>(`/api/v1/learners/${encodeURIComponent(learnerId)}`, { method: 'DELETE' }, true),
  };
}

export type PlatformClient = ReturnType<typeof createPlatformClient>;

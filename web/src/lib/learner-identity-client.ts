type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type Credential = { version: 1; learnerId: string; token: string; expiresAt: string; mode: 'signed' | 'permissive-local' };
export type LearnerIdentityClient = { headers(baseUrl: string, learnerId: string): Promise<Record<string, string>> };

function valid(value: unknown, learnerId: string): value is Credential {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<Credential>;
  return item.version === 1 && item.learnerId === learnerId && typeof item.token === 'string' && typeof item.expiresAt === 'string'
    && Number.isFinite(Date.parse(item.expiresAt)) && ['signed', 'permissive-local'].includes(item.mode ?? '')
    && (item.mode !== 'signed' || Boolean(item.token));
}

export function createLearnerIdentityClient(options: {
  storage?: Storage;
  fetcher?: Fetcher;
  now?: () => Date;
  refreshWindowMs?: number;
} = {}): LearnerIdentityClient {
  const memory = new Map<string, string>();
  // Resolve global fetch at request time so tests, service workers, and host
  // instrumentation can replace it after module initialization.
  const fetcher: Fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
  const now = options.now ?? (() => new Date());
  const refreshWindowMs = Math.max(0, options.refreshWindowMs ?? 5 * 60_000);
  const pending = new Map<string, Promise<Credential>>();
  const read = (key: string) => { try { return options.storage?.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } };
  const write = (key: string, value: string) => { memory.set(key, value); try { options.storage?.setItem(key, value); } catch { /* in-memory cache remains available */ } };
  return {
    async headers(baseUrl, learnerId) {
      const normalizedBase = baseUrl.replace(/\/$/, '');
      const key = `mentor-credential:v1:${encodeURIComponent(normalizedBase)}:${learnerId}`;
      let credential: Credential | undefined;
      const cached = read(key);
      if (cached) {
        try { const value = JSON.parse(cached) as unknown; if (valid(value, learnerId) && Date.parse(value.expiresAt) > now().getTime() + refreshWindowMs) credential = value; }
        catch { /* refresh invalid cache */ }
      }
      if (!credential) {
        let request = pending.get(key);
        if (!request) {
          request = (async () => {
            const response = await fetcher(`${normalizedBase}/auth/anonymous`, {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ version: 1, learnerId }), signal: AbortSignal.timeout(6_000),
            });
            const value = response.ok ? await response.json() as unknown : null;
            if (!valid(value, learnerId)) throw new Error('Learner credential unavailable');
            write(key, JSON.stringify(value));
            return value;
          })();
          pending.set(key, request);
          void request.finally(() => pending.delete(key)).catch(() => undefined);
        }
        credential = await request;
      }
      const headers: Record<string, string> = credential.mode === 'signed' ? { authorization: `Bearer ${credential.token}` } : {};
      return headers;
    },
  };
}

export const learnerIdentityClient = createLearnerIdentityClient({ storage: typeof window === 'undefined' ? undefined : window.localStorage });

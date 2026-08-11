export const TELEMETRY_STORAGE_KEY = 'od-learning-telemetry-v1';

export type TelemetryEventName = 'practice-run' | 'practice-submit' | 'coach-hint' | 'coach-invalid' | 'exam-start' | 'exam-submit';
export type DurationBucket = '<1s' | '1-3s' | '3-10s' | '10-30s' | '30s+';
export type TelemetryEvent = {
  name: TelemetryEventName;
  createdAt: number;
  problemId?: string;
  language?: string;
  outcome?: string;
  durationBucket?: DurationBucket;
  skillIds?: string[];
};
export type TelemetryState = { version: 1; events: TelemetryEvent[] };

const NAMES: TelemetryEventName[] = ['practice-run', 'practice-submit', 'coach-hint', 'coach-invalid', 'exam-start', 'exam-submit'];
const BUCKETS: DurationBucket[] = ['<1s', '1-3s', '3-10s', '10-30s', '30s+'];
const EMPTY: TelemetryState = { version: 1, events: [] };

function durationBucket(durationMs: number): DurationBucket {
  if (durationMs < 1_000) return '<1s';
  if (durationMs < 3_000) return '1-3s';
  if (durationMs < 10_000) return '3-10s';
  if (durationMs < 30_000) return '10-30s';
  return '30s+';
}

function boundedString(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined;
}

export function recordTelemetry(storage: Pick<Storage, 'getItem' | 'setItem'>, input: Record<string, unknown>): void {
  if (!NAMES.includes(input.name as TelemetryEventName)) return;
  const event: TelemetryEvent = { name: input.name as TelemetryEventName, createdAt: Date.now() };
  const problemId = boundedString(input.problemId, 80);
  const language = boundedString(input.language, 20);
  const outcome = boundedString(input.outcome, 40);
  if (problemId) event.problemId = problemId;
  if (language) event.language = language;
  if (outcome) event.outcome = outcome;
  if (typeof input.durationMs === 'number' && Number.isFinite(input.durationMs) && input.durationMs >= 0) event.durationBucket = durationBucket(input.durationMs);
  if (Array.isArray(input.skillIds)) event.skillIds = input.skillIds.filter((item): item is string => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 40));
  const current = loadTelemetry(storage);
  storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({ version: 1, events: [...current.events, event].slice(-200) } satisfies TelemetryState));
}

export function loadTelemetry(storage: Pick<Storage, 'getItem'>): TelemetryState {
  const raw = storage.getItem(TELEMETRY_STORAGE_KEY);
  if (!raw) return { ...EMPTY, events: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY, events: [] };
    const state = value as Partial<TelemetryState>;
    if (state.version !== 1 || !Array.isArray(state.events) || !state.events.every(isEvent)) return { ...EMPTY, events: [] };
    return { version: 1, events: state.events.slice(-200) };
  } catch {
    return { ...EMPTY, events: [] };
  }
}

function isEvent(value: unknown): value is TelemetryEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as Partial<TelemetryEvent>;
  return NAMES.includes(event.name as TelemetryEventName)
    && typeof event.createdAt === 'number' && Number.isFinite(event.createdAt)
    && (event.problemId === undefined || typeof event.problemId === 'string')
    && (event.language === undefined || typeof event.language === 'string')
    && (event.outcome === undefined || typeof event.outcome === 'string')
    && (event.durationBucket === undefined || BUCKETS.includes(event.durationBucket))
    && (event.skillIds === undefined || (Array.isArray(event.skillIds) && event.skillIds.every((item) => typeof item === 'string')));
}

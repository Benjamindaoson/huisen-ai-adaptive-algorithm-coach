export const PROGRESS_STORAGE_KEY = 'od-learning-progress-v1';

export const PROGRESS_STATUSES = ['new', 'in-progress', 'mastered', 'review'] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export type ProgressEntry = {
  status: ProgressStatus;
  starred: boolean;
  note: string;
  updatedAt: string;
};

export type ProgressState = {
  version: 1;
  problems: Record<string, ProgressEntry>;
};

export function emptyProgress(): ProgressState {
  return { version: 1, problems: {} };
}

function isProgressStatus(value: unknown): value is ProgressStatus {
  return typeof value === 'string' && PROGRESS_STATUSES.includes(value as ProgressStatus);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function parseProgress(value: unknown): ProgressState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup format');
  const candidate = value as { version?: unknown; problems?: unknown };
  if (candidate.version !== 1) throw new Error('Unsupported backup version');
  if (!candidate.problems || typeof candidate.problems !== 'object' || Array.isArray(candidate.problems)) {
    throw new Error('Invalid backup problems');
  }

  const problems: Record<string, ProgressEntry> = {};
  for (const [id, entry] of Object.entries(candidate.problems)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Invalid backup record: ${id}`);
    const item = entry as Partial<ProgressEntry>;
    if (!isProgressStatus(item.status) || typeof item.starred !== 'boolean' || typeof item.note !== 'string' || !isIsoTimestamp(item.updatedAt)) {
      throw new Error(`Invalid backup record: ${id}`);
    }
    problems[id] = { status: item.status, starred: item.starred, note: item.note, updatedAt: item.updatedAt };
  }

  return { version: 1, problems };
}

export function loadProgress(storage: Storage): ProgressState {
  const stored = storage.getItem(PROGRESS_STORAGE_KEY);
  if (!stored) return emptyProgress();
  try {
    return parseProgress(JSON.parse(stored));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(storage: Storage, progress: ProgressState): void {
  storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function importProgress(json: string, mode: 'merge' | 'replace', current: ProgressState = emptyProgress()): ProgressState {
  const incoming = parseProgress(JSON.parse(json));
  if (mode === 'replace') return incoming;

  const problems = { ...current.problems };
  for (const [id, imported] of Object.entries(incoming.problems)) {
    const local = problems[id];
    if (!local || Date.parse(imported.updatedAt) > Date.parse(local.updatedAt)) problems[id] = imported;
  }
  return { version: 1, problems };
}

export function updateProgress(progress: ProgressState, id: string, patch: Partial<Omit<ProgressEntry, 'updatedAt'>>, now = new Date()): ProgressState {
  const current = progress.problems[id] ?? { status: 'new', starred: false, note: '', updatedAt: now.toISOString() };
  return {
    version: 1,
    problems: {
      ...progress.problems,
      [id]: { ...current, ...patch, updatedAt: now.toISOString() },
    },
  };
}

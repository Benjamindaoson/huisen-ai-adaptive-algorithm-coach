import type { ProblemLanguage } from './catalog';

export const PRACTICE_STORAGE_KEY = 'od-practice-state-v1';
export const MAX_ATTEMPTS_PER_LANGUAGE = 20;

export type AttemptMode = 'run' | 'sample-submit';
export type AttemptOutcome = 'executed' | 'passed' | 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';

export type CodeDraft = {
  problemId: string;
  language: ProblemLanguage;
  sourceCode: string;
  updatedAt: string;
};

export type AttemptFailedCase = {
  name: string;
  stdin: string;
  expectedOutput: string;
  actualOutput: string;
  verdict: Extract<AttemptOutcome, 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout'>;
};

export type AttemptEvidence = {
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  failedCase?: AttemptFailedCase;
};

export type PracticeAttempt = {
  id: string;
  problemId: string;
  language: ProblemLanguage;
  mode: AttemptMode;
  codeSnapshot: string;
  outcome: AttemptOutcome;
  summary: string;
  passedCount?: number;
  totalCount?: number;
  evidence?: AttemptEvidence;
  createdAt: string;
};

export type PracticeState = {
  version: 1;
  drafts: Record<string, CodeDraft>;
  attempts: PracticeAttempt[];
};

const LANGUAGES: ProblemLanguage[] = ['java', 'python', 'javascript', 'cpp'];
const MODES: AttemptMode[] = ['run', 'sample-submit'];
const OUTCOMES: AttemptOutcome[] = ['executed', 'passed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'];
const REVIEWABLE_OUTCOMES: AttemptFailedCase['verdict'][] = ['wrong-answer', 'compile-error', 'runtime-error', 'timeout'];
const OUTPUT_LIMIT = 32_000;
const INPUT_LIMIT = 10_000;

export function draftKey(problemId: string, language: ProblemLanguage): string {
  return `${problemId}:${language}`;
}

export function emptyPractice(): PracticeState {
  return { version: 1, drafts: {}, attempts: [] };
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isLanguage(value: unknown): value is ProblemLanguage {
  return typeof value === 'string' && LANGUAGES.includes(value as ProblemLanguage);
}

function parseDraft(value: unknown, key: string): CodeDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid practice draft: ${key}`);
  const draft = value as Partial<CodeDraft>;
  if (typeof draft.problemId !== 'string' || !isLanguage(draft.language) || typeof draft.sourceCode !== 'string' || !isTimestamp(draft.updatedAt)) {
    throw new Error(`Invalid practice draft: ${key}`);
  }
  if (draftKey(draft.problemId, draft.language) !== key) throw new Error(`Invalid practice draft key: ${key}`);
  return { problemId: draft.problemId, language: draft.language, sourceCode: draft.sourceCode, updatedAt: draft.updatedAt };
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function boundedString(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.length <= limit;
}

function parseAttemptEvidence(value: unknown, index: number): AttemptEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid practice attempt evidence: ${index}`);
  const evidence = value as Record<string, unknown>;
  if (!hasOnlyKeys(evidence, ['stdout', 'stderr', 'timeMs', 'failedCase'])) throw new Error(`Invalid practice attempt evidence: ${index}`);
  if (evidence.stdout !== undefined && !boundedString(evidence.stdout, OUTPUT_LIMIT)) throw new Error(`Invalid practice attempt evidence: ${index}`);
  if (evidence.stderr !== undefined && !boundedString(evidence.stderr, OUTPUT_LIMIT)) throw new Error(`Invalid practice attempt evidence: ${index}`);
  if (evidence.timeMs !== undefined && (typeof evidence.timeMs !== 'number' || !Number.isFinite(evidence.timeMs) || evidence.timeMs < 0)) throw new Error(`Invalid practice attempt evidence: ${index}`);

  let failedCase: AttemptFailedCase | undefined;
  if (evidence.failedCase !== undefined) {
    if (!evidence.failedCase || typeof evidence.failedCase !== 'object' || Array.isArray(evidence.failedCase)) throw new Error(`Invalid practice attempt evidence: ${index}`);
    const candidate = evidence.failedCase as Record<string, unknown>;
    if (!hasOnlyKeys(candidate, ['name', 'stdin', 'expectedOutput', 'actualOutput', 'verdict']) ||
      !boundedString(candidate.name, 200) || !boundedString(candidate.stdin, INPUT_LIMIT) ||
      !boundedString(candidate.expectedOutput, OUTPUT_LIMIT) || !boundedString(candidate.actualOutput, OUTPUT_LIMIT) ||
      !REVIEWABLE_OUTCOMES.includes(candidate.verdict as AttemptFailedCase['verdict'])) {
      throw new Error(`Invalid practice attempt evidence: ${index}`);
    }
    failedCase = candidate as AttemptFailedCase;
  }

  return {
    ...(evidence.stdout !== undefined ? { stdout: evidence.stdout as string } : {}),
    ...(evidence.stderr !== undefined ? { stderr: evidence.stderr as string } : {}),
    ...(evidence.timeMs !== undefined ? { timeMs: evidence.timeMs as number } : {}),
    ...(failedCase ? { failedCase } : {}),
  };
}

function parseAttempt(value: unknown, index: number): PracticeAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid practice attempt: ${index}`);
  const attempt = value as Partial<PracticeAttempt>;
  if (
    typeof attempt.id !== 'string' || !attempt.id ||
    typeof attempt.problemId !== 'string' || !attempt.problemId ||
    !isLanguage(attempt.language) || !MODES.includes(attempt.mode as AttemptMode) ||
    typeof attempt.codeSnapshot !== 'string' || !OUTCOMES.includes(attempt.outcome as AttemptOutcome) ||
    typeof attempt.summary !== 'string' || !isTimestamp(attempt.createdAt)
  ) throw new Error(`Invalid practice attempt: ${index}`);
  if (attempt.passedCount !== undefined && (!Number.isInteger(attempt.passedCount) || attempt.passedCount < 0)) throw new Error(`Invalid practice attempt: ${index}`);
  if (attempt.totalCount !== undefined && (!Number.isInteger(attempt.totalCount) || attempt.totalCount < 0)) throw new Error(`Invalid practice attempt: ${index}`);
  const evidence = attempt.evidence === undefined ? undefined : parseAttemptEvidence(attempt.evidence, index);
  return { ...attempt, ...(evidence ? { evidence } : {}) } as PracticeAttempt;
}

export function parsePracticeState(value: unknown): PracticeState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid practice format');
  const candidate = value as { version?: unknown; drafts?: unknown; attempts?: unknown };
  if (candidate.version !== 1) throw new Error('Unsupported practice version');
  if (!candidate.drafts || typeof candidate.drafts !== 'object' || Array.isArray(candidate.drafts)) throw new Error('Invalid practice drafts');
  if (!Array.isArray(candidate.attempts)) throw new Error('Invalid practice attempts');

  const drafts = Object.fromEntries(Object.entries(candidate.drafts).map(([key, draft]) => [key, parseDraft(draft, key)]));
  const attempts = candidate.attempts.map(parseAttempt);
  return { version: 1, drafts, attempts };
}

export function loadPractice(storage: Pick<Storage, 'getItem'>): PracticeState {
  const stored = storage.getItem(PRACTICE_STORAGE_KEY);
  if (!stored) return emptyPractice();
  try {
    return parsePracticeState(JSON.parse(stored));
  } catch {
    return emptyPractice();
  }
}

export function savePractice(storage: Pick<Storage, 'setItem'>, practice: PracticeState): void {
  storage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(practice));
}

export function updateDraft(
  state: PracticeState,
  problemId: string,
  language: ProblemLanguage,
  sourceCode: string,
  now = new Date(),
): PracticeState {
  const key = draftKey(problemId, language);
  return {
    ...state,
    drafts: { ...state.drafts, [key]: { problemId, language, sourceCode, updatedAt: now.toISOString() } },
  };
}

export function recordAttempt(state: PracticeState, attempt: PracticeAttempt): PracticeState {
  const isSameStream = (item: PracticeAttempt) => item.problemId === attempt.problemId && item.language === attempt.language;
  const otherAttempts = state.attempts.filter((item) => !isSameStream(item));
  const recentAttempts = state.attempts.filter(isSameStream).slice(-(MAX_ATTEMPTS_PER_LANGUAGE - 1));
  return { ...state, attempts: [...otherAttempts, ...recentAttempts, attempt] };
}

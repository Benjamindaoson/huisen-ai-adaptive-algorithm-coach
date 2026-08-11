import type { ProblemLanguage } from './catalog';

export const EXAM_STORAGE_KEY = 'od-learning-exam-v1';

export type ExamVerdict = 'passed' | 'failed' | 'unanswered' | 'unjudgeable' | 'error';

export type ExamAnswer = {
  problemId: string;
  language: ProblemLanguage;
  sourceCode: string;
  updatedAt: number;
  touched: boolean;
};

export type ExamProblemResult = {
  problemId: string;
  verdict: ExamVerdict;
  passedCount: number;
  totalCount: number;
  errorSummary: string;
};

export type ExamReport = {
  submittedAt: number;
  durationUsedMs: number;
  score: number;
  gradingScope: 'public-samples';
  results: ExamProblemResult[];
};

export type ExamSession = {
  version: 1;
  id: string;
  status: 'running' | 'submitted';
  problemIds: string[];
  currentProblemId: string;
  startedAt: number;
  deadlineAt: number;
  answers: Record<string, ExamAnswer>;
  report?: ExamReport;
};

const LANGUAGES: ProblemLanguage[] = ['java', 'python', 'javascript', 'cpp'];
const VERDICTS: ExamVerdict[] = ['passed', 'failed', 'unanswered', 'unjudgeable', 'error'];

export function createExamSession(problemIds: string[], durationMinutes: number, now = Date.now(), id = `exam-${now}`): ExamSession {
  const uniqueIds = [...new Set(problemIds.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('考试至少需要一道题。');
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new Error('考试时长无效。');
  return {
    version: 1,
    id,
    status: 'running',
    problemIds: uniqueIds,
    currentProblemId: uniqueIds[0],
    startedAt: now,
    deadlineAt: now + Math.round(durationMinutes * 60_000),
    answers: {},
  };
}

export function remainingExamMs(exam: ExamSession, now = Date.now()): number {
  return exam.status === 'submitted' ? 0 : Math.max(0, exam.deadlineAt - now);
}

export function selectExamProblem(exam: ExamSession, problemId: string): ExamSession {
  if (!exam.problemIds.includes(problemId)) throw new Error('题目不属于本场考试。');
  return { ...exam, currentProblemId: problemId };
}

export function updateExamAnswer(exam: ExamSession, problemId: string, language: ProblemLanguage, sourceCode: string, now = Date.now()): ExamSession {
  return writeExamAnswer(exam, problemId, language, sourceCode, true, now);
}

export function setExamAnswerLanguage(exam: ExamSession, problemId: string, language: ProblemLanguage, sourceCode: string, now = Date.now()): ExamSession {
  return writeExamAnswer(exam, problemId, language, sourceCode, false, now);
}

function writeExamAnswer(exam: ExamSession, problemId: string, language: ProblemLanguage, sourceCode: string, touched: boolean, now: number): ExamSession {
  if (exam.status === 'submitted') throw new Error('submitted exam cannot be edited');
  if (!exam.problemIds.includes(problemId)) throw new Error('题目不属于本场考试。');
  if (!LANGUAGES.includes(language)) throw new Error('不支持的语言。');
  return {
    ...exam,
    answers: {
      ...exam.answers,
      [problemId]: { problemId, language, sourceCode, updatedAt: now, touched },
    },
  };
}

export function submitExam(exam: ExamSession, report: ExamReport): ExamSession {
  if (exam.status === 'submitted') return exam;
  return { ...exam, status: 'submitted', report };
}

export function saveExam(storage: Pick<Storage, 'setItem'>, exam: ExamSession): void {
  storage.setItem(EXAM_STORAGE_KEY, JSON.stringify(exam));
}

export function loadExam(storage: Pick<Storage, 'getItem'>): ExamSession | null {
  const raw = storage.getItem(EXAM_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isExamSession(value) ? value : null;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isAnswer(value: unknown, expectedId: string): value is ExamAnswer {
  if (!isRecord(value)) return false;
  return value.problemId === expectedId
    && LANGUAGES.includes(value.language as ProblemLanguage)
    && typeof value.sourceCode === 'string'
    && value.sourceCode.length <= 200_000
    && isFiniteNumber(value.updatedAt)
    && typeof value.touched === 'boolean';
}

function isReport(value: unknown, problemIds: string[]): value is ExamReport {
  if (!isRecord(value) || value.gradingScope !== 'public-samples' || !isFiniteNumber(value.submittedAt)
    || !isFiniteNumber(value.durationUsedMs) || !isFiniteNumber(value.score) || value.score > 100
    || !Array.isArray(value.results) || value.results.length !== problemIds.length) return false;
  return value.results.every((result) => isRecord(result)
    && typeof result.problemId === 'string' && problemIds.includes(result.problemId)
    && VERDICTS.includes(result.verdict as ExamVerdict)
    && isFiniteNumber(result.passedCount) && isFiniteNumber(result.totalCount)
    && typeof result.errorSummary === 'string' && result.errorSummary.length <= 2_000);
}

function isExamSession(value: unknown): value is ExamSession {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string'
    || !['running', 'submitted'].includes(String(value.status))
    || !Array.isArray(value.problemIds) || value.problemIds.length < 1 || value.problemIds.length > 20
    || !value.problemIds.every((id) => typeof id === 'string' && id.length > 0)
    || new Set(value.problemIds).size !== value.problemIds.length
    || typeof value.currentProblemId !== 'string' || !value.problemIds.includes(value.currentProblemId)
    || !isFiniteNumber(value.startedAt) || !isFiniteNumber(value.deadlineAt) || value.deadlineAt <= value.startedAt
    || !isRecord(value.answers)) return false;
  const problemIds = value.problemIds as string[];
  if (!Object.entries(value.answers).every(([id, answer]) => problemIds.includes(id) && isAnswer(answer, id))) return false;
  return value.status === 'running' ? value.report === undefined : isReport(value.report, problemIds);
}

import type { ProblemLanguage } from './catalog';

export const EXAM_STORAGE_KEY = 'od-learning-exam-v1';

export type ExamVerdict = 'passed' | 'failed' | 'unanswered' | 'unjudgeable' | 'error';
export type ExamMode = 'independent' | 'ai-collaboration';
export type ExamEvidenceKind = 'prompt' | 'tool-action' | 'diff' | 'test' | 'learner-decision' | 'oral-response';
export type ExamCollaborationEventType = 'plan' | 'delegation' | 'review' | 'test' | 'correction' | 'oral-explanation';

export type ExamModePolicy = {
  mode: ExamMode;
  aiAssistance: 'disabled' | 'bounded';
  mentor: 'unavailable' | 'bounded';
  references: 'unavailable';
  historicalSolutions: 'unavailable';
};

export type ExamEvidence = {
  id: string;
  kind: ExamEvidenceKind;
  summary: string;
  source?: 'agent-runtime' | 'learner-action';
  artifactRef?: string;
};

export type ExamCollaborationEvent = {
  id: string;
  type: ExamCollaborationEventType;
  recordedAt: number;
  problemId?: string;
  evidence: readonly ExamEvidence[];
};

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
  gradingScope: 'public-samples' | 'trusted-hidden';
  results: ExamProblemResult[];
  dimensions: ExamReportDimensions;
};

export type ExamDimension = {
  status: 'observed' | 'not-observed';
  value?: number;
  confidence: 'low' | 'medium' | 'high';
  evidenceRefs: string[];
  rationale: string;
};

export type ExamReportDimensions = {
  algorithmAbility: ExamDimension;
  independentCompletion: ExamDimension;
  hintDependence: ExamDimension;
  aiCollaboration: ExamDimension;
};

export type ExamSession = {
  version: 2;
  id: string;
  status: 'running' | 'submitted';
  mode: ExamMode;
  problemIds: string[];
  currentProblemId: string;
  startedAt: number;
  deadlineAt: number;
  answers: Record<string, ExamAnswer>;
  collaborationEvents: ExamCollaborationEvent[];
  report?: ExamReport;
};

const LANGUAGES: ProblemLanguage[] = ['java', 'python', 'javascript', 'cpp'];
const VERDICTS: ExamVerdict[] = ['passed', 'failed', 'unanswered', 'unjudgeable', 'error'];

export function createExamSession(problemIds: string[], durationMinutes: number, now = Date.now(), id = `exam-${now}`, mode: ExamMode = 'independent'): ExamSession {
  const uniqueIds = [...new Set(problemIds.filter(Boolean))];
  if (!uniqueIds.length) throw new Error('考试至少需要一道题。');
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) throw new Error('考试时长无效。');
  return {
    version: 2,
    id,
    status: 'running',
    mode,
    problemIds: uniqueIds,
    currentProblemId: uniqueIds[0],
    startedAt: now,
    deadlineAt: now + Math.round(durationMinutes * 60_000),
    answers: {},
    collaborationEvents: [],
  };
}

export function getExamModePolicy(exam: Pick<ExamSession, 'mode'>): ExamModePolicy {
  return exam.mode === 'independent'
    ? { mode: 'independent', aiAssistance: 'disabled', mentor: 'unavailable', references: 'unavailable', historicalSolutions: 'unavailable' }
    : { mode: 'ai-collaboration', aiAssistance: 'bounded', mentor: 'bounded', references: 'unavailable', historicalSolutions: 'unavailable' };
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

export function submitExam(exam: ExamSession, report: ExamReport | Omit<ExamReport, 'dimensions'>): ExamSession {
  if (exam.status === 'submitted') return exam;
  return { ...exam, status: 'submitted', report: 'dimensions' in report ? report : { ...report, dimensions: legacyReportDimensions(report) } };
}

export function saveExam(storage: Pick<Storage, 'setItem'>, exam: ExamSession): void {
  storage.setItem(EXAM_STORAGE_KEY, JSON.stringify(exam));
}

export function loadExam(storage: Pick<Storage, 'getItem'>): ExamSession | null {
  const raw = storage.getItem(EXAM_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return migrateExamSession(value);
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
  if (!isLegacyReport(value, problemIds) || !isRecord(value.dimensions)) return false;
  return isReportDimensions(value.dimensions);
}

function isLegacyReport(value: unknown, problemIds: string[]): value is Record<string, unknown> & Omit<ExamReport, 'dimensions'> {
  if (!isRecord(value) || !['public-samples', 'trusted-hidden'].includes(String(value.gradingScope)) || !isFiniteNumber(value.submittedAt)
    || !isFiniteNumber(value.durationUsedMs) || !isFiniteNumber(value.score) || value.score > 100
    || !Array.isArray(value.results) || value.results.length !== problemIds.length) return false;
  return value.results.every((result) => isRecord(result)
    && typeof result.problemId === 'string' && problemIds.includes(result.problemId)
    && VERDICTS.includes(result.verdict as ExamVerdict)
    && isFiniteNumber(result.passedCount) && isFiniteNumber(result.totalCount)
    && typeof result.errorSummary === 'string' && result.errorSummary.length <= 2_000);
}

function isExamSession(value: unknown): value is ExamSession {
  if (!isRecord(value) || value.version !== 2 || typeof value.id !== 'string'
    || !['running', 'submitted'].includes(String(value.status))
    || !['independent', 'ai-collaboration'].includes(String(value.mode))
    || !Array.isArray(value.problemIds) || value.problemIds.length < 1 || value.problemIds.length > 20
    || !value.problemIds.every((id) => typeof id === 'string' && id.length > 0)
    || new Set(value.problemIds).size !== value.problemIds.length
    || typeof value.currentProblemId !== 'string' || !value.problemIds.includes(value.currentProblemId)
    || !isFiniteNumber(value.startedAt) || !isFiniteNumber(value.deadlineAt) || value.deadlineAt <= value.startedAt
    || !isRecord(value.answers) || !Array.isArray(value.collaborationEvents) || value.collaborationEvents.length > 100) return false;
  const problemIds = value.problemIds as string[];
  if (!Object.entries(value.answers).every(([id, answer]) => problemIds.includes(id) && isAnswer(answer, id))) return false;
  if (!value.collaborationEvents.every((event) => isCollaborationEvent(event, problemIds))) return false;
  if (value.mode === 'independent' && value.collaborationEvents.length > 0) return false;
  return value.status === 'running' ? value.report === undefined : isReport(value.report, problemIds);
}

function migrateExamSession(value: unknown): ExamSession | null {
  if (isExamSession(value)) return value;
  if (!isLegacyExamSession(value)) return null;
  return {
    ...value,
    version: 2,
    mode: 'independent',
    collaborationEvents: [],
    report: value.status === 'submitted' && value.report ? { ...value.report, dimensions: legacyReportDimensions(value.report) } : undefined,
  };
}

export function parseExamSession(value: unknown): ExamSession | null {
  return migrateExamSession(value);
}

function isLegacyExamSession(value: unknown): value is Omit<ExamSession, 'version' | 'mode' | 'collaborationEvents' | 'report'> & { version: 1; report?: Omit<ExamReport, 'dimensions'> } {
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
  return value.status === 'running' ? value.report === undefined : isLegacyReport(value.report, problemIds);
}

function isReportDimensions(value: Record<string, unknown>): value is ExamReportDimensions {
  const dimensionNames = ['algorithmAbility', 'independentCompletion', 'hintDependence', 'aiCollaboration'];
  return dimensionNames.every((name) => {
    const dimension = value[name];
    return isRecord(dimension)
      && ['observed', 'not-observed'].includes(String(dimension.status))
      && (dimension.value === undefined || isFiniteNumber(dimension.value))
      && ['low', 'medium', 'high'].includes(String(dimension.confidence))
      && Array.isArray(dimension.evidenceRefs) && dimension.evidenceRefs.every((ref) => typeof ref === 'string' && ref.length <= 200)
      && typeof dimension.rationale === 'string' && dimension.rationale.length <= 2_000;
  });
}

export function isCollaborationEvent(value: unknown, problemIds: string[]): value is ExamCollaborationEvent {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || value.id.length > 120
    || !['plan', 'delegation', 'review', 'test', 'correction', 'oral-explanation'].includes(String(value.type))
    || !isFiniteNumber(value.recordedAt) || (value.problemId !== undefined && (!problemIds.includes(String(value.problemId)) || typeof value.problemId !== 'string'))
    || !Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 8) return false;
  const evidence = value.evidence as unknown[];
  if (!evidence.every((item) => isEvidence(item))) return false;
  const kinds = evidence.map((item) => (item as ExamEvidence).kind);
  if (value.type === 'plan') return kinds.includes('prompt');
  if (value.type === 'delegation') return kinds.includes('prompt') || kinds.includes('tool-action');
  if (value.type === 'review') return kinds.includes('diff') && kinds.includes('learner-decision');
  if (value.type === 'test') return kinds.includes('test');
  if (value.type === 'correction') return kinds.includes('diff');
  return kinds.includes('oral-response');
}

function isEvidence(value: unknown): value is ExamEvidence {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 120
    && ['prompt', 'tool-action', 'diff', 'test', 'learner-decision', 'oral-response'].includes(String(value.kind))
    && typeof value.summary === 'string' && value.summary.length > 0 && value.summary.length <= 2_000
    && (value.source === undefined || ['agent-runtime', 'learner-action'].includes(String(value.source)))
    && (value.artifactRef === undefined || (typeof value.artifactRef === 'string' && value.artifactRef.startsWith('exam-agent:') && value.artifactRef.length <= 300));
}

function legacyReportDimensions(report: Omit<ExamReport, 'dimensions'>): ExamReportDimensions {
  return {
    algorithmAbility: observedDimension(report.score, report.results.map((result) => `result:${result.problemId}`), 'Migrated public-sample result.'),
    independentCompletion: { status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale: 'Legacy sessions did not record independent-completion evidence.' },
    hintDependence: { status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale: 'Legacy sessions did not record hint evidence.' },
    aiCollaboration: { status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale: 'This legacy session defaults to independent mode.' },
  };
}

function observedDimension(value: number, evidenceRefs: string[], rationale: string): ExamDimension {
  return { status: 'observed', value, confidence: 'low', evidenceRefs, rationale };
}

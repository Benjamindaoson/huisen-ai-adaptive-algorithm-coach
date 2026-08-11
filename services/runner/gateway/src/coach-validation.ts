import { ALLOWED_LANGUAGES, type AllowedLanguage } from './validation.js';

export type CoachHintLevel = 1 | 2 | 3 | 4;
export type CoachOutcome = 'executed' | 'passed' | 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';

export type CoachRequest = {
  version: 1;
  hintLevel: CoachHintLevel;
  question?: string;
  problem: { id: string; title: string; description: string; input: string; output: string };
  attempt: {
    id: string;
    language: AllowedLanguage;
    outcome: CoachOutcome;
    summary: string;
    code: string;
    evidence?: {
      stdout?: string;
      stderr?: string;
      timeMs?: number;
      failedCase?: { name: string; stdin: string; expectedOutput: string; actualOutput: string; verdict: CoachOutcome };
    };
  };
  mastery: Array<{ skillId: string; score: number; confidence: number; evidenceCount: number; recentErrorKinds: string[] }>;
  referenceSolution?: string;
};

const OUTCOMES: CoachOutcome[] = ['executed', 'passed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'];
const FORBIDDEN_KEYS = new Set(['hidden', 'hiddentests', 'expectedhiddenoutput', 'officialcases']);

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function rejectHiddenData(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(rejectHiddenData);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) throw new Error('Hidden test data is forbidden');
    rejectHiddenData(child);
  }
}

function onlyKeys(value: Record<string, unknown>, allowed: string[]): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new Error(`Unknown coach field: ${unknown}`);
}

function stringField(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string') throw new Error(`Invalid coach ${name}`);
  if (value.length > max) throw new Error(`Coach ${name} exceeds ${max} characters`);
  return value;
}

function finiteUnit(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error(`Invalid coach ${name}`);
  return value;
}

function validateEvidence(value: unknown): void {
  const evidence = record(value, 'Invalid coach evidence');
  onlyKeys(evidence, ['stdout', 'stderr', 'timeMs', 'failedCase']);
  if (evidence.stdout !== undefined) stringField(evidence.stdout, 'stdout', 32_000);
  if (evidence.stderr !== undefined) stringField(evidence.stderr, 'stderr', 32_000);
  if (evidence.timeMs !== undefined && (typeof evidence.timeMs !== 'number' || !Number.isFinite(evidence.timeMs) || evidence.timeMs < 0)) throw new Error('Invalid coach timeMs');
  if (evidence.failedCase !== undefined) {
    const failedCase = record(evidence.failedCase, 'Invalid coach failed case');
    onlyKeys(failedCase, ['name', 'stdin', 'expectedOutput', 'actualOutput', 'verdict']);
    stringField(failedCase.name, 'case name', 200);
    stringField(failedCase.stdin, 'case input', 10_000);
    stringField(failedCase.expectedOutput, 'expected output', 32_000);
    stringField(failedCase.actualOutput, 'actual output', 32_000);
    if (!OUTCOMES.includes(failedCase.verdict as CoachOutcome)) throw new Error('Invalid coach case verdict');
  }
}

export function validateCoachRequest(body: unknown): CoachRequest {
  rejectHiddenData(body);
  const request = record(body, 'Invalid coach request');
  onlyKeys(request, ['version', 'hintLevel', 'question', 'problem', 'attempt', 'mastery', 'referenceSolution']);
  if (request.version !== 1) throw new Error('Unsupported coach version');
  if (![1, 2, 3, 4].includes(request.hintLevel as number)) throw new Error('Invalid hint level');
  const hintLevel = request.hintLevel as CoachHintLevel;
  if (request.question !== undefined) stringField(request.question, 'question', 1_000);
  if (request.referenceSolution !== undefined) {
    if (hintLevel !== 4) throw new Error('Reference solution requires level four');
    stringField(request.referenceSolution, 'reference solution', 50_000);
  }

  const problem = record(request.problem, 'Invalid coach problem');
  onlyKeys(problem, ['id', 'title', 'description', 'input', 'output']);
  stringField(problem.id, 'problem id', 200);
  stringField(problem.title, 'problem title', 300);
  stringField(problem.description, 'problem description', 12_000);
  stringField(problem.input, 'problem input', 4_000);
  stringField(problem.output, 'problem output', 4_000);

  const attempt = record(request.attempt, 'Invalid coach attempt');
  onlyKeys(attempt, ['id', 'language', 'outcome', 'summary', 'code', 'evidence']);
  stringField(attempt.id, 'attempt id', 200);
  if (!ALLOWED_LANGUAGES.includes(attempt.language as AllowedLanguage)) throw new Error('Unsupported coach language');
  if (!OUTCOMES.includes(attempt.outcome as CoachOutcome)) throw new Error('Invalid coach outcome');
  stringField(attempt.summary, 'summary', 1_000);
  stringField(attempt.code, 'code', 50_000);
  if (attempt.evidence !== undefined) validateEvidence(attempt.evidence);

  if (!Array.isArray(request.mastery) || request.mastery.length > 8) throw new Error('Invalid coach mastery');
  for (const rawItem of request.mastery) {
    const item = record(rawItem, 'Invalid coach mastery item');
    onlyKeys(item, ['skillId', 'score', 'confidence', 'evidenceCount', 'recentErrorKinds']);
    stringField(item.skillId, 'skill id', 100);
    finiteUnit(item.score, 'mastery score');
    finiteUnit(item.confidence, 'mastery confidence');
    if (!Number.isInteger(item.evidenceCount) || (item.evidenceCount as number) < 0) throw new Error('Invalid coach evidence count');
    if (!Array.isArray(item.recentErrorKinds) || item.recentErrorKinds.length > 3 || item.recentErrorKinds.some((kind) => typeof kind !== 'string')) throw new Error('Invalid coach error kinds');
  }

  return request as CoachRequest;
}

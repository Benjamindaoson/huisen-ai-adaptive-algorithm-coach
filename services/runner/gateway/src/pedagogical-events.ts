export const PEDAGOGICAL_EVENT_KINDS = [
  'problem-opened', 'lesson-opened', 'prediction-submitted', 'plan-recorded', 'meaningful-edit-recorded',
  'run-recorded', 'test-recorded', 'hint-requested', 'hint-viewed', 'reference-viewed', 'submission-recorded',
  'diagnosis-recorded', 'remediation-started', 'transfer-recorded', 'review-recorded',
] as const;

export type PedagogicalEventKind = (typeof PEDAGOGICAL_EVENT_KINDS)[number];
export type PedagogicalEvent = { version: 1; id: string; learnerId: string; kind: PedagogicalEventKind; problemId?: string; attemptId?: string; createdAt: string; skillIds?: string[]; evidenceRefs: string[]; data: Record<string, unknown> };

const OUTCOMES = ['passed', 'failed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'];
const PASTE_BANDS = ['none', 'small', 'medium', 'large'];
const PLAN_KINDS = ['pseudocode', 'invariant', 'case-analysis'];
const DIAGNOSIS_KINDS = ['wrong-answer', 'compile-error', 'runtime-error', 'logic', 'conceptual'];

function invalid(): never { throw new Error('Invalid pedagogical event'); }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(); return value as Record<string, unknown>; }
function onlyKeys(value: Record<string, unknown>, keys: string[]): void { if (Object.keys(value).some((key) => !keys.includes(key))) invalid(); }
function validId(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase()); }
function validRef(value: unknown): value is string { return typeof value === 'string' && /^[a-zA-Z0-9._:/-]{1,200}$/.test(value); }
function validHash(value: unknown): value is string { return typeof value === 'string' && /^[a-fA-F0-9]{16,128}$/.test(value); }
function validTimestamp(value: unknown): value is string { return typeof value === 'string' && !Number.isNaN(Date.parse(value)); }
function boundedInteger(value: unknown, maximum = 10_000): value is number { return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= maximum; }

function validateData(kind: PedagogicalEventKind, value: unknown): Record<string, unknown> {
  const data = record(value);
  if (kind === 'problem-opened' || kind === 'lesson-opened' || kind === 'reference-viewed') onlyKeys(data, []);
  else if (kind === 'prediction-submitted') {
    onlyKeys(data, ['correct', 'conceptId']);
    if (typeof data.correct !== 'boolean' || (data.conceptId !== undefined && !validId(data.conceptId))) invalid();
  } else if (kind === 'plan-recorded') {
    onlyKeys(data, ['planKind']);
    if (!PLAN_KINDS.includes(data.planKind as string)) invalid();
  } else if (kind === 'meaningful-edit-recorded') {
    onlyKeys(data, ['beforeHash', 'afterHash', 'insertedLines', 'deletedLines', 'changedRanges', 'pasteBand']);
    if (!validHash(data.beforeHash) || !validHash(data.afterHash) || data.beforeHash === data.afterHash || !boundedInteger(data.insertedLines) || !boundedInteger(data.deletedLines) || !PASTE_BANDS.includes(data.pasteBand as string) || !Array.isArray(data.changedRanges) || data.changedRanges.length === 0 || data.changedRanges.length > 12) invalid();
    for (const range of data.changedRanges) {
      const item = record(range);
      onlyKeys(item, ['startLine', 'endLine']);
      if (!boundedInteger(item.startLine, 100_000) || !boundedInteger(item.endLine, 100_000) || item.startLine < 1 || item.startLine > item.endLine) invalid();
    }
  } else if (kind === 'run-recorded' || kind === 'test-recorded' || kind === 'submission-recorded') {
    onlyKeys(data, ['outcome']);
    if (!OUTCOMES.includes(data.outcome as string)) invalid();
  } else if (kind === 'hint-requested' || kind === 'hint-viewed') {
    onlyKeys(data, ['level']);
    if (![1, 2, 3, 4].includes(data.level as number)) invalid();
  } else if (kind === 'diagnosis-recorded') {
    onlyKeys(data, ['diagnosisKind', 'misconceptionId']);
    if (!DIAGNOSIS_KINDS.includes(data.diagnosisKind as string) || !validId(data.misconceptionId)) invalid();
  } else if (kind === 'remediation-started') {
    onlyKeys(data, ['targetSkillId']);
    if (!validId(data.targetSkillId)) invalid();
  } else if (kind === 'transfer-recorded' || kind === 'review-recorded') {
    onlyKeys(data, ['outcome', 'reviewed']);
    if (!OUTCOMES.includes(data.outcome as string) || typeof data.reviewed !== 'boolean') invalid();
  }
  return data;
}

export function validatePedagogicalEvent(value: unknown): PedagogicalEvent {
  const event = record(value);
  onlyKeys(event, ['version', 'id', 'learnerId', 'kind', 'problemId', 'attemptId', 'createdAt', 'skillIds', 'evidenceRefs', 'data']);
  if (event.version !== 1 || !validId(event.id) || !validId(event.learnerId) || !PEDAGOGICAL_EVENT_KINDS.includes(event.kind as PedagogicalEventKind) ||
    (event.problemId !== undefined && !validId(event.problemId)) || (event.attemptId !== undefined && !validId(event.attemptId)) || !validTimestamp(event.createdAt) ||
    (event.skillIds !== undefined && (!Array.isArray(event.skillIds) || event.skillIds.length > 8 || event.skillIds.some((id) => !validId(id)))) ||
    (!Array.isArray(event.evidenceRefs) || event.evidenceRefs.length === 0 || event.evidenceRefs.length > 8 || event.evidenceRefs.some((ref) => !validRef(ref)))) invalid();
  const kind = event.kind as PedagogicalEventKind;
  const needsProblem = kind !== 'lesson-opened';
  const needsAttempt = ['meaningful-edit-recorded', 'run-recorded', 'test-recorded', 'hint-requested', 'hint-viewed', 'reference-viewed', 'submission-recorded', 'transfer-recorded', 'review-recorded'].includes(kind);
  if ((needsProblem && !event.problemId) || (needsAttempt && (!event.problemId || !event.attemptId))) invalid();
  return { ...event, version: 1, kind, data: validateData(kind, event.data) } as PedagogicalEvent;
}

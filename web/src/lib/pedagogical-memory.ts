import type { LearningSignal } from './learner-memory';
import { parsePedagogicalEvent, type PedagogicalEvent } from './pedagogical-events';
import type { PracticeAttempt } from './practice';
import { buildSubmissionDiff } from './submission-diff';

export const PEDAGOGICAL_MEMORY_STORAGE_KEY = 'od-pedagogical-memory-v1';
export const MAX_PEDAGOGICAL_EVENTS = 500;
export type PedagogicalMemory = { version: 1; events: PedagogicalEvent[] };
export type PedagogicalEventDraft = Omit<PedagogicalEvent, 'version' | 'id' | 'learnerId' | 'createdAt'>;

export function emptyPedagogicalMemory(): PedagogicalMemory { return { version: 1, events: [] }; }

function asOutcome(value: unknown): 'passed' | 'failed' | 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable' {
  const allowed = ['passed', 'failed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'] as const;
  return allowed.includes(value as typeof allowed[number]) ? value as typeof allowed[number] : 'unavailable';
}

function sourceHash(source: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < source.length; index += 1) {
    first = Math.imul(first ^ source.charCodeAt(index), 0x01000193);
    second = Math.imul(second ^ source.charCodeAt(index), 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}

export function pedagogicalDraftsFromAttempt(attempt: PracticeAttempt, skillIds: string[]): PedagogicalEventDraft[] {
  const common = { problemId: attempt.problemId, attemptId: attempt.id, skillIds: skillIds.slice(0, 8) };
  const result = asOutcome(attempt.outcome === 'executed' ? 'passed' : attempt.outcome);
  if (attempt.mode === 'run') return [{ ...common, kind: 'run-recorded', evidenceRefs: [`attempt:${attempt.id}`, `run:${attempt.id}`], data: { outcome: result } }];
  return [
    { ...common, kind: 'test-recorded', evidenceRefs: [`attempt:${attempt.id}`, `test:${attempt.id}`], data: { outcome: result } },
    { ...common, kind: 'submission-recorded', evidenceRefs: [`attempt:${attempt.id}`, `run:${attempt.id}`], data: { outcome: result } },
  ];
}

export function pedagogicalEditDraft(before: string, after: string, problemId: string, attemptId: string, skillIds: string[]): PedagogicalEventDraft | null {
  if (before === after) return null;
  const diff = buildSubmissionDiff(before, after);
  const changedLines = diff.added + diff.removed;
  const changedRanges = diff.hunks.slice(0, 12).map((hunk) => ({
    startLine: Math.max(1, Math.min(hunk.oldStart, hunk.newStart)),
    endLine: Math.max(1, Math.max(hunk.oldStart, hunk.newStart) + Math.max(0, hunk.lines.length - 1)),
  }));
  if (!changedRanges.length) changedRanges.push({ startLine: 1, endLine: 1 });
  return {
    kind: 'meaningful-edit-recorded', problemId, attemptId, skillIds: skillIds.slice(0, 8),
    evidenceRefs: [`attempt:${attemptId}`, `diff:${attemptId}`],
    data: {
      beforeHash: sourceHash(before), afterHash: sourceHash(after), insertedLines: diff.added, deletedLines: diff.removed, changedRanges,
      pasteBand: changedLines === 0 ? 'none' : changedLines <= 5 ? 'small' : changedLines <= 20 ? 'medium' : 'large',
    },
  };
}

export function recordPedagogicalDraft(memory: PedagogicalMemory, learnerId: string, draft: PedagogicalEventDraft, now = new Date(), id = `ped-${now.getTime()}-${memory.events.length}`): PedagogicalMemory {
  try {
    const event = parsePedagogicalEvent({ ...draft, version: 1, id, learnerId, createdAt: now.toISOString() });
    if (memory.events.some((item) => item.id === event.id)) return memory;
    return { version: 1, events: [...memory.events, event].slice(-MAX_PEDAGOGICAL_EVENTS) };
  } catch { return memory; }
}

export function pedagogicalEventFromSignal(signal: LearningSignal, learnerId: string, now: Date, id: string): PedagogicalEvent | null {
  const common = { version: 1 as const, id, learnerId, createdAt: now.toISOString() };
  const skillIds = signal.data.skillIds;
  try {
    if (signal.kind === 'lesson-started' && signal.data.lessonId) return parsePedagogicalEvent({ ...common, kind: 'lesson-opened', evidenceRefs: [`lesson:${signal.data.lessonId}`], data: {} });
    if (signal.kind === 'lesson-checkpoint-passed' && signal.data.lessonId) return parsePedagogicalEvent({ ...common, kind: 'prediction-submitted', problemId: `lesson:${signal.data.lessonId}`, skillIds, evidenceRefs: [`lesson:${signal.data.lessonId}:checkpoint`], data: { correct: true, conceptId: signal.data.lessonId } });
    if (signal.kind === 'attempt-recorded' && signal.problemId && signal.attemptId) return parsePedagogicalEvent({ ...common, kind: 'submission-recorded', problemId: signal.problemId, attemptId: signal.attemptId, skillIds, evidenceRefs: [`attempt:${signal.attemptId}`, `run:${signal.attemptId}`], data: { outcome: asOutcome(signal.data.outcome) } });
    if ((signal.kind === 'hint-requested' || signal.kind === 'hint-received') && signal.problemId && signal.attemptId && signal.data.hintLevel) return parsePedagogicalEvent({ ...common, kind: signal.kind === 'hint-requested' ? 'hint-requested' : 'hint-viewed', problemId: signal.problemId, attemptId: signal.attemptId, skillIds, evidenceRefs: [`attempt:${signal.attemptId}`, `hint:${signal.attemptId}:${signal.data.hintLevel}`], data: { level: signal.data.hintLevel } });
    if (signal.kind === 'reference-unlocked' && signal.problemId && signal.attemptId) return parsePedagogicalEvent({ ...common, kind: 'reference-viewed', problemId: signal.problemId, attemptId: signal.attemptId, skillIds, evidenceRefs: [`attempt:${signal.attemptId}`, `reference:${signal.problemId}`], data: {} });
    if (signal.kind === 'lesson-transfer-passed' && signal.problemId && signal.attemptId) return parsePedagogicalEvent({ ...common, kind: 'transfer-recorded', problemId: signal.problemId, attemptId: signal.attemptId, skillIds, evidenceRefs: [`attempt:${signal.attemptId}`, `transfer:${signal.data.lessonId ?? signal.problemId}`], data: { outcome: 'passed', reviewed: true } });
  } catch {
    return null;
  }
  return null;
}

export function recordPedagogicalSignal(memory: PedagogicalMemory, learnerId: string, signal: LearningSignal, now = new Date(), id = `ped-${now.getTime()}-${memory.events.length}`): PedagogicalMemory {
  const event = pedagogicalEventFromSignal(signal, learnerId, now, id);
  if (!event || memory.events.some((item) => item.id === event.id)) return memory;
  if (event.kind === 'lesson-opened' && memory.events.some((item) => item.kind === 'lesson-opened'
    && item.learnerId === event.learnerId
    && item.evidenceRefs.some((reference) => event.evidenceRefs.includes(reference)))) return memory;
  return { version: 1, events: [...memory.events, event].slice(-MAX_PEDAGOGICAL_EVENTS) };
}

export function loadPedagogicalMemory(storage: Pick<Storage, 'getItem'>): PedagogicalMemory {
  try {
    return parsePedagogicalMemory(JSON.parse(storage.getItem(PEDAGOGICAL_MEMORY_STORAGE_KEY) ?? 'null'));
  } catch {
    return emptyPedagogicalMemory();
  }
}

export function parsePedagogicalMemory(value: unknown): PedagogicalMemory {
  const raw = value as { version?: unknown; events?: unknown } | null;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.events)) throw new Error('Invalid pedagogical memory');
  return { version: 1, events: raw.events.map(parsePedagogicalEvent).slice(-MAX_PEDAGOGICAL_EVENTS) };
}

export function savePedagogicalMemory(storage: Pick<Storage, 'setItem'>, memory: PedagogicalMemory): void {
  storage.setItem(PEDAGOGICAL_MEMORY_STORAGE_KEY, JSON.stringify(memory));
}

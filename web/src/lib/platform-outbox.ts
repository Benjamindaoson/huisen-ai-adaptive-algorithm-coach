import { PlatformApiError, type LearningStateKind, type PlatformClient } from './platform-client';
import { createImmutableAcknowledgementLedger } from './platform-acknowledgements';
import {
  LEARNING_DIAGNOSTIC_STEPS, LEARNING_EVENT_DATA_KEYS, LEARNING_EVENT_KINDS,
  LEARNING_PRACTICUM_PHASES, LEARNING_REFLECTION_TAGS, LEARNING_TRAINING_STAGES,
} from '../../../contracts/learning-event-contract';

export const PLATFORM_OUTBOX_STORAGE_KEY = 'od-platform-outbox-v1';
export const PLATFORM_OUTBOX_CAPACITY = 1_000;
export class PlatformOutboxCapacityError extends Error {
  readonly code = 'outbox-capacity-reached';
  readonly capacity: number;
  constructor(capacity = PLATFORM_OUTBOX_CAPACITY) {
    super(`Outbox capacity reached (${capacity})`);
    this.name = 'PlatformOutboxCapacityError';
    this.capacity = capacity;
  }
}
export type OutboxOperation = {
  id: string; learnerId: string; kind: 'profile' | 'event' | 'state' | 'attempt'; payload: Record<string, unknown>;
  stateKind?: LearningStateKind; expectedVersion?: number; createdAt: string; attempts?: number; lastError?: string;
};
type OutboxFile = { version: 1; operations: OutboxOperation[] };

function read(storage: Pick<Storage, 'getItem'>): OutboxOperation[] {
  try {
    const value = JSON.parse(storage.getItem(PLATFORM_OUTBOX_STORAGE_KEY) ?? 'null') as Partial<OutboxFile> | null;
    if (value?.version !== 1 || !Array.isArray(value.operations)) return [];
    return value.operations.filter((item): item is OutboxOperation => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.learnerId === 'string'));
  } catch { return []; }
}
function persist(storage: Pick<Storage, 'setItem'>, operations: OutboxOperation[]) { storage.setItem(PLATFORM_OUTBOX_STORAGE_KEY, JSON.stringify({ version: 1, operations } satisfies OutboxFile)); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message.slice(0, 300) : 'unknown-error'; }
function canonicalImmutablePayload(item: OutboxOperation): Record<string, unknown> {
  if (item.payload.learnerId !== item.learnerId) return item.payload;
  const { learnerId: _redundantOwner, ...payload } = item.payload;
  return payload;
}

export function createPlatformOutbox(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const acknowledgements = createImmutableAcknowledgementLedger(storage);
  return {
    list: () => read(storage),
    enqueue(operation: OutboxOperation) {
      const current = read(storage);
      const sameMutableStream = (item: OutboxOperation) => (operation.kind === 'profile' && item.kind === 'profile' && item.learnerId === operation.learnerId)
        || (operation.kind === 'state' && item.kind === 'state' && item.learnerId === operation.learnerId && item.stateKind === operation.stateKind);
      if (operation.kind === 'profile' || operation.kind === 'state') {
        const retained = current.filter((item) => !sameMutableStream(item));
        if (retained.length >= PLATFORM_OUTBOX_CAPACITY) throw new PlatformOutboxCapacityError();
        persist(storage, [...retained, { ...operation, attempts: 0, lastError: undefined }]);
        return;
      }
      const existing = current.find((item) => item.id === operation.id);
      if (existing) {
        const comparable = (item: OutboxOperation) => ({ id: item.id, learnerId: item.learnerId, kind: item.kind, payload: canonicalImmutablePayload(item), stateKind: item.stateKind, expectedVersion: item.expectedVersion });
        if (JSON.stringify(comparable(existing)) !== JSON.stringify(comparable(operation))) throw new Error('Outbox idempotency conflict');
        if (existing.payload.learnerId === existing.learnerId && operation.payload.learnerId === undefined) {
          persist(storage, current.map((item) => item.id === operation.id ? { ...operation, attempts: 0, lastError: undefined } : item));
        }
        return;
      }
      if (current.length >= PLATFORM_OUTBOX_CAPACITY) throw new PlatformOutboxCapacityError();
      persist(storage, [...current, { ...operation, attempts: 0 }]);
    },
    rebaseState(learnerId: string, kind: LearningStateKind, expectedVersion: number) {
      persist(storage, read(storage).map((item) => item.kind === 'state' && item.learnerId === learnerId && item.stateKind === kind ? { ...item, expectedVersion, attempts: 0, lastError: undefined } : item));
    },
    reconcileMigration(sourceLearnerId: string, validOperationIds: string[]) {
      const prefix = `migration:${sourceLearnerId}:`; const valid = new Set(validOperationIds);
      persist(storage, read(storage).filter((item) => !item.id.startsWith(prefix) || valid.has(item.id)));
    },
    async flush(client: PlatformClient) {
      let operations = read(storage); let sent = 0; const stateVersions: Partial<Record<LearningStateKind, number>> = {};
      const conflicts: Array<{ operationId: string; state: unknown }> = [];
      while (operations.length) {
        const operation = operations[0];
        try {
          if (operation.kind === 'profile') await client.putProfile(operation.learnerId, operation.payload);
          else if (operation.kind === 'event') await client.appendEvent(operation.learnerId, operation.payload);
          else if (operation.kind === 'attempt') await client.appendAttempt(operation.learnerId, operation.payload);
          else {
            if (!operation.stateKind || !Number.isInteger(operation.expectedVersion)) throw new Error('Invalid state outbox operation');
            const state = await client.putState(operation.learnerId, operation.stateKind, { expectedVersion: operation.expectedVersion!, payload: operation.payload, updatedAt: operation.createdAt });
            if (typeof state.version === 'number') stateVersions[operation.stateKind] = state.version;
          }
          if (operation.kind === 'event' || operation.kind === 'attempt') {
            await acknowledgements.acknowledge({ learnerId: operation.learnerId, kind: operation.kind, payload: operation.payload });
          }
          operations = operations.slice(1); persist(storage, operations); sent += 1;
        } catch (error) {
          if (operation.kind === 'state' && error instanceof PlatformApiError && error.code === 'version-conflict') {
            const detail = error.detail && typeof error.detail === 'object' ? error.detail as { state?: unknown } : {};
            conflicts.push({ operationId: operation.id, state: detail.state });
            operations = operations.slice(1); persist(storage, operations);
            continue;
          }
          operations[0] = { ...operation, attempts: (operation.attempts ?? 0) + 1, lastError: errorMessage(error) };
          persist(storage, operations);
          return { sent, remaining: operations.length, blockedBy: operation.id, error: operations[0].lastError, stateVersions, conflicts };
        }
      }
      return { sent, remaining: 0 as const, stateVersions, conflicts };
    },
  };
}

type LocalMigrationInput = {
  learnerId: string; targetLearnerId: string; profile: Record<string, unknown>; events: Array<Record<string, unknown>>;
  progress: Record<string, unknown>; practice: { version: number; drafts: Record<string, unknown>; attempts: Array<Record<string, unknown>> };
  exam: Record<string, unknown> | null;
};

export function serverCompatibleEvent(event: Record<string, unknown>): boolean {
  const validId = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,200}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value.toLowerCase());
  const kind = event.kind; const data = event.data;
  if (Object.keys(event).some((key) => !['id', 'learnerId', 'kind', 'problemId', 'attemptId', 'data', 'createdAt'].includes(key))) return false;
  if (!validId(event.id) || typeof kind !== 'string' || !LEARNING_EVENT_KINDS.includes(kind as (typeof LEARNING_EVENT_KINDS)[number]) || !event.createdAt || Number.isNaN(Date.parse(String(event.createdAt))) || !data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (event.problemId !== undefined && !validId(event.problemId) || event.attemptId !== undefined && !validId(event.attemptId)) return false;
  const values = data as Record<string, unknown>;
  if (Object.keys(values).some((key) => !LEARNING_EVENT_DATA_KEYS.includes(key as (typeof LEARNING_EVENT_DATA_KEYS)[number]))) return false;
  if (values.hintLevel !== undefined && ![1, 2, 3, 4].includes(Number(values.hintLevel))) return false;
  if (values.outcome !== undefined && (typeof values.outcome !== 'string' || values.outcome.length > 100) || values.assisted !== undefined && typeof values.assisted !== 'boolean' || values.reason !== undefined && (typeof values.reason !== 'string' || values.reason.length > 500)) return false;
  if (values.skillIds !== undefined && (!Array.isArray(values.skillIds) || values.skillIds.length > 8 || values.skillIds.some((id) => typeof id !== 'string' || id.length > 100))) return false;
  if (values.examDate !== undefined && values.examDate !== '' && (typeof values.examDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(values.examDate)) || values.correct !== undefined && typeof values.correct !== 'boolean') return false;
  if (values.recommendationId !== undefined && !validId(values.recommendationId)) return false;
  if (values.curriculumVersion !== undefined && (typeof values.curriculumVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(values.curriculumVersion))) return false;
  if (values.diagnosticStep !== undefined && !LEARNING_DIAGNOSTIC_STEPS.includes(String(values.diagnosticStep) as (typeof LEARNING_DIAGNOSTIC_STEPS)[number])) return false;
  const lesson = kind.startsWith('lesson-'); const training = kind.startsWith('training-'); const firstMinute = kind.startsWith('first-minute-'); const bridgeDiagnostic = kind.startsWith('bridge-diagnostic-');
  const needsProblem = kind !== 'goal-updated' && !lesson && !training && !firstMinute && !bridgeDiagnostic;
  if (needsProblem && !validId(event.problemId) || ['attempt-recorded', 'hint-requested', 'hint-received'].includes(kind) && !validId(event.attemptId)) return false;
  if (kind === 'attempt-recorded' && !['executed', 'passed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable'].includes(String(values.outcome))) return false;
  if (['hint-requested', 'hint-received'].includes(kind) && ![1, 2, 3, 4].includes(Number(values.hintLevel))) return false;
  if (kind === 'goal-updated' && (!['od-exam', 'interview', 'foundation'].includes(String(values.target)) || !Number.isInteger(values.dailyMinutes) || !['java', 'python', 'javascript', 'cpp'].includes(String(values.preferredLanguage)))) return false;
  if (lesson && !validId(values.lessonId)) return false;
  if (kind === 'lesson-started' && values.stage !== 'explain' || kind === 'lesson-checkpoint-passed' && (values.stage !== 'predict' || values.correct !== true) || kind === 'lesson-completed' && (values.stage !== 'complete' || values.correct !== true) || kind === 'lesson-transfer-started' && values.stage !== 'transfer') return false;
  if (kind === 'lesson-transfer-passed' && (!validId(event.problemId) || !validId(event.attemptId) || values.stage !== 'transfer' || values.correct !== true || values.assisted !== false)) return false;
  if (kind === 'lesson-handoff-feedback' && (!validId(values.recommendationId) || !['helpful', 'unclear'].includes(String(values.choiceId)))) return false;
  if (training && !validId(values.lessonId)) return false;
  if (kind === 'training-session-started' && values.stage !== 'explain') return false;
  if (kind === 'training-stage-completed' && (!LEARNING_TRAINING_STAGES.includes(String(values.stage) as (typeof LEARNING_TRAINING_STAGES)[number]) || values.correct !== true)) return false;
  if (kind === 'training-session-completed' && values.stage !== 'transfer') return false;
  if (firstMinute && !validId(values.lessonId)) return false;
  if (kind === 'bridge-diagnostic-started' && !values.curriculumVersion) return false;
  if (kind === 'bridge-diagnostic-step-recorded' && (!values.curriculumVersion || !LEARNING_DIAGNOSTIC_STEPS.includes(String(values.diagnosticStep) as (typeof LEARNING_DIAGNOSTIC_STEPS)[number]) || typeof values.correct !== 'boolean')) return false;
  if (kind === 'mentor-revision-verified' && (!validId(event.problemId) || values.outcome !== 'passed')) return false;
  if (kind.startsWith('practicum-') && !validId(event.problemId)) return false;
  if (kind === 'practicum-started' && values.phase !== 'understanding') return false;
  if (kind === 'practicum-phase-completed' && (!['diagnosis', 'planning'].includes(String(values.phase)) || !validId(values.choiceId))) return false;
  if (kind === 'practicum-hint-used' && (!LEARNING_PRACTICUM_PHASES.includes(String(values.phase) as (typeof LEARNING_PRACTICUM_PHASES)[number]) || ![1, 2, 3, 4].includes(Number(values.hintLevel)))) return false;
  if (kind === 'practicum-tested' && (values.phase !== 'verification' || typeof values.passed !== 'boolean' || !Number.isInteger(values.passedCount) || !Number.isInteger(values.totalCount) || Number(values.passedCount) > Number(values.totalCount))) return false;
  if (kind === 'practicum-reflected' && (values.phase !== 'reflection' || !LEARNING_REFLECTION_TAGS.includes(String(values.reflectionTag) as (typeof LEARNING_REFLECTION_TAGS)[number]))) return false;
  if (kind === 'practicum-completed' && (values.phase !== 'completed' || values.passed !== true)) return false;
  return true;
}

export async function planLocalMigration(input: LocalMigrationInput, hashSource: (source: string) => Promise<string>) {
  const operations: OutboxOperation[] = []; const quarantinedEvents: Array<{ id: string; reason: string }> = []; const now = new Date().toISOString();
  const { learnerId: _source, ...profile } = input.profile;
  operations.push({ id: `migration:${input.learnerId}:profile`, learnerId: input.targetLearnerId, kind: 'profile', payload: profile, createdAt: String(profile.updatedAt ?? now) });
  for (const event of input.events) {
    if (!serverCompatibleEvent(event)) { quarantinedEvents.push({ id: String(event.id ?? 'unknown'), reason: 'legacy-event-does-not-match-server-contract' }); continue; }
    const { learnerId: _owner, ...payload } = event;
    operations.push({ id: `migration:${input.learnerId}:event:${String(event.id)}`, learnerId: input.targetLearnerId, kind: 'event', payload, createdAt: String(event.createdAt ?? now) });
  }
  operations.push({ id: `migration:${input.learnerId}:state:progress`, learnerId: input.targetLearnerId, kind: 'state', stateKind: 'progress', expectedVersion: 0, payload: input.progress, createdAt: now });
  operations.push({ id: `migration:${input.learnerId}:state:practice`, learnerId: input.targetLearnerId, kind: 'state', stateKind: 'practice', expectedVersion: 0, payload: input.practice, createdAt: now });
  if (input.exam) operations.push({ id: `migration:${input.learnerId}:state:exam`, learnerId: input.targetLearnerId, kind: 'state', stateKind: 'exam', expectedVersion: 0, payload: input.exam, createdAt: now });
  for (const local of input.practice.attempts) {
    const sourceCode = typeof local.codeSnapshot === 'string' ? local.codeSnapshot : '';
    operations.push({
      id: `migration:${input.learnerId}:attempt:${String(local.id)}`, learnerId: input.targetLearnerId, kind: 'attempt', createdAt: String(local.createdAt ?? now),
      payload: { id: local.id, problemId: local.problemId, language: local.language, outcome: local.outcome, assisted: false, sourceHash: await hashSource(sourceCode), createdAt: local.createdAt },
    });
  }
  return {
    version: 1 as const, sourceLearnerId: input.learnerId, targetLearnerId: input.targetLearnerId, generatedAt: now,
    counts: { profile: 1, events: input.events.length - quarantinedEvents.length, quarantinedEvents: quarantinedEvents.length, states: 2 + (input.exam ? 1 : 0), attempts: input.practice.attempts.length }, operations, quarantinedEvents,
  };
}

export async function sha256Source(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

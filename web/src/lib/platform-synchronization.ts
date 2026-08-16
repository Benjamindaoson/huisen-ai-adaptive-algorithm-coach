import type { ExamSession } from './exam';
import type { LearnerMemory } from './learner-memory';
import type { PracticeState } from './practice';
import type { ProgressState } from './progress';
import type { LearningStateKind, PlatformClient } from './platform-client';
import { createImmutableAcknowledgementLedger } from './platform-acknowledgements';
import { PlatformOutboxCapacityError, createPlatformOutbox, sha256Source, type OutboxOperation } from './platform-outbox';
import { projectSyncIssue, type SyncIssue } from './sync-recovery';

export type PlatformSyncSnapshot = {
  learnerId: string;
  memory: LearnerMemory;
  progress: ProgressState;
  practice: PracticeState;
  exam: ExamSession | null;
  expectedStateVersions: Partial<Record<LearningStateKind, number>>;
};

type SyncConflict = { operationId: string; state: unknown };
export type PlatformSyncExecutionResult = {
  stateVersions: Partial<Record<LearningStateKind, number>>;
  conflicts: SyncConflict[];
} & ({ status: 'synced' } | { status: 'pending'; issue: SyncIssue });

type ExecutionDependencies = {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  client: PlatformClient;
  hashSource?: (source: string) => Promise<string>;
  now?: () => Date;
};

export async function executePlatformSync(snapshot: PlatformSyncSnapshot, dependencies: ExecutionDependencies): Promise<PlatformSyncExecutionResult> {
  const outbox = createPlatformOutbox(dependencies.storage);
  const acknowledgements = createImmutableAcknowledgementLedger(dependencies.storage);
  const stateVersions: Partial<Record<LearningStateKind, number>> = {};
  const conflicts: SyncConflict[] = [];
  const pendingResult = (error?: unknown): PlatformSyncExecutionResult => {
    const pending = outbox.list();
    return {
      status: 'pending', stateVersions, conflicts,
      issue: projectSyncIssue({ remaining: pending.length, blockedKind: pending[0]?.kind, error }),
    };
  };
  const flushQueued = async (): Promise<PlatformSyncExecutionResult | null> => {
    const result = await outbox.flush(dependencies.client);
    Object.assign(stateVersions, result.stateVersions);
    conflicts.push(...result.conflicts);
    return result.remaining ? pendingResult(result.error) : null;
  };
  const enqueueWithDrain = async (operation: OutboxOperation): Promise<PlatformSyncExecutionResult | null> => {
    try {
      outbox.enqueue(operation);
      return null;
    } catch (error) {
      if (!(error instanceof PlatformOutboxCapacityError)) throw error;
      const pending = await flushQueued();
      if (pending) return pending;
      outbox.enqueue(operation);
      return null;
    }
  };
  try {
    const now = (dependencies.now?.() ?? new Date()).toISOString();
    const { learnerId: _profileOwner, ...profile } = snapshot.memory.profile;
    let pending = await enqueueWithDrain({ id: `sync-profile-${snapshot.memory.profile.updatedAt}`, learnerId: snapshot.learnerId, kind: 'profile', payload: profile, createdAt: snapshot.memory.profile.updatedAt });
    if (pending) return pending;

    const queuedImmutableIds = new Set(outbox.list()
      .filter((operation) => operation.kind === 'event' || operation.kind === 'attempt')
      .map((operation) => operation.id));
    for (const event of snapshot.memory.events) {
      const { learnerId: _eventOwner, ...payload } = event;
      const operationId = `sync-event-${event.id}`;
      if (queuedImmutableIds.has(operationId)) continue;
      if (await acknowledgements.has({ learnerId: snapshot.learnerId, kind: 'event', payload: payload as Record<string, unknown> })) continue;
      pending = await enqueueWithDrain({ id: operationId, learnerId: snapshot.learnerId, kind: 'event', payload: payload as Record<string, unknown>, createdAt: event.createdAt });
      if (pending) return pending;
      queuedImmutableIds.add(operationId);
    }

    const states: Array<[LearningStateKind, Record<string, unknown>, string]> = [
      ['progress', snapshot.progress as unknown as Record<string, unknown>, now],
      ['practice', snapshot.practice as unknown as Record<string, unknown>, now],
      ...(snapshot.exam ? [['exam', snapshot.exam as unknown as Record<string, unknown>, new Date(snapshot.exam.startedAt).toISOString()] as [LearningStateKind, Record<string, unknown>, string]] : []),
    ];
    for (const [kind, payload, updatedAt] of states) {
      pending = await enqueueWithDrain({
        id: `sync-state-${kind}-${updatedAt}`, learnerId: snapshot.learnerId, kind: 'state', stateKind: kind,
        expectedVersion: snapshot.expectedStateVersions[kind] ?? 0, payload, createdAt: updatedAt,
      });
      if (pending) return pending;
    }

    for (const attempt of snapshot.practice.attempts) {
      const operationId = `sync-attempt-${attempt.id}`;
      if (queuedImmutableIds.has(operationId)) continue;
      const payload = {
        id: attempt.id, problemId: attempt.problemId, language: attempt.language, outcome: attempt.outcome, assisted: false,
        sourceHash: await (dependencies.hashSource ?? sha256Source)(attempt.codeSnapshot), createdAt: attempt.createdAt,
      };
      if (await acknowledgements.has({ learnerId: snapshot.learnerId, kind: 'attempt', payload })) continue;
      pending = await enqueueWithDrain({
        id: operationId, learnerId: snapshot.learnerId, kind: 'attempt', createdAt: attempt.createdAt,
        payload,
      });
      if (pending) return pending;
      queuedImmutableIds.add(operationId);
    }

    pending = await flushQueued();
    if (pending) return pending;
    return { status: 'synced', stateVersions, conflicts };
  } catch (error) {
    return pendingResult(error);
  }
}

export function createLatestOnlyRunner<Input, Result>(execute: (input: Input, previous: Result | undefined) => Promise<Result>) {
  let active: Promise<Result> | null = null;
  let latest!: Input;
  let hasLatest = false;

  async function drain(): Promise<Result> {
    let result!: Result;
    while (hasLatest) {
      const input = latest;
      hasLatest = false;
      result = await execute(input, result);
    }
    return result;
  }

  return {
    run(input: Input): Promise<Result> {
      latest = input;
      hasLatest = true;
      if (!active) active = drain().finally(() => { active = null; });
      return active;
    },
  };
}

export function createPlatformSyncOrchestrator(dependencies: ExecutionDependencies) {
  return createLatestOnlyRunner(async (snapshot: PlatformSyncSnapshot, previous: PlatformSyncExecutionResult | undefined) => {
    const priorVersions = previous?.stateVersions ?? {};
    const result = await executePlatformSync({
      ...snapshot,
      expectedStateVersions: { ...snapshot.expectedStateVersions, ...priorVersions },
    }, dependencies);
    return {
      ...result,
      stateVersions: { ...priorVersions, ...result.stateVersions },
      conflicts: [...(previous?.conflicts ?? []), ...result.conflicts],
    };
  });
}

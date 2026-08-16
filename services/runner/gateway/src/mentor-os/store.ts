import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { MentorLifecycleType, MentorRouteKind, MentorStopReason } from './contracts.js';

export type MentorOSEventMetadata = {
  tool?: string; argumentsHash?: string; resultHash?: string;
  provider?: string; model?: string; inputTokens?: number; outputTokens?: number;
  latencyMs?: number; estimatedCostMicros?: number; policyDecision?: string; approvalId?: string;
};
export type MentorOSEvent = { id: string; sequence: number; type: MentorLifecycleType; detail: string; evidenceRefs: string[]; at: string; stopReason?: MentorStopReason; metadata?: MentorOSEventMetadata };
export type MentorOSRun = { version: 1; id: string; learnerId: string; goal: string; route: { kind: MentorRouteKind; ref: string }; status: 'active' | 'paused' | 'complete'; sequence: number; events: MentorOSEvent[]; checkpoint: { sequence: number; stopReason?: MentorStopReason; nextAction: string } };
export type MentorOSStart = { learnerId: string; goal: string; route: { kind: MentorRouteKind; ref: string }; idempotencyKey: string };
export type MentorOSCommit = { idempotencyKey: string; expectedSequence: number; type: MentorLifecycleType; detail: string; evidenceRefs: string[]; stopReason?: MentorStopReason; metadata?: MentorOSEventMetadata };
export type MentorOSOperationClaim = { status: 'claimed' } | { status: 'pending' } | { status: 'completed'; value: unknown };
export type MentorOSStore = {
  mode: 'memory' | 'file-local' | 'postgres';
  start(input: MentorOSStart): Promise<MentorOSRun>;
  commit(runId: string, input: MentorOSCommit): Promise<{ run: MentorOSRun; event: MentorOSEvent }>;
  get(runId: string): Promise<MentorOSRun | null>;
  eventsAfter(runId: string, cursor: number): Promise<MentorOSEvent[]>;
  claimOperation(runId: string, idempotencyKey: string): Promise<MentorOSOperationClaim>;
  completeOperation(runId: string, idempotencyKey: string, value: unknown): Promise<void>;
  abandonOperation(runId: string, idempotencyKey: string): Promise<void>;
};

export function createMentorOSStore(options: { filePath?: string } = {}): MentorOSStore {
  const runs = new Map<string, MentorOSRun>();
  const startKeys = new Map<string, string>();
  const commandResults = new Map<string, { run: MentorOSRun; event: MentorOSEvent }>();
  const operations = new Map<string, { status: 'pending'; claimedAt: string } | { status: 'completed'; value: unknown }>();
  if (options.filePath && existsSync(options.filePath)) {
    const saved = JSON.parse(readFileSync(options.filePath, 'utf8')) as { runs?: MentorOSRun[]; startKeys?: Array<[string, string]>; commandResults?: Array<[string, { run: MentorOSRun; event: MentorOSEvent }]>; operations?: Array<[string, { status: 'pending'; claimedAt: string } | { status: 'completed'; value: unknown }]> };
    for (const run of saved.runs ?? []) runs.set(run.id, run);
    for (const item of saved.startKeys ?? []) startKeys.set(...item);
    for (const item of saved.commandResults ?? []) commandResults.set(...item);
    for (const item of saved.operations ?? []) operations.set(...item);
  }
  const persist = () => { if (options.filePath) writeFileSync(options.filePath, JSON.stringify({ runs: [...runs.values()], startKeys: [...startKeys], commandResults: [...commandResults], operations: [...operations] }), 'utf8'); };
  return {
    mode: options.filePath ? 'file-local' : 'memory',
    async start(input: MentorOSStart): Promise<MentorOSRun> {
      const existing = startKeys.get(`${input.learnerId}:${input.idempotencyKey}`);
      if (existing) return structuredClone(runs.get(existing)!);
      const id = `mentor-os-${randomUUID()}`;
      const event: MentorOSEvent = { id: `${id}:1`, sequence: 1, type: 'run-started', detail: input.goal, evidenceRefs: [`goal:${id}`], at: new Date().toISOString() };
      const run: MentorOSRun = { version: 1, id, learnerId: input.learnerId, goal: input.goal, route: input.route, status: 'active', sequence: 1, events: [event], checkpoint: { sequence: 1, nextAction: '编译当前学习上下文' } };
      runs.set(id, run); startKeys.set(`${input.learnerId}:${input.idempotencyKey}`, id); persist(); return structuredClone(run);
    },
    async commit(runId: string, input: MentorOSCommit) {
      const key = `${runId}:${input.idempotencyKey}`;
      const previous = commandResults.get(key);
      if (previous) return structuredClone(previous);
      const run = runs.get(runId);
      if (!run) throw new Error('Mentor OS run not found');
      if (input.expectedSequence !== run.sequence) throw new Error(`Mentor OS sequence conflict: expected ${run.sequence}`);
      const sequence = run.sequence + 1;
      const event: MentorOSEvent = { id: `${runId}:${sequence}`, sequence, type: input.type, detail: input.detail.slice(0, 2000), evidenceRefs: [...new Set(input.evidenceRefs)].slice(0, 20), at: new Date().toISOString(), ...(input.stopReason ? { stopReason: input.stopReason } : {}), ...(input.metadata ? { metadata: structuredClone(input.metadata) } : {}) };
      const stopped = input.type === 'stopped' || input.type === 'policy-denied';
      const next: MentorOSRun = { ...run, sequence, status: stopped ? (input.stopReason === 'completed' ? 'complete' : 'paused') : 'active', events: [...run.events, event], checkpoint: { sequence, ...(input.stopReason ? { stopReason: input.stopReason } : {}), nextAction: input.detail } };
      runs.set(runId, next); const result = { run: structuredClone(next), event: structuredClone(event) }; commandResults.set(key, result); persist(); return structuredClone(result);
    },
    async get(runId: string) { const run = runs.get(runId); return run ? structuredClone(run) : null; },
    async eventsAfter(runId: string, cursor: number) { return (runs.get(runId)?.events ?? []).filter((event) => event.sequence > cursor).map((event) => structuredClone(event)); },
    async claimOperation(runId: string, idempotencyKey: string) {
      if (!runs.has(runId)) throw new Error('Mentor OS run not found');
      const key = `${runId}:${idempotencyKey}`;
      const existing = operations.get(key);
      if (existing?.status === 'completed') return { status: 'completed' as const, value: structuredClone(existing.value) };
      if (existing?.status === 'pending' && Date.now() - new Date(existing.claimedAt).getTime() < 120_000) return { status: 'pending' as const };
      operations.set(key, { status: 'pending', claimedAt: new Date().toISOString() }); persist();
      return { status: 'claimed' as const };
    },
    async completeOperation(runId: string, idempotencyKey: string, value: unknown) {
      operations.set(`${runId}:${idempotencyKey}`, { status: 'completed', value: structuredClone(value) }); persist();
    },
    async abandonOperation(runId: string, idempotencyKey: string) {
      const key = `${runId}:${idempotencyKey}`;
      if (operations.get(key)?.status === 'pending') { operations.delete(key); persist(); }
    },
  };
}

import { newDb } from 'pg-mem';
import { describe, expect, it, vi } from 'vitest';
import { createDurableSubmissionService } from './durable-submission-service.js';
import { createPostgresSubmissionStore } from './postgres-submission-store.js';

function memoryPool() { const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); return new adapter.Pool(); }
const pack = {
  id: 'pack-1', problemId: 'od-1', problemVersionId: 'od-1@sha256:abc', contentHash: 'a'.repeat(64),
  tests: [{ stdin: 'SECRET-A', expectedOutput: 'ok' }, { stdin: 'SECRET-B', expectedOutput: 'expected' }],
};

describe('durable submission platform', () => {
  it('creates one immutable submission for an idempotency key and rejects a conflicting replay', async () => {
    const pool = memoryPool();
    const store = createPostgresSubmissionStore({ pool, schema: 'judging_create' });
    let idSequence = 0;
    const service = createDurableSubmissionService({ store, resolvePack: async () => pack, execute: vi.fn(), createId: () => `submission-${++idSequence}`, now: () => 1_000 });
    const request = { learnerId: 'learner-1', problemVersionId: pack.problemVersionId, language: 'python' as const, sourceCode: 'print("ok")', idempotencyKey: 'submit-key-1' };

    const first = await service.submit(request);
    const replay = await service.submit(request);
    expect(first).toMatchObject({ id: 'submission-1', status: 'queued', problemId: 'od-1', problemVersionId: pack.problemVersionId });
    expect(replay).toEqual(first);
    expect(JSON.stringify(first)).not.toContain('print');
    expect(JSON.stringify(first)).not.toContain('SECRET');
    await expect(service.submit({ ...request, sourceCode: 'print("different")' })).rejects.toThrow('idempotency');
    await pool.end();
  });

  it('reconciles queued work after a process restart and records one safe aggregate verdict', async () => {
    const pool = memoryPool();
    const firstStore = createPostgresSubmissionStore({ pool, schema: 'judging_restart' });
    const first = createDurableSubmissionService({ store: firstStore, resolvePack: async () => pack, execute: vi.fn(), createId: () => 'submission-restart', now: () => 1_000, autoDispatch: false });
    await first.submit({ learnerId: 'learner-1', problemVersionId: pack.problemVersionId, language: 'python', sourceCode: 'print("ok")', idempotencyKey: 'restart-key' });

    const execute = vi.fn().mockResolvedValueOnce({ kind: 'success', stdout: 'ok\n', stderr: '', timeMs: 4 }).mockResolvedValueOnce({ kind: 'success', stdout: 'bad', stderr: '', timeMs: 6 });
    const restarted = createDurableSubmissionService({ store: createPostgresSubmissionStore({ pool, schema: 'judging_restart' }), resolvePack: async () => pack, execute, now: () => 2_000, costMicrosPerSecond: 1_000 });
    expect(await restarted.reconcile()).toBe(1);
    await restarted.settle('submission-restart');
    const result = await restarted.get('submission-restart', 'learner-1');
    expect(result).toMatchObject({ status: 'failed', passedCount: 1, totalCount: 2, timeMs: 10, completedAt: 2_000 });
    expect(execute).toHaveBeenCalledTimes(2);
    expect((await restarted.history('submission-restart')).filter((event) => event.toStatus === 'failed')).toHaveLength(1);
    const attempts=await restarted.attempts('submission-restart');
    expect(attempts).toHaveLength(2);expect(attempts.map((item)=>item.safeVerdict)).toEqual([{kind:'success',matched:true},{kind:'success',matched:false}]);
    expect(JSON.stringify(attempts)).not.toContain('SECRET');expect(JSON.stringify(attempts)).not.toContain('expected');
    expect(await restarted.metrics()).toMatchObject({ executionTimeMs: 10, estimatedCostMicros: 10 });
    await pool.end();
  });

  it('cancels queued work without dispatching source code', async () => {
    const pool = memoryPool(); const execute = vi.fn();
    const service = createDurableSubmissionService({ store: createPostgresSubmissionStore({ pool, schema: 'judging_cancel' }), resolvePack: async () => pack, execute, createId: () => 'submission-cancel', autoDispatch: false });
    await service.submit({ learnerId: 'learner-1', problemVersionId: pack.problemVersionId, language: 'python', sourceCode: 'while True: pass', idempotencyKey: 'cancel-key' });
    await expect(service.cancel('submission-cancel', 'learner-1')).resolves.toMatchObject({ status: 'cancelled' });
    expect(await service.reconcile()).toBe(0);
    expect(execute).not.toHaveBeenCalled();
    await pool.end();
  });

  it('reports queue, verdict and runtime telemetry without source or hidden cases',async()=>{
    const pool=memoryPool();const service=createDurableSubmissionService({store:createPostgresSubmissionStore({pool,schema:'judging_metrics'}),resolvePack:async()=>pack,execute:vi.fn(),createId:()=> 'metric-submission',now:()=>5_000,autoDispatch:false});
    await service.submit({learnerId:'learner-1',problemVersionId:pack.problemVersionId,language:'python',sourceCode:'TOP SECRET SOURCE',idempotencyKey:'metric-key'});
    const metrics=await service.metrics();expect(metrics).toMatchObject({total:1,queued:1,running:0,oldestQueueAgeMs:0});expect(JSON.stringify(metrics)).not.toContain('TOP SECRET');expect(JSON.stringify(metrics)).not.toContain('SECRET-A');await pool.end();
  });

  it('renews the worker lease before every hidden execution so reconciliation cannot double-dispatch long packs', async () => {
    const pool = memoryPool();
    let clock = 1_000;
    const store = createPostgresSubmissionStore({ pool, schema: 'judging_lease' });
    const execute = vi.fn().mockImplementation(async () => {
      clock += 20_000;
      expect(await store.recoverable(clock)).toEqual([]);
      return { kind: 'success', stdout: 'ok', stderr: '', timeMs: 20_000 } as const;
    });
    const service = createDurableSubmissionService({ store, resolvePack: async () => pack, execute, createId: () => 'lease-submission', now: () => clock });
    await service.submit({ learnerId: 'learner-1', problemVersionId: pack.problemVersionId, language: 'python', sourceCode: 'print("ok")', idempotencyKey: 'lease-key' });
    await service.settle('lease-submission');
    expect(await service.get('lease-submission', 'learner-1')).toMatchObject({ status: 'failed', passedCount: 1 });
    expect((await service.history('lease-submission')).filter((item) => item.detail.leaseRenewed === true)).toHaveLength(2);
    await pool.end();
  });
});

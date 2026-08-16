import { newDb } from 'pg-mem';
import { describe, expect, it } from 'vitest';
import { createPostgresSubmissionStore } from './postgres-submission-store.js';

function memoryPool() { const memory = newDb({ noAstCoverageCheck: true }); const adapter = memory.adapters.createPg(); return new adapter.Pool(); }

describe('PostgreSQL judging repositories', () => {
  it('persists immutable versioned judge-pack metadata without hidden case bodies', async () => {
    const pool = memoryPool(); const store = createPostgresSubmissionStore({ pool, schema: 'judging_pack_repo' });
    const pack = {
      id: 'pack-1', problemId: 'od-1', problemVersionId: 'od-1@v1', contentHash: 'a'.repeat(64), manifestHash: 'b'.repeat(64),
      trustLevel: 'gold', reviewedAt: 1_000, reviewerReceipt: { receiptHash: 'c'.repeat(64) }, manifest: { version: 1, hiddenCases: [{ inputHash: 'd'.repeat(64), expectedHash: 'e'.repeat(64) }] },
    };
    expect(await store.putJudgePack(pack)).toEqual({ ...pack, created: true });
    expect(await store.putJudgePack(pack)).toEqual({ ...pack, created: false });
    await expect(store.putJudgePack({ ...pack, manifestHash: 'f'.repeat(64) })).rejects.toThrow('Judge pack version conflict');
    expect(await store.getJudgePack('od-1@v1')).toEqual(pack);
    expect(JSON.stringify(await store.getJudgePack('od-1@v1'))).not.toContain('stdin');
    await pool.end();
  });

  it('records immutable execution artifact metadata without embedding object contents', async () => {
    const pool = memoryPool(); const store = createPostgresSubmissionStore({ pool, schema: 'judging_artifact_repo' });
    const submission = { id: 'submission-1', learnerId: 'learner-1', idempotencyKey: 'key-1', requestHash: 'a'.repeat(64), problemId: 'od-1', problemVersionId: 'od-1@v1', contentHash: 'b'.repeat(64), language: 'python' as const, sourceCode: 'print(1)', sourceHash: 'c'.repeat(64), submittedAt: 1_000, totalCount: 1 };
    await store.create(submission);
    const artifact = { id: 'artifact-1', submissionId: submission.id, kind: 'judge0-result', objectKey: 'judging/submission-1/result.json', sha256: 'd'.repeat(64), sizeBytes: 128, createdAt: 2_000 };
    expect(await store.putExecutionArtifact(artifact)).toEqual({ ...artifact, created: true });
    expect(await store.putExecutionArtifact(artifact)).toEqual({ ...artifact, created: false });
    await expect(store.putExecutionArtifact({ ...artifact, sha256: 'e'.repeat(64) })).rejects.toThrow('Execution artifact conflict');
    expect(await store.listExecutionArtifacts(submission.id)).toEqual([artifact]);
    expect(JSON.stringify(await store.listExecutionArtifacts(submission.id))).not.toContain('print(1)');
    await pool.end();
  });
});

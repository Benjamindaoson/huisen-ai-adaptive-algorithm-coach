import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  applyTeacherAdjudications,
  buildTeacherReviewQueue,
  mergeMentorPredictions,
  validateTeacherAdjudicationManifest,
} from './mentor-adjudication.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function pendingCase(overrides = {}) {
  const sourceCode = overrides.sourceCode ?? 'print(1)';
  return {
    id: overrides.id ?? 'public-1', language: overrides.language ?? 'python', learnerBand: 'unknown',
    attempt: { id: 'attempt-1', sourceCode, sourceHash: sha256(sourceCode) },
    execution: { verdict: 'wrong-answer', refs: overrides.refs ?? ['metadata:subset.csv:2'] },
    provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/dataset', license: 'CDLA-Permissive-2.0' },
    adjudication: { status: 'pending' }, prohibitedFragments: [],
  };
}

function teacherRecord(caseItem, overrides = {}) {
  return {
    caseId: caseItem.id,
    sourceHash: caseItem.attempt.sourceHash,
    reviewer: { id: 'teacher-001', role: 'teacher', attested: true },
    completedAt: '2026-08-12T08:00:00.000Z',
    learnerBand: 'beginner',
    reviewedEvidenceRefs: ['judge:failed-case:1'],
    expected: { errorFamily: 'output', misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output' },
    prohibitedFragments: ['print(input())'],
    ...overrides,
  };
}

describe('teacher Mentor adjudication', () => {
  it('rejects model impersonation, stale source bindings, and records without reviewed evidence', () => {
    const item = pendingCase();
    expect(() => validateTeacherAdjudicationManifest({ version: 1, records: [teacherRecord(item, { reviewer: { id: 'deepseek', role: 'model', attested: true } })] }))
      .toThrow(/teacher role/i);
    expect(() => validateTeacherAdjudicationManifest({ version: 1, records: [teacherRecord(item, { sourceHash: 'a'.repeat(64) })] }))
      .not.toThrow();
    expect(() => applyTeacherAdjudications({ version: 1, cases: [item] }, { version: 1, records: [teacherRecord(item, { sourceHash: 'a'.repeat(64) })] }))
      .toThrow(/source hash/i);
    expect(() => validateTeacherAdjudicationManifest({ version: 1, records: [teacherRecord(item, { reviewedEvidenceRefs: [] })] }))
      .toThrow(/reviewed evidence/i);
  });

  it('promotes only a hash-bound teacher-reviewed case and preserves the pending source artifact', () => {
    const item = pendingCase({ refs: ['judge:failed-case:1'] });
    const source = { version: 1, cases: [item] };
    const applied = applyTeacherAdjudications(source, { version: 1, records: [teacherRecord(item)] });

    expect(applied.cases[0]).toMatchObject({
      learnerBand: 'beginner',
      adjudication: { status: 'teacher-adjudicated', reviewerId: 'teacher-001', completedAt: '2026-08-12T08:00:00.000Z' },
      expected: { errorFamily: 'output', misconception: 'hardcoded-output' },
    });
    expect(source.cases[0].adjudication.status).toBe('pending');
  });

  it('marks metadata-only submissions evidence-incomplete and reports coverage gaps', () => {
    const incomplete = pendingCase();
    const ready = pendingCase({ id: 'public-2', language: 'java', refs: ['compiler:stderr:1'] });
    const queue = buildTeacherReviewQueue({ version: 1, cases: [incomplete, ready] }, {
      languages: ['javascript', 'python', 'java', 'cpp'], learnerBands: ['beginner', 'intermediate', 'advanced'], verdicts: ['wrong-answer'],
    });

    expect(queue.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ caseId: 'public-1', readiness: 'evidence-incomplete' }),
      expect.objectContaining({ caseId: 'public-2', readiness: 'ready' }),
    ]));
    expect(queue.coverage.missingLanguages).toContain('javascript');
    expect(queue.coverage.missingLearnerBands).toEqual(['beginner', 'intermediate', 'advanced']);
  });

  it('merges independently produced predictions by case id and rejects unknown cases', () => {
    const item = pendingCase();
    const seed = [{ caseId: 'seed-1', misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary', hint: 'Trace.', conclusion: { confidence: 'low', evidenceRefs: [] } }];
    const candidate = { caseId: item.id, misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output', hint: 'Predict the output.', conclusion: { confidence: 'medium', evidenceRefs: ['judge:failed-case:1'] } };

    expect(mergeMentorPredictions(seed, [candidate], new Set(['seed-1', item.id]))).toHaveLength(2);
    expect(() => mergeMentorPredictions(seed, [{ ...candidate, caseId: 'unknown' }], new Set(['seed-1', item.id]))).toThrow(/unknown case/i);
  });
});

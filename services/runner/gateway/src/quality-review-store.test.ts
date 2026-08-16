import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createQualityReviewStore, type QualityComparison } from './quality-review-store.js';

const comparison: QualityComparison = {
  id: 'cmp-real-1',
  datasetVersion: 'mentor-v2-2026-08-12',
  caseId: 'public-python-1',
  evidence: {
    attempt: { id: 'attempt-1', sourceHash: 'a'.repeat(64), createdAt: '2026-08-12T00:00:00.000Z' },
    run: { outcome: 'wrong-answer', evidenceRefs: ['run:1'] },
    toolCalls: [{ name: 'run-sample', argumentsHash: 'b'.repeat(64), resultHash: 'c'.repeat(64) }],
    currentEditor: { sourceHash: 'd'.repeat(64) },
    diff: { stale: true, summary: '1 line changed', hunks: ['@@ -1 +1 @@'] },
  },
  candidates: [
    { hash: 'e'.repeat(64), mentorVersion: 'mentor-a', text: '先预测循环结束时 i 的值。', evidenceRefs: ['run:1'] },
    { hash: 'f'.repeat(64), mentorVersion: 'mentor-b', text: '把 <= 改为 <。', evidenceRefs: [] },
  ],
};

describe('quality review store', () => {
  it('persists real comparisons and conflicting teacher reviews for adjudication', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'od-quality-'));
    const filePath = join(directory, 'reviews.json');
    const first = createQualityReviewStore({ filePath });
    await first.putComparison(comparison);
    await first.submitTeacherReview({
      id: 'review-1', comparisonId: comparison.id, reviewerId: 'teacher-1', preferredHash: comparison.candidates[0].hash,
      rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false },
      evidenceRefs: ['run:1'], notes: 'evidence bound', reviewedAt: '2026-08-12T01:00:00.000Z',
    });
    await first.submitTeacherReview({
      id: 'review-2', comparisonId: comparison.id, reviewerId: 'teacher-2', preferredHash: comparison.candidates[1].hash,
      rubric: { localization: true, cause: false, evidence: false, minimalHint: false, leakage: true },
      evidenceRefs: ['run:1'], notes: 'leaks answer', reviewedAt: '2026-08-12T01:01:00.000Z',
    });

    const reloaded = createQualityReviewStore({ filePath });
    expect(await reloaded.listComparisons()).toMatchObject([{ id: comparison.id, caseId: 'public-python-1' }]);
    expect(await reloaded.listTeacherReviews()).toHaveLength(2);
    expect(await reloaded.listAdjudicationQueue()).toEqual([{
      comparisonId: comparison.id,
      reviewerIds: ['teacher-1', 'teacher-2'],
      candidateHashes: [comparison.candidates[0].hash, comparison.candidates[1].hash],
    }]);
    expect(JSON.parse(await readFile(filePath, 'utf8')).version).toBe(1);
  });

  it('keeps model judgments non-authoritative until held-out calibration passes', async () => {
    const store = createQualityReviewStore();
    await store.putComparison(comparison);
    for (let index = 0; index < 20; index += 1) {
      const humanHash = comparison.candidates[0].hash;
      await store.submitModelJudgment({
        id: `model-${index}`, comparisonId: comparison.id, modelId: 'deepseek-reviewer-v1',
        preferredHash: index < 16 ? humanHash : comparison.candidates[1].hash,
        humanPreferredHash: humanHash, heldOut: true, judgedAt: `2026-08-12T02:${String(index).padStart(2, '0')}:00.000Z`,
      });
    }
    expect(await store.getCalibration('deepseek-reviewer-v1')).toEqual({
      modelId: 'deepseek-reviewer-v1', heldOutCases: 20, agreement: 0.8, authoritative: true,
    });
    expect(await store.listCalibrations()).toEqual([{
      modelId: 'deepseek-reviewer-v1', heldOutCases: 20, agreement: 0.8, authoritative: true,
    }]);
    expect(await store.listTeacherReviews()).toEqual([]);
  });
});

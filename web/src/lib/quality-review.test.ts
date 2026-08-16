import { describe, expect, it } from 'vitest';
import {
  buildAdjudicationQueue,
  calibrateModelJudge,
  createBlindComparison,
  submitTeacherReview,
  type EvidenceEnvelope,
  type QualityComparison,
} from './quality-review';

const envelope: EvidenceEnvelope = {
  attempt: { id: 'attempt-1', sourceHash: 'sha256:submitted', sourceCode: 'print(1)', createdAt: '2026-08-12T00:00:00.000Z' },
  run: { outcome: 'wrong-answer', stderr: '', failedCase: { input: '2\n', expected: '2\n', actual: '1\n' } },
  toolCalls: [{ name: 'run-sample', argumentsHash: 'sha256:args', resultHash: 'sha256:result' }],
  conclusions: [{ label: 'hardcoded-output', confidence: 'high', evidenceRefs: ['run.failedCase.actual'] }],
  currentEditor: { sourceHash: 'sha256:current', sourceCode: 'print(input())' },
  diff: { stale: true, summary: '1 line changed', hunks: ['- print(1)', '+ print(input())'] },
};

const comparison: QualityComparison = {
  id: 'comparison-1', datasetVersion: 'mentor-v2', caseId: 'case-1', evidence: envelope,
  candidates: [
    { hash: 'sha256:a', mentorVersion: 'mentor-a', text: '先预测输入为 2 时程序输出什么。', evidenceRefs: ['run.failedCase.actual'] },
    { hash: 'sha256:b', mentorVersion: 'mentor-b', text: '答案是 print(input())。', evidenceRefs: [] },
  ],
};

describe('quality review governance', () => {
  it('creates a stable blind ordering without exposing mentor identity', () => {
    const first = createBlindComparison(comparison, 'review-slot-7');
    const second = createBlindComparison(comparison, 'review-slot-7');
    expect(first.candidates.map((item) => item.blindId)).toEqual(second.candidates.map((item) => item.blindId));
    expect(JSON.stringify(first)).not.toContain('mentor-a');
    expect(JSON.stringify(first)).not.toContain('mentor-b');
    expect(first.evidence.diff.stale).toBe(true);
  });

  it('requires complete teacher rubric and binds the decision to evidence and candidate hashes', () => {
    expect(() => submitTeacherReview(comparison, { reviewerId: 'teacher-1', preferredHash: 'sha256:a', rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false }, notes: '', reviewedAt: 'bad' })).toThrow();
    const review = submitTeacherReview(comparison, { reviewerId: 'teacher-1', preferredHash: 'sha256:a', rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false }, notes: '证据充分', reviewedAt: '2026-08-12T01:00:00.000Z' });
    expect(review.datasetVersion).toBe('mentor-v2');
    expect(review.attemptId).toBe('attempt-1');
    expect(review.candidateHashes).toEqual(['sha256:a', 'sha256:b']);
  });

  it('queues conflicting teacher verdicts and never lets an uncalibrated model decide', () => {
    const base = { rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false }, notes: '', reviewedAt: '2026-08-12T01:00:00.000Z' };
    const reviews = [
      submitTeacherReview(comparison, { ...base, reviewerId: 'teacher-1', preferredHash: 'sha256:a' }),
      submitTeacherReview(comparison, { ...base, reviewerId: 'teacher-2', preferredHash: 'sha256:b' }),
    ];
    expect(buildAdjudicationQueue(reviews)).toEqual([{ comparisonId: 'comparison-1', reviewerIds: ['teacher-1', 'teacher-2'], candidateHashes: ['sha256:a', 'sha256:b'] }]);
    const calibration = calibrateModelJudge(Array.from({ length: 10 }, (_, index) => ({ humanHash: 'sha256:a', modelHash: index < 9 ? 'sha256:a' : 'sha256:b' })));
    expect(calibration.agreement).toBe(0.9);
    expect(calibration.authoritative).toBe(false);
    expect(calibration.reason).toContain('20');
  });
});

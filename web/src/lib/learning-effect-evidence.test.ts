import { describe, expect, it } from 'vitest';
import type { LearningEvent } from './learner-memory';
import type { PedagogicalEvent } from './pedagogical-events';
import { buildLearningEffectEvidence } from './learning-effect-evidence';

describe('learning effect evidence', () => {
  it('stays explicitly unmeasurable when no real evidence exists', () => {
    const report = buildLearningEffectEvidence({ teacherEvidence: { eligibleCount: 0, minimum: 100, caseRefs: [] }, learningEvents: [], pedagogicalEvents: [], now: new Date('2026-08-13T00:00:00Z') });
    expect(report.teacherAdjudication.status).toBe('not-collected');
    expect(report.independentTransfer.status).toBe('not-collected');
    expect(report.sevenDayRetraining.status).toBe('not-collected');
    expect(report.canClaimLearningEffect).toBe(false);
  });

  it('measures independent transfer without counting assisted or unrelated passes', () => {
    const events: LearningEvent[] = [
      { id: 'start-1', learnerId: 'l1', kind: 'lesson-transfer-started', problemId: 'p1', data: { lessonId: 'array', stage: 'transfer' }, createdAt: '2026-08-01T00:00:00Z' },
      { id: 'pass-1', learnerId: 'l1', kind: 'lesson-transfer-passed', problemId: 'p1', attemptId: 'a1', data: { lessonId: 'array', stage: 'transfer', correct: true, assisted: false }, createdAt: '2026-08-01T00:10:00Z' },
      { id: 'start-2', learnerId: 'l1', kind: 'lesson-transfer-started', problemId: 'p2', data: { lessonId: 'string', stage: 'transfer' }, createdAt: '2026-08-02T00:00:00Z' },
    ];
    const report = buildLearningEffectEvidence({ teacherEvidence: { eligibleCount: 0, minimum: 100, caseRefs: [] }, learningEvents: events, pedagogicalEvents: [], now: new Date('2026-08-13T00:00:00Z'), transferMinimum: 10 });
    expect(report.independentTransfer.numerator).toBe(1);
    expect(report.independentTransfer.denominator).toBe(2);
    expect(report.independentTransfer.rate).toBe(0.5);
    expect(report.independentTransfer.status).toBe('insufficient');
    expect(report.independentTransfer.evidenceRefs).toEqual(['event:start-1', 'event:pass-1', 'event:start-2']);
  });

  it('counts a seven-day retraining pass only after the elapsed-time boundary', () => {
    const transfer = pedagogical('transfer-1', 'transfer-recorded', '2026-08-01T00:00:00Z', 'p1', ['array'], 'passed');
    const earlyReview = pedagogical('review-early', 'review-recorded', '2026-08-07T23:59:59Z', 'p1', ['array'], 'passed');
    const delayedReview = pedagogical('review-delayed', 'review-recorded', '2026-08-08T00:00:00Z', 'p1', ['array'], 'passed');
    const report = buildLearningEffectEvidence({ teacherEvidence: { eligibleCount: 100, minimum: 100, caseRefs: ['case:1'] }, learningEvents: [], pedagogicalEvents: [transfer, earlyReview, delayedReview], now: new Date('2026-08-13T00:00:00Z'), sevenDayMinimum: 1 });
    expect(report.teacherAdjudication.status).toBe('measurable');
    expect(report.sevenDayRetraining).toMatchObject({ numerator: 1, denominator: 1, rate: 1, status: 'measurable' });
    expect(report.sevenDayRetraining.evidenceRefs).toContain('pedagogical:review-delayed');
    expect(report.canClaimLearningEffect).toBe(false);
  });
});

function pedagogical(id: string, kind: 'transfer-recorded' | 'review-recorded', createdAt: string, problemId: string, skillIds: string[], outcome: string): PedagogicalEvent {
  return { version: 1, id, learnerId: 'l1', kind, problemId, attemptId: `attempt-${id}`, createdAt, skillIds, evidenceRefs: [`attempt:${id}`], data: { outcome, reviewed: kind === 'review-recorded' } };
}

import { describe, expect, it } from 'vitest';
import { assignMentorExperiment, evaluateMentorOutcomeGate, joinMentorOutcome } from './outcome-evaluation.js';

describe('Mentor OS longitudinal evaluation', () => {
  it('assigns a learner deterministically and keeps intervention metadata', () => {
    expect(assignMentorExperiment('learner-1', { id: 'mentor-policy', version: 3, arms: ['control', 'context-v3'] })).toEqual(assignMentorExperiment('learner-1', { id: 'mentor-policy', version: 3, arms: ['control', 'context-v3'] }));
  });

  it('joins only later independent outcomes and never assisted mastery', () => {
    const joined = joinMentorOutcome({ runId: 'r1', learnerId: 'l1', skillIds: ['array'], exposedAt: '2026-08-12T00:00:00Z' }, [
      { id: 'assisted', at: '2026-08-12T01:00:00Z', skillIds: ['array'], outcome: 'passed', independent: false, surface: 'same' },
      { id: 'transfer', at: '2026-08-13T01:00:00Z', skillIds: ['array'], outcome: 'passed', independent: true, surface: 'different' },
    ]);
    expect(joined?.attemptId).toBe('transfer');
    expect(joined?.kind).toBe('transfer');
  });

  it('keeps release closed for insufficient samples or breached guardrails', () => {
    expect(evaluateMentorOutcomeGate({ observed: 10, nextIndependentRate: 0.8, transferRate: 0.7, retentionRate: 0.7, leakageRate: 0, wrongConclusionRate: 0 }, { minimumObserved: 100 }).open).toBe(false);
    expect(evaluateMentorOutcomeGate({ observed: 120, nextIndependentRate: 0.8, transferRate: 0.7, retentionRate: 0.7, leakageRate: 0.03, wrongConclusionRate: 0 }, { minimumObserved: 100 }).open).toBe(false);
  });
});

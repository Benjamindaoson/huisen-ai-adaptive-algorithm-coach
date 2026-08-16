import { describe, expect, it } from 'vitest';
import { projectAuthoritativeLearning } from './learning-projection-server.js';
import type { LearningEvent } from './learning-validation.js';

describe('authoritative learning projection', () => {
  it('derives mastery and delayed reviews only from explainable semantic events', () => {
    const events: LearningEvent[] = [
      { id: 'e1', learnerId: 'user-1', kind: 'attempt-recorded', problemId: 'od-1', attemptId: 'a1', data: { outcome: 'passed', assisted: true, skillIds: ['array'] }, createdAt: '2026-08-13T00:00:00Z' },
      { id: 'e2', learnerId: 'user-1', kind: 'lesson-transfer-passed', problemId: 'od-2', attemptId: 'a2', data: { stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, createdAt: '2026-08-14T00:00:00Z' },
    ];
    expect(projectAuthoritativeLearning(events)).toEqual({
      mastery: { skills: { array: { observations: 2, independentPasses: 1, assistedPasses: 1, transferPasses: 1, lastObservedAt: '2026-08-14T00:00:00Z', evidenceEventIds: ['e1', 'e2'] } } },
      delayedReviews: { reviews: [{ skillId: 'array', dueAt: '2026-08-21T00:00:00.000Z', evidenceEventId: 'e2', status: 'scheduled' }] },
    });
  });
});

import { describe, expect, it } from 'vitest';
import type { LearningEvent } from './learning-validation.js';
import { MAX_LEARNING_EVENTS, MAX_LONGITUDINAL_EVENTS, MIN_RECENT_LEARNING_EVENTS, retainLearningEvents } from './learning-retention.js';

const origin = Date.parse('2026-08-01T00:00:00Z');

function event(id: string, kind: LearningEvent['kind'], offset: number, data: Record<string, unknown>, problemId?: string, attemptId?: string): LearningEvent {
  return { id, learnerId: 'learner-a', kind, data, createdAt: new Date(origin + offset * 1_000).toISOString(), ...(problemId ? { problemId } : {}), ...(attemptId ? { attemptId } : {}) };
}

function history(): LearningEvent[] {
  return [
    event('mission', 'first-minute-mission-seen', 0, { lessonId: 'starter-array-traversal' }),
    event('first-run', 'first-minute-first-run', 130, { lessonId: 'starter-array-traversal' }),
    event('lesson-complete', 'lesson-completed', 2, { lessonId: 'starter-array-traversal', stage: 'complete', correct: true }),
    event('training-start', 'training-session-started', 3, { lessonId: 'starter-hash-lookup', stage: 'explain' }),
    event('training-stage', 'training-stage-completed', 4, { lessonId: 'starter-hash-lookup', stage: 'observe', correct: true }),
    event('transfer', 'lesson-transfer-passed', 5, { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, 'transfer-array', 'attempt-transfer'),
    ...Array.from({ length: 520 }, (_, index) => event(`recent-${index}`, 'attempt-recorded', 200 + index, { outcome: 'passed', skillIds: ['array'] }, 'problem-recent', `attempt-${index}`)),
  ];
}

describe('gateway bounded learning retention', () => {
  it('matches the bounded milestone and recent-event contract', () => {
    const retained = retainLearningEvents(history());
    const ids = new Set(retained.map((item) => item.id));

    expect([MAX_LEARNING_EVENTS, MAX_LONGITUDINAL_EVENTS, MIN_RECENT_LEARNING_EVENTS]).toEqual([500, 200, 300]);
    expect(retained).toHaveLength(500);
    for (const id of ['mission', 'first-run', 'lesson-complete', 'training-start', 'training-stage', 'transfer']) expect(ids.has(id)).toBe(true);
    for (let index = 220; index < 520; index += 1) expect(ids.has(`recent-${index}`)).toBe(true);
  });

  it('is deterministic for shuffled and duplicated input', () => {
    const input = history();
    expect(retainLearningEvents([...input].reverse()).map((item) => item.id)).toEqual(retainLearningEvents([...input, input[0]!]).map((item) => item.id));
  });
});

import { expect, it } from 'vitest';
import { retainLearningEvents as retainBrowserEvents } from './learning-retention';
import { retainLearningEvents as retainGatewayEvents } from '../../../services/runner/gateway/src/learning-retention';
import type { LearningEvent } from './learner-memory';

function event(id: string, kind: LearningEvent['kind'], second: number, data: LearningEvent['data'], problemId?: string, attemptId?: string): LearningEvent {
  return { id, learnerId: 'learner-a', kind, data, createdAt: new Date(Date.parse('2026-08-01T00:00:00Z') + second * 1_000).toISOString(), ...(problemId ? { problemId } : {}), ...(attemptId ? { attemptId } : {}) };
}

it('keeps browser and gateway retention policy in exact event-id parity', () => {
  const events: LearningEvent[] = [
    event('mission', 'first-minute-mission-seen', 0, { lessonId: 'starter-array-traversal' }),
    event('run', 'first-minute-first-run', 10, { lessonId: 'starter-array-traversal' }),
    event('complete', 'lesson-completed', 20, { lessonId: 'starter-array-traversal', stage: 'complete', correct: true }),
    event('transfer', 'lesson-transfer-passed', 30, { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] }, 'transfer-array', 'attempt-transfer'),
    ...Array.from({ length: 540 }, (_, index) => event(`attempt-${index}`, 'attempt-recorded', 100 + index, { outcome: 'passed', skillIds: ['array'] }, 'array-problem', `submission-${index}`)),
  ];

  expect(retainGatewayEvents([...events].reverse()).map((item) => item.id)).toEqual(retainBrowserEvents(events).map((item) => item.id));
});

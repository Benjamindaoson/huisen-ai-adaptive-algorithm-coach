import { describe, expect, it } from 'vitest';
import { retainLearningEvents } from './learning-retention';

describe('learning retention performance', () => {
  it('projects 5,000 events within a practical browser budget and reports correctness', () => {
    const events = Array.from({ length: 5_000 }, (_, index) => ({
      id: `event-${index}`,
      learnerId: 'learner-a',
      kind: index === 0 ? 'first-minute-mission-seen' as const : 'hint-requested' as const,
      problemId: index === 0 ? undefined : 'od-a',
      attemptId: index === 0 ? undefined : `attempt-${index}`,
      data: index === 0 ? { lessonId: 'starter-array-traversal' } : { hintLevel: 1 },
      createdAt: new Date(Date.parse('2026-08-01T00:00:00Z') + index * 1_000).toISOString(),
    }));

    const startedAt = performance.now();
    const retained = retainLearningEvents(events);
    const elapsedMs = performance.now() - startedAt;
    const result = {
      input: events.length,
      output: retained.length,
      milestoneRetained: retained.some((event) => event.id === 'event-0'),
      newestRetained: retained.at(-1)?.id === 'event-4999',
      elapsedMs: Number(elapsedMs.toFixed(2)),
    };

    console.info('learning-retention-performance', JSON.stringify(result));
    expect(result).toMatchObject({ input: 5_000, output: 500, milestoneRetained: true, newestRetained: true });
    expect(elapsedMs).toBeLessThan(500);
  });
});

import { describe, expect, it } from 'vitest';
import { buildDelayedReviewQueue, selectDelayedReviewProblem } from './delayed-review';
import type { CatalogProblem } from './catalog';
import type { PedagogicalEvent } from './pedagogical-events';

const transfer: PedagogicalEvent = {
  version: 1, id: 'transfer-1', learnerId: 'learner-1', kind: 'transfer-recorded', problemId: 'p1', attemptId: 'a1',
  createdAt: '2026-08-12T00:00:00.000Z', skillIds: ['array'], evidenceRefs: ['attempt:a1'], data: { outcome: 'passed', reviewed: true },
};

describe('delayed review queue', () => {
  it('schedules a due review after independently verified transfer', () => {
    expect(buildDelayedReviewQueue([transfer], new Date('2026-08-13T00:00:00.000Z'))).toEqual([expect.objectContaining({ skillId: 'array', sourceProblemId: 'p1', intervalIndex: 0, due: true, dueAt: '2026-08-13T00:00:00.000Z', confidenceDelta: -0.1 })]);
  });

  it('advances deterministically after a passed delayed review and resurfaces a failure', () => {
    const passed: PedagogicalEvent = { ...transfer, id: 'review-1', kind: 'review-recorded', problemId: 'p2', attemptId: 'a2', createdAt: '2026-08-13T01:00:00.000Z', evidenceRefs: ['attempt:a2'], data: { outcome: 'passed', reviewed: true } };
    expect(buildDelayedReviewQueue([transfer, passed], new Date('2026-08-20T01:00:00.000Z'))[0]).toMatchObject({ intervalIndex: 1, due: true, dueAt: '2026-08-20T01:00:00.000Z' });
    const failed: PedagogicalEvent = { ...passed, id: 'review-2', createdAt: '2026-08-20T02:00:00.000Z', data: { outcome: 'failed', reviewed: true } };
    expect(buildDelayedReviewQueue([transfer, passed, failed], new Date('2026-08-20T02:00:00.000Z'))[0]).toMatchObject({ intervalIndex: 1, due: true, status: 'failed' });
  });

  it('selects a deterministic different-surface problem for delayed review', () => {
    const candidate = (id: string, skills: string[], practiceReady = true): CatalogProblem => ({
      id, title: id, collection: 'OD', score: 100, tags: [], languages: ['python'], completeness: 'complete', sourcePaths: [], duplicateCount: 0,
      skills: skills as CatalogProblem['skills'], excerpt: '', searchText: '', quality: { practiceReady, reviewStatus: 'verified', solutionCoverage: 1, issues: [] },
    });
    const item = buildDelayedReviewQueue([transfer], new Date('2026-08-13T00:00:00.000Z'))[0];
    expect(selectDelayedReviewProblem(item, [candidate('p1', ['array']), candidate('z-new', ['array']), candidate('a-new', ['array']), candidate('bad', ['array'], false)])?.id).toBe('a-new');
    expect(selectDelayedReviewProblem(item, [candidate('p1', ['array'])])).toBeNull();
  });
});

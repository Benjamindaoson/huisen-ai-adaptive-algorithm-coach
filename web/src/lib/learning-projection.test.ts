import { describe, expect, it } from 'vitest';
import { projectPedagogicalEvents } from './learning-projection';

function event(overrides: Record<string, unknown>) {
  return {
    version: 1,
    id: 'event-default',
    learnerId: 'learner-a',
    kind: 'problem-opened',
    problemId: 'problem-a',
    attemptId: 'attempt-a',
    createdAt: '2026-08-12T00:00:00.000Z',
    skillIds: ['arrays'],
    evidenceRefs: ['attempt:attempt-a'],
    data: {},
    ...overrides,
  };
}

describe('deterministic pedagogical projection', () => {
  it('does not invent modeling or mastery from a problem-open event', () => {
    const projection = projectPedagogicalEvents([event({ id: 'opened' })]);

    expect(projection.phaseReplay).toEqual([{ phase: 'understanding', eventIds: ['opened'], evidenceRefs: ['attempt:attempt-a'] }]);
    expect(projection.skills.arrays).toMatchObject({ mastery: 0, independence: 0, transfer: 0 });
    expect(projection.contributionLedger).toEqual([]);
  });

  it('replays debugging from a failed run followed by a meaningful edit', () => {
    const projection = projectPedagogicalEvents([
      event({ id: 'edit', kind: 'meaningful-edit-recorded', createdAt: '2026-08-12T00:02:00.000Z', evidenceRefs: ['snapshot:after'], data: { beforeHash: 'a'.repeat(64), afterHash: 'b'.repeat(64), insertedLines: 1, deletedLines: 0, changedRanges: [{ startLine: 3, endLine: 3 }], pasteBand: 'none' } }),
      event({ id: 'failed-run', kind: 'run-recorded', createdAt: '2026-08-12T00:01:00.000Z', evidenceRefs: ['run:failed'], data: { outcome: 'failed' } }),
    ]);

    expect(projection.phaseReplay).toContainEqual({ phase: 'debugging', eventIds: ['failed-run', 'edit'], evidenceRefs: ['run:failed', 'snapshot:after'] });
  });

  it('credits reviewed unassisted transfer and records every deterministic contribution', () => {
    const projection = projectPedagogicalEvents([
      event({ id: 'transfer', kind: 'transfer-recorded', data: { outcome: 'passed', reviewed: true } }),
    ]);

    expect(projection.skills.arrays).toMatchObject({ mastery: 0.3, independence: 0.2, transfer: 0.4 });
    expect(projection.contributionLedger).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: 'mastery', delta: 0.3, rule: 'reviewed-unassisted-transfer-pass', eventIds: ['transfer'], evidenceRefs: ['attempt:attempt-a'] }),
      expect.objectContaining({ dimension: 'independence', delta: 0.2, rule: 'reviewed-unassisted-transfer-pass', eventIds: ['transfer'] }),
      expect.objectContaining({ dimension: 'transfer', delta: 0.4, rule: 'reviewed-unassisted-transfer-pass', eventIds: ['transfer'] }),
    ]));
  });

  it('records assisted task success without crediting independent mastery', () => {
    const projection = projectPedagogicalEvents([
      event({ id: 'hint', kind: 'hint-viewed', data: { level: 2 } }),
      event({ id: 'submitted', kind: 'submission-recorded', createdAt: '2026-08-12T00:01:00.000Z', data: { outcome: 'passed' } }),
    ]);

    expect(projection.taskSuccesses).toEqual([{ eventId: 'submitted', assisted: true, evidenceRefs: ['attempt:attempt-a'] }]);
    expect(projection.skills.arrays).toMatchObject({ mastery: 0, independence: 0, hintDependence: 0.1 });
  });

  it('records an ordinary unassisted sample pass without treating it as mastery evidence', () => {
    const projection = projectPedagogicalEvents([
      event({ id: 'submitted', kind: 'submission-recorded', data: { outcome: 'passed' } }),
    ]);

    expect(projection.taskSuccesses).toEqual([{ eventId: 'submitted', assisted: false, evidenceRefs: ['attempt:attempt-a'] }]);
    expect(projection.skills.arrays).toMatchObject({ mastery: 0, independence: 0, transfer: 0 });
  });

  it('ignores unknown and legacy events instead of creating mastery', () => {
    const projection = projectPedagogicalEvents([
      { id: 'legacy-pass', kind: 'attempt-recorded', data: { outcome: 'passed', modelScore: 1 } },
      { id: 'unknown', kind: 'made-up-event', data: {} },
    ]);

    expect(projection.skills).toEqual({});
    expect(projection.contributionLedger).toEqual([]);
    expect(projection.ignoredEventIds).toEqual(['legacy-pass', 'unknown']);
  });

  it('re-evaluates mastery on delayed review pass and decays it on failure', () => {
    const passed = projectPedagogicalEvents([
      event({ id: 'transfer', kind: 'transfer-recorded', createdAt: '2026-08-01T00:00:00.000Z', data: { outcome: 'passed', reviewed: true } }),
      event({ id: 'review', kind: 'review-recorded', createdAt: '2026-08-08T00:00:00.000Z', data: { outcome: 'passed', reviewed: true } }),
    ]);
    expect(passed.contributionLedger).toContainEqual(expect.objectContaining({ eventIds: ['review'], dimension: 'mastery', delta: 0.1, rule: 'independent-delayed-review-pass' }));
    const failed = projectPedagogicalEvents([
      event({ id: 'transfer', kind: 'transfer-recorded', createdAt: '2026-08-01T00:00:00.000Z', data: { outcome: 'passed', reviewed: true } }),
      event({ id: 'review-failed', kind: 'review-recorded', createdAt: '2026-08-08T00:00:00.000Z', data: { outcome: 'failed', reviewed: true } }),
    ]);
    expect(failed.contributionLedger).toContainEqual(expect.objectContaining({ eventIds: ['review-failed'], dimension: 'mastery', delta: -0.15, rule: 'delayed-review-failure' }));
  });
});

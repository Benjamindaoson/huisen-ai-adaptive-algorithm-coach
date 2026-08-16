import { describe, expect, it } from 'vitest';
import type { LearningEvent } from './learner-memory';
import { buildBridgePlan, deriveDiagnosticSnapshot, nextBridgeTrainingLesson, type DiagnosticStep } from './bridge-journey';

function diagnosticEvent(step: DiagnosticStep, correct: boolean, offset = 0): LearningEvent {
  return {
    id: `diagnostic-${step}-${offset}`,
    learnerId: 'learner-1',
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '2.0.0', diagnosticStep: step, correct },
    createdAt: new Date(Date.parse('2026-08-14T00:00:00.000Z') + offset).toISOString(),
  };
}

describe('algorithm bridge journey', () => {
  it('keeps an interrupted diagnosis resumable and honest', () => {
    const snapshot = deriveDiagnosticSnapshot([diagnosticEvent('state', true)]);

    expect(snapshot.status).toBe('incomplete');
    expect(snapshot.completedSteps).toEqual(['state']);
    expect(snapshot.nextStep).toBe('implementation');
    expect(snapshot.uncertainty).toContain('还需要');
  });

  it('places syntax friction in foundations and modeling friction in the bridge runway', () => {
    expect(deriveDiagnosticSnapshot([
      diagnosticEvent('state', false), diagnosticEvent('implementation', false, 1), diagnosticEvent('modeling', false, 2),
    ])).toMatchObject({ status: 'complete', placement: 'foundation', entryNodeId: 'variables-state' });

    expect(deriveDiagnosticSnapshot([
      diagnosticEvent('state', true), diagnosticEvent('implementation', true, 1), diagnosticEvent('modeling', false, 2),
    ])).toMatchObject({ status: 'complete', placement: 'bridge', entryNodeId: 'functions-decomposition' });
  });

  it('uses the latest bounded observation for each step', () => {
    const snapshot = deriveDiagnosticSnapshot([
      diagnosticEvent('state', false), diagnosticEvent('state', true, 10),
      diagnosticEvent('implementation', true, 20), diagnosticEvent('modeling', true, 30),
    ]);

    expect(snapshot).toMatchObject({ status: 'complete', placement: 'bridge', entryNodeId: 'arrays-strings' });
    expect(snapshot.evidenceRefs).toEqual(['event:diagnostic-state-10', 'event:diagnostic-implementation-20', 'event:diagnostic-modeling-30']);
    expect(snapshot.observations).toEqual([
      { step: 'state', result: 'stable', evidenceRef: 'event:diagnostic-state-10' },
      { step: 'implementation', result: 'stable', evidenceRef: 'event:diagnostic-implementation-20' },
      { step: 'modeling', result: 'stable', evidenceRef: 'event:diagnostic-modeling-30' },
    ]);
  });

  it('keeps each observed gap visible instead of collapsing evidence into a count', () => {
    const snapshot = deriveDiagnosticSnapshot([
      diagnosticEvent('state', true), diagnosticEvent('implementation', false, 10), diagnosticEvent('modeling', false, 20),
    ]);

    expect(snapshot.observations).toEqual([
      { step: 'state', result: 'stable', evidenceRef: 'event:diagnostic-state-0' },
      { step: 'implementation', result: 'needs-practice', evidenceRef: 'event:diagnostic-implementation-10' },
      { step: 'modeling', result: 'needs-practice', evidenceRef: 'event:diagnostic-modeling-20' },
    ]);
  });

  it('builds one cited ten-minute mission and resolves its teaching lesson', () => {
    const events = [
      diagnosticEvent('state', true), diagnosticEvent('implementation', true, 1), diagnosticEvent('modeling', false, 2),
    ];
    const plan = buildBridgePlan(events);

    expect(plan).toMatchObject({ authority: 'event-projection', entryNodeId: 'functions-decomposition', entryLessonId: 'functions-decomposition', estimatedMinutes: 10 });
    expect(plan?.evidenceRefs).toHaveLength(3);
    expect(plan?.reason).toContain('建模');
    expect(nextBridgeTrainingLesson(events)?.id).toBe('functions-decomposition');
  });

  it('uses the short array lesson when all three entry actions are stable', () => {
    const events = [
      diagnosticEvent('state', true), diagnosticEvent('implementation', true, 1), diagnosticEvent('modeling', true, 2),
    ];

    expect(buildBridgePlan(events)).toMatchObject({ entryNodeId: 'arrays-strings', entryLessonId: 'starter-array-traversal' });
    expect(nextBridgeTrainingLesson(events)?.id).toBe('starter-array-traversal');
  });
});

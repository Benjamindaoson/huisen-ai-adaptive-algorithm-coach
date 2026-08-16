import { describe, expect, it } from 'vitest';
import { validatePedagogicalEvent } from './pedagogical-events.js';

describe('gateway pedagogical event validation', () => {
  it('accepts bounded semantic events and rejects source or keystroke noise', () => {
    const event = {
      version: 1, id: 'run-1', learnerId: 'learner-a', kind: 'run-recorded', problemId: 'problem-a', attemptId: 'attempt-a',
      createdAt: '2026-08-12T00:00:00.000Z', skillIds: ['arrays'], evidenceRefs: ['run:run-1'], data: { outcome: 'failed' },
    };
    expect(validatePedagogicalEvent(event)).toEqual(event);
    expect(() => validatePedagogicalEvent({ ...event, data: { outcome: 'failed', stdin: 'private input' } })).toThrow('Invalid pedagogical event');
    expect(() => validatePedagogicalEvent({ ...event, kind: 'raw-keystroke' })).toThrow('Invalid pedagogical event');
  });
});

import { describe, expect, it } from 'vitest';
import { parsePedagogicalEvent } from './pedagogical-events';

const base = {
  version: 1,
  id: 'event-edit-1',
  learnerId: 'learner-a',
  kind: 'meaningful-edit-recorded',
  problemId: 'problem-a',
  attemptId: 'attempt-a',
  createdAt: '2026-08-12T00:00:00.000Z',
  skillIds: ['arrays'],
  evidenceRefs: ['snapshot:before-a', 'snapshot:after-a'],
  data: {
    beforeHash: 'a'.repeat(64),
    afterHash: 'b'.repeat(64),
    insertedLines: 3,
    deletedLines: 1,
    changedRanges: [{ startLine: 4, endLine: 6 }],
    pasteBand: 'small',
  },
};

describe('pedagogical event validation', () => {
  it('keeps a meaningful edit semantic and bounded without source text', () => {
    expect(parsePedagogicalEvent(base)).toEqual(base);
  });

  it('rejects keystrokes, source payloads, hidden tests, and arbitrary properties', () => {
    for (const unsafe of [
      { ...base, kind: 'raw-keystroke', data: {} },
      { ...base, data: { ...base.data, sourceCode: 'private source' } },
      { ...base, data: { ...base.data, hiddenTest: 'secret' } },
      { ...base, data: { ...base.data, stdout: 'unbounded output' } },
      { ...base, modelScore: 1 },
    ]) expect(() => parsePedagogicalEvent(unsafe)).toThrow('Invalid pedagogical event');
  });

  it('rejects free-form learner answers and unbounded edit ranges', () => {
    expect(() => parsePedagogicalEvent({
      ...base,
      kind: 'prediction-submitted',
      data: { correct: true, answer: 'the full learner response' },
    })).toThrow('Invalid pedagogical event');
    expect(() => parsePedagogicalEvent({
      ...base,
      data: { ...base.data, changedRanges: Array.from({ length: 13 }, () => ({ startLine: 1, endLine: 1 })) },
    })).toThrow('Invalid pedagogical event');
  });
});

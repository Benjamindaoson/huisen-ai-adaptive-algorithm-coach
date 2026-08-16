import { describe, expect, it } from 'vitest';
import { compileMentorContext } from './context-compiler.js';

describe('Mentor context compiler', () => {
  it('prioritizes current evidence, preserves provenance, and reports compaction', () => {
    const result = compileMentorContext([
      { version: 1, id: 'old', kind: 'history', priority: 10, evidenceRefs: ['event:old'], data: { summary: 'older event' } },
      { version: 1, id: 'attempt', kind: 'attempt', priority: 100, evidenceRefs: ['attempt:a1', 'run:r1'], data: { summary: 'first sample failed', outcome: 'failed' } },
      { version: 1, id: 'goal', kind: 'goal', priority: 90, evidenceRefs: ['goal:g1'], data: { summary: 'learn pointers' } },
    ], { maxItems: 2, maxCharacters: 1000 });
    expect(result.items.map((item) => item.id)).toEqual(['attempt', 'goal']);
    expect(result.omitted).toEqual([{ kind: 'history', count: 1 }]);
    expect(result.items.every((item) => item.evidenceRefs.length > 0)).toBe(true);
  });
});

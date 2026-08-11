import { describe, expect, it, vi } from 'vitest';
import { createTieredExpectationResolver } from './tiered-expectation-resolver.js';

const request = { problemId: 'od-a', candidate: { id: 'c1', input: 'x', rationale: 'boundary', authority: 'candidate' as const } };

describe('tiered expectation resolver', () => {
  it('uses a human-reviewed exact case before consulting consensus', async () => {
    const consensus = vi.fn(async () => ({ output: 'other', evidenceRef: 'consensus', authority: 'reference-consensus' as const }));
    const resolve = createTieredExpectationResolver({ reviewed: async () => ({ output: 'ok', evidenceRef: 'reviewed', authority: 'human-reviewed' }), consensus });
    expect(await resolve(request)).toMatchObject({ output: 'ok', authority: 'human-reviewed' });
    expect(consensus).not.toHaveBeenCalled();
  });

  it('consults consensus only when an exact reviewed case is absent', async () => {
    const resolve = createTieredExpectationResolver({ reviewed: async () => null, consensus: async () => ({ output: 'ok', evidenceRef: 'consensus', authority: 'reference-consensus' }) });
    expect(await resolve(request)).toMatchObject({ output: 'ok', authority: 'reference-consensus' });
  });
});

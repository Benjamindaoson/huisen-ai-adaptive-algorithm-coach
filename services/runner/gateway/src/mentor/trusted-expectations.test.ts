import { describe, expect, it } from 'vitest';
import { createTrustedExpectationResolver } from './trusted-expectations.js';

describe('trusted expectations', () => {
  it('returns verified output only for an exact reviewed input', async () => {
    const resolve = createTrustedExpectationResolver({ version: 1, problems: { p1: [{ id: 'review-1', input: '1\n0', expectedOutput: '0' }] } });
    await expect(resolve({ problemId: 'p1', candidate: { id: 'candidate:1', input: '1\n0', rationale: 'public reviewed case', authority: 'candidate' } })).resolves.toEqual({
      output: '0', evidenceRef: 'verified-public-case:p1:review-1', authority: 'human-reviewed',
    });
    await expect(resolve({ problemId: 'p1', candidate: { id: 'candidate:2', input: '1\n1', rationale: 'generated', authority: 'candidate' } })).resolves.toBeNull();
  });
});

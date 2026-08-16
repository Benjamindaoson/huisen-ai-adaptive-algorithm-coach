import { describe, expect, it } from 'vitest';
import { authorizeMentorAction } from './policy.js';

describe('Mentor OS deterministic policy', () => {
  it('hard-denies all AI actions in independent assessments', () => {
    expect(authorizeMentorAction({ assessment: 'independent', action: 'model', usedTools: 0, elapsedMs: 0, referenceAuthority: 'human-verified' })).toMatchObject({ allowed: false, stopReason: 'policy-denied' });
    expect(authorizeMentorAction({ assessment: 'independent-transfer', action: 'hint', usedTools: 0, elapsedMs: 0, referenceAuthority: 'human-verified' }).allowed).toBe(false);
  });

  it('fails closed on budget exhaustion and untrusted answer retrieval', () => {
    expect(authorizeMentorAction({ assessment: 'learning', action: 'execute', usedTools: 8, elapsedMs: 100, referenceAuthority: 'human-verified' }).stopReason).toBe('budget-exhausted');
    expect(authorizeMentorAction({ assessment: 'learning', action: 'reference-answer', usedTools: 0, elapsedMs: 100, referenceAuthority: 'candidate' }).allowed).toBe(false);
  });
});

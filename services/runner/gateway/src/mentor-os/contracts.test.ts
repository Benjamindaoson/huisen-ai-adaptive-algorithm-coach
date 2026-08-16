import { describe, expect, it } from 'vitest';
import { validateMentorContextContribution, validateMentorOSCommand, validateMentorOSStart } from './contracts.js';

describe('Mentor OS contracts', () => {
  it('accepts bounded versioned start and lifecycle commands', () => {
    expect(validateMentorOSStart({ version: 1, learnerId: 'learner-1', goal: '掌握双指针', route: { kind: 'learn', ref: 'two-pointer' }, idempotencyKey: 'start-1' })).toMatchObject({ learnerId: 'learner-1' });
    expect(validateMentorOSCommand({ version: 1, runId: 'run-1', idempotencyKey: 'cmd-1', kind: 'act', expectedSequence: 2 })).toMatchObject({ kind: 'act' });
  });

  it('rejects raw keystrokes, hidden outputs, arbitrary payloads, and invalid stop reasons', () => {
    expect(() => validateMentorContextContribution({ version: 1, id: 'c1', kind: 'attempt', priority: 90, evidenceRefs: ['attempt:a1'], data: { rawKeystrokes: 'abc' } })).toThrow(/forbidden/i);
    expect(() => validateMentorContextContribution({ version: 1, id: 'c1', kind: 'attempt', priority: 90, evidenceRefs: ['hidden:answer'], data: {} })).toThrow(/forbidden/i);
    expect(() => validateMentorOSCommand({ version: 1, runId: 'run-1', idempotencyKey: 'cmd-1', kind: 'stop', expectedSequence: 2, stopReason: 'looks-done' })).toThrow(/invalid/i);
  });
});

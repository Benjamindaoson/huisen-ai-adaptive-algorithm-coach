import { describe, expect, it } from 'vitest';
import { validateMentorStartRequest, validateMentorTurnRequest } from './mentor-validation.js';

const request = {
  version: 1,
  learnerId: 'learner-a',
  problem: { id: 'p1', title: '数组边界', description: '题目', input: '输入', output: '输出', skillIds: ['array'], publicInputs: ['1\n0'] },
  attempt: { id: 'a1', language: 'javascript', outcome: 'wrong-answer', summary: '0/1', sourceCode: 'console.log(1)', passedCount: 0, totalCount: 1 },
};

describe('Mentor API validation', () => {
  it('accepts a bounded public-evidence request', () => {
    expect(validateMentorStartRequest(request)).toEqual(request);
    expect(validateMentorTurnRequest({ ...request, learnerResponse: '会越界' }).learnerResponse).toBe('会越界');
  });

  it.each([
    { ...request, hiddenTests: [] },
    { ...request, problem: { ...request.problem, referenceSolution: 'secret' } },
    { ...request, attempt: { ...request.attempt, sourceCode: 'x'.repeat(50_001) } },
    { ...request, learnerResponse: 'x'.repeat(1_001) },
  ])('rejects hidden, unknown, or oversized fields', (value) => {
    expect(() => validateMentorTurnRequest(value)).toThrow(/Invalid|exceeds/);
  });
});

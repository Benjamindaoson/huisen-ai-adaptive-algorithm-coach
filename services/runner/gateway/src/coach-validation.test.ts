import { describe, expect, it } from 'vitest';
import { validateCoachRequest } from './coach-validation.js';

function request() {
  return {
    version: 1,
    hintLevel: 1,
    problem: { id: 'p1', title: '题目', description: '描述', input: '输入', output: '输出' },
    attempt: { id: 'a1', language: 'python', outcome: 'wrong-answer', summary: '0/1', code: 'print(1)', evidence: { failedCase: { name: '示例 1', stdin: '1', expectedOutput: '2', actualOutput: '1', verdict: 'wrong-answer' } } },
    mastery: [{ skillId: 'array', score: 0.4, confidence: 0.3, evidenceCount: 1, recentErrorKinds: ['wrong-answer'] }],
  };
}

describe('coach request validation', () => {
  it('accepts the version-one allowlisted contract', () => {
    expect(validateCoachRequest(request())).toMatchObject({ version: 1, hintLevel: 1, attempt: { language: 'python' } });
  });

  it('rejects unsupported versions, levels and oversized code', () => {
    expect(() => validateCoachRequest({ ...request(), version: 2 })).toThrow('Unsupported coach version');
    expect(() => validateCoachRequest({ ...request(), hintLevel: 5 })).toThrow('Invalid hint level');
    expect(() => validateCoachRequest({ ...request(), attempt: { ...request().attempt, code: 'x'.repeat(50_001) } })).toThrow('Coach code exceeds');
  });

  it('rejects hidden-test-shaped fields at any depth', () => {
    expect(() => validateCoachRequest({ ...request(), hiddenTests: ['secret'] })).toThrow('Hidden test data is forbidden');
    expect(() => validateCoachRequest({ ...request(), attempt: { ...request().attempt, evidence: { ...request().attempt.evidence, officialCases: [] } } })).toThrow('Hidden test data is forbidden');
    expect(() => validateCoachRequest({ ...request(), problem: { ...request().problem, expectedHiddenOutput: '42' } })).toThrow('Hidden test data is forbidden');
  });

  it('rejects unknown properties and reference solutions below level four', () => {
    expect(() => validateCoachRequest({ ...request(), surprise: true })).toThrow('Unknown coach field');
    expect(() => validateCoachRequest({ ...request(), referenceSolution: 'answer' })).toThrow('Reference solution requires level four');
  });
});

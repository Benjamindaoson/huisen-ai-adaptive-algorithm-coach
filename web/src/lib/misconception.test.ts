import { describe, expect, it } from 'vitest';
import { classifyMisconception } from './misconception';
import type { PracticeAttempt } from './practice';

function attempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(0)',
    outcome: 'wrong-answer', summary: '0/1', createdAt: '2026-08-12T00:00:00Z', ...overrides,
  };
}

describe('misconception classification', () => {
  it('uses compiler/runtime evidence to identify input parsing without reading hidden tests', () => {
    const result = classifyMisconception(attempt({
      outcome: 'runtime-error', codeSnapshot: 'parts = input.split()\nprint(parts)',
      evidence: { stderr: "TypeError: 'builtin_function_or_method' object has no attribute 'split'" },
    }));
    expect(result).toMatchObject({ id: 'input-parsing', confidence: 'high', authority: 'runtime-evidence', lessonId: 'input-output' });
    expect(result.evidenceRefs).toEqual(expect.arrayContaining(['attempt:a1:stderr', 'code:line:1']));
  });

  it('requires judge evidence before turning an index code shape into a supported boundary misconception', () => {
    const result = classifyMisconception(attempt({
      language: 'javascript', codeSnapshot: 'for(let i=0;i<=a.length;i++){ sum += a[i]; }',
      evidence: { failedCase: { name: 'case 1', stdin: '3\n1 2 3', expectedOutput: '6', actualOutput: 'NaN', verdict: 'wrong-answer' } },
    }));
    expect(result).toMatchObject({ id: 'off-by-one', confidence: 'medium', authority: 'judge-evidence', lessonId: 'arrays-strings' });
    expect(result.evidenceRefs).toEqual(expect.arrayContaining(['attempt:a1:failed-case', 'code:line:1']));
  });

  it('does not invent a concrete root cause when evidence is insufficient', () => {
    expect(classifyMisconception(attempt())).toMatchObject({ id: 'unknown', confidence: 'low', authority: 'insufficient', evidenceRefs: [] });
  });
});

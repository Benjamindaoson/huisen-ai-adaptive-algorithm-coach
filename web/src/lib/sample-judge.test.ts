import { describe, expect, it, vi } from 'vitest';
import type { RunResult } from './runner-client';
import { judgeSampleCases, normalizeProgramOutput } from './sample-judge';
import type { SampleTestCase } from './testcase';

const cases: SampleTestCase[] = [
  { id: 'sample-1', name: '示例 1', stdin: '1', expectedOutput: '2\n3' },
  { id: 'sample-2', name: '示例 2', stdin: '4', expectedOutput: '5' },
];

function result(overrides: Partial<RunResult> = {}): RunResult {
  return { kind: 'success', stdout: '', stderr: '', ...overrides };
}

describe('normalizeProgramOutput', () => {
  it('normalizes newlines, line-tail spaces and trailing blank lines', () => {
    expect(normalizeProgramOutput('2  \r\n3\t\r\n\r\n')).toBe('2\n3');
  });
});

describe('judgeSampleCases', () => {
  it('judges every case sequentially and reports a full pass', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(result({ stdout: '2\n3\n', timeMs: 3 }))
      .mockResolvedValueOnce(result({ stdout: '5', timeMs: 2 }));

    const submission = await judgeSampleCases(
      { language: 'python', sourceCode: 'print(1)' },
      cases,
      execute,
    );

    expect(execute.mock.calls.map(([request]) => request.stdin)).toEqual(['1', '4']);
    expect(submission.allPassed).toBe(true);
    expect(submission.cases.map((item) => item.verdict)).toEqual(['passed', 'passed']);
  });

  it('distinguishes wrong answers from runner errors', async () => {
    const execute = vi.fn()
      .mockResolvedValueOnce(result({ stdout: 'wrong' }))
      .mockResolvedValueOnce(result({ kind: 'compile-error', stderr: 'SyntaxError' }));

    const submission = await judgeSampleCases(
      { language: 'javascript', sourceCode: 'bad code' },
      cases,
      execute,
    );

    expect(submission.allPassed).toBe(false);
    expect(submission.cases[0]).toMatchObject({ verdict: 'wrong-answer', actualOutput: 'wrong' });
    expect(submission.cases[1]).toMatchObject({ verdict: 'compile-error', stderr: 'SyntaxError' });
  });

  it('preserves unavailable as infrastructure failure', async () => {
    const execute = vi.fn().mockResolvedValue(result({ kind: 'unavailable', stderr: 'offline' }));
    const submission = await judgeSampleCases(
      { language: 'cpp', sourceCode: 'int main(){}' },
      [cases[0]],
      execute,
    );
    expect(submission.cases[0].verdict).toBe('unavailable');
  });
});

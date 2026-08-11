import type { ProblemLanguage } from './catalog';
import type { RunRequest, RunResult } from './runner-client';
import type { SampleTestCase } from './testcase';

export type SampleVerdict = 'passed' | 'wrong-answer' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable';

export type SampleCaseResult = {
  caseId: string;
  name: string;
  verdict: SampleVerdict;
  stdin: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
  timeMs?: number;
};

export type SampleSubmissionResult = {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  cases: SampleCaseResult[];
};

export type SampleExecutor = (request: RunRequest, signal?: AbortSignal) => Promise<RunResult>;

export function normalizeProgramOutput(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

export async function judgeSampleCases(
  submission: { language: ProblemLanguage; sourceCode: string },
  testCases: SampleTestCase[],
  execute: SampleExecutor,
  signal?: AbortSignal,
): Promise<SampleSubmissionResult> {
  const caseResults: SampleCaseResult[] = [];

  for (const testCase of testCases) {
    const execution = await execute({ ...submission, stdin: testCase.stdin }, signal);
    const actualOutput = normalizeProgramOutput(execution.stdout);
    const expectedOutput = normalizeProgramOutput(testCase.expectedOutput);
    const verdict: SampleVerdict = execution.kind === 'success'
      ? (actualOutput === expectedOutput ? 'passed' : 'wrong-answer')
      : execution.kind;

    caseResults.push({
      caseId: testCase.id,
      name: testCase.name,
      verdict,
      stdin: testCase.stdin,
      expectedOutput: testCase.expectedOutput,
      actualOutput: execution.stdout,
      stderr: execution.stderr,
      timeMs: execution.timeMs,
    });
  }

  const passedCount = caseResults.filter((item) => item.verdict === 'passed').length;
  return {
    allPassed: caseResults.length > 0 && passedCount === caseResults.length,
    passedCount,
    totalCount: caseResults.length,
    cases: caseResults,
  };
}

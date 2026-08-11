import type { ProblemRecord } from './catalog';
import type { ExamProblemResult, ExamReport, ExamSession } from './exam';
import type { SampleExecutor } from './sample-judge';
import { judgeSampleCases } from './sample-judge';
import { publicSampleCasesForProblem } from './testcase';

const verdictSummary: Record<string, string> = {
  'wrong-answer': '公开样例输出不匹配。',
  'compile-error': '代码编译失败。',
  'runtime-error': '程序运行错误。',
  timeout: '程序运行超时。',
  unavailable: '判题服务暂不可用。',
};

export async function gradeExam(
  exam: ExamSession,
  problems: Record<string, ProblemRecord>,
  execute: SampleExecutor,
  submittedAt = Date.now(),
): Promise<ExamReport> {
  const results: ExamProblemResult[] = [];

  for (const problemId of exam.problemIds) {
    const answer = exam.answers[problemId];
    const problem = problems[problemId];
    if (!answer?.touched || !answer.sourceCode.trim()) {
      results.push({ problemId, verdict: 'unanswered', passedCount: 0, totalCount: 0, errorSummary: '未提交代码。' });
      continue;
    }
    if (!problem) {
      results.push({ problemId, verdict: 'error', passedCount: 0, totalCount: 0, errorSummary: '题目资料加载失败。' });
      continue;
    }
    const cases = publicSampleCasesForProblem(problem);
    if (!cases.length) {
      results.push({ problemId, verdict: 'unjudgeable', passedCount: 0, totalCount: 0, errorSummary: '资料中没有可判定的公开样例。' });
      continue;
    }

    const submission = await judgeSampleCases({ language: answer.language, sourceCode: answer.sourceCode }, cases, execute);
    const failed = submission.cases.find((item) => item.verdict !== 'passed');
    const serviceError = failed?.verdict === 'unavailable';
    results.push({
      problemId,
      verdict: submission.allPassed ? 'passed' : (serviceError ? 'error' : 'failed'),
      passedCount: submission.passedCount,
      totalCount: submission.totalCount,
      errorSummary: submission.allPassed ? '' : (verdictSummary[failed?.verdict ?? 'wrong-answer'] ?? '公开样例未通过。'),
    });
  }

  const passed = results.filter((result) => result.verdict === 'passed').length;
  return {
    submittedAt,
    durationUsedMs: Math.max(0, Math.min(submittedAt, exam.deadlineAt) - exam.startedAt),
    score: Math.round((passed / exam.problemIds.length) * 100),
    gradingScope: 'public-samples',
    results,
  };
}

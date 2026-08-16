import type { ProblemRecord } from './catalog';
import type { ExamDimension, ExamProblemResult, ExamReport, ExamReportDimensions, ExamSession } from './exam';
import type { SampleExecutor } from './sample-judge';
import { judgeSampleCases } from './sample-judge';
import { publicSampleCasesForProblem } from './testcase';
import type { DurableSubmission } from './platform-client';

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
    dimensions: buildExamReportDimensions(exam, results, Math.round((passed / exam.problemIds.length) * 100)),
  };
}

export type DurableExamSubmissionInput = { problemVersionId: string; language: 'python'|'javascript'|'java'|'cpp'; sourceCode: string; idempotencyKey: string };
export type DurableExamSubmitter = (input: DurableExamSubmissionInput) => Promise<DurableSubmission>;

export async function gradeExamWithDurableSubmissions(exam: ExamSession, submit: DurableExamSubmitter, submittedAt = Date.now()): Promise<ExamReport> {
  const results: ExamProblemResult[] = [];
  for (const problemId of exam.problemIds) {
    const answer = exam.answers[problemId];
    if (!answer?.touched || !answer.sourceCode.trim()) {
      results.push({ problemId, verdict: 'unanswered', passedCount: 0, totalCount: 0, errorSummary: '未提交代码。' });
      continue;
    }
    try {
      const idempotencyKey = `exam:${exam.id}:${problemId}:${answer.updatedAt}`.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 200);
      const aggregate = await submit({ problemVersionId: `${problemId}@starter-v1`, language: answer.language, sourceCode: answer.sourceCode, idempotencyKey });
      const verdict: ExamProblemResult['verdict'] = aggregate.status === 'passed' ? 'passed' : aggregate.status === 'failed' ? 'failed' : 'error';
      const errorSummary = verdict === 'passed' ? '' : aggregate.status === 'failed' ? '隐藏用例未全部通过。' : aggregate.error ?? (['queued', 'running'].includes(aggregate.status) ? '隐藏判题仍在处理，请稍后重试。' : '隐藏判题服务未能给出结论。');
      results.push({ problemId, verdict, passedCount: aggregate.passedCount, totalCount: aggregate.totalCount, errorSummary });
    } catch {
      results.push({ problemId, verdict: 'error', passedCount: 0, totalCount: 0, errorSummary: '隐藏判题服务暂不可用。' });
    }
  }
  const passed = results.filter((result) => result.verdict === 'passed').length;
  const score = Math.round((passed / exam.problemIds.length) * 100);
  return {
    submittedAt,
    durationUsedMs: Math.max(0, Math.min(submittedAt, exam.deadlineAt) - exam.startedAt),
    score,
    gradingScope: 'trusted-hidden',
    results,
    dimensions: buildExamReportDimensions(exam, results, score, 'trusted-hidden'),
  };
}

export function buildExamReportDimensions(exam: ExamSession, results: ExamProblemResult[], algorithmAbility: number, gradingScope: ExamReport['gradingScope'] = 'public-samples'): ExamReportDimensions {
  const answerEvidence = exam.problemIds.filter((problemId) => exam.answers[problemId]?.touched && exam.answers[problemId]?.sourceCode.trim())
    .map((problemId) => `answer:${problemId}`);
  const resultEvidence = results.map((result) => `result:${result.problemId}`);
  const notObserved = (rationale: string): ExamDimension => ({ status: 'not-observed', confidence: 'low', evidenceRefs: [], rationale });

  const verified = exam.collaborationEvents.flatMap((event) => event.evidence
    .filter((evidence) => evidence.source && evidence.artifactRef?.startsWith('exam-agent:'))
    .map((evidence) => ({ event, evidence })));
  const hasRuntime = (kind: string) => verified.some(({ evidence }) => evidence.source === 'agent-runtime' && evidence.kind === kind);
  const hasVerifiedReview = exam.collaborationEvents.some((event) => event.type === 'review'
    && event.evidence.some((evidence) => evidence.source === 'agent-runtime' && evidence.kind === 'diff' && evidence.artifactRef)
    && event.evidence.some((evidence) => evidence.source === 'learner-action' && evidence.kind === 'learner-decision' && evidence.artifactRef));
  const hasVerifiedOral = exam.collaborationEvents.some((event) => event.type === 'oral-explanation'
    && event.evidence.some((evidence) => evidence.source === 'agent-runtime' && evidence.artifactRef)
    && event.evidence.some((evidence) => evidence.source === 'learner-action' && evidence.kind === 'oral-response' && evidence.artifactRef));
  const collaborationChecks = [hasRuntime('prompt'), hasRuntime('tool-action'), hasVerifiedReview, hasRuntime('test'), hasVerifiedOral];
  const collaborationScore = collaborationChecks.filter(Boolean).length * 20;
  const collaborationRefs = [...new Set(verified.map(({ evidence }) => evidence.artifactRef).filter((ref): ref is string => Boolean(ref)))];

  return {
    algorithmAbility: { status: 'observed', value: algorithmAbility, confidence: gradingScope === 'trusted-hidden' ? 'high' : 'low', evidenceRefs: resultEvidence, rationale: gradingScope === 'trusted-hidden' ? 'Based on immutable aggregate verdicts from trusted hidden submissions.' : 'Based only on public-sample simulation results.' },
    independentCompletion: exam.mode === 'independent'
      ? { status: 'observed', value: Math.round((answerEvidence.length / exam.problemIds.length) * 100), confidence: 'high', evidenceRefs: answerEvidence, rationale: 'Independent mode explicitly disabled AI assistance.' }
      : notObserved('AI-collaboration mode does not establish independent completion.'),
    hintDependence: notObserved('This exam session did not collect hint-use evidence.'),
    aiCollaboration: collaborationScore > 0
      ? { status: 'observed', value: collaborationScore, confidence: collaborationScore === 100 ? 'high' : collaborationScore >= 60 ? 'medium' : 'low', evidenceRefs: collaborationRefs, rationale: 'Rubric score from runtime-bound planning, tool delegation, diff review, executed testing, and oral defense evidence.' }
      : notObserved('No AI-collaboration evidence was recorded for this exam.'),
  };
}

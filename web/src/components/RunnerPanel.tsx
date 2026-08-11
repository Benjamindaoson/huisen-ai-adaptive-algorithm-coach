import { useEffect, useState } from 'react';
import type { ProblemLanguage, ProblemRecord } from '../lib/catalog';
import type { SkillMastery } from '../lib/mastery';
import type { AttemptFailedCase, AttemptOutcome, PracticeAttempt } from '../lib/practice';
import { hasRunnableSource, resolveRunnerUrl, runCode, type RunResult } from '../lib/runner-client';
import { judgeSampleCases, type SampleSubmissionResult } from '../lib/sample-judge';
import type { SampleTestCase } from '../lib/testcase';
import { recordTelemetry } from '../lib/telemetry';
import { CoachPanel } from './CoachPanel';
import type { HintLevel } from '../lib/coach';
import { SubmissionFeedback } from './SubmissionFeedback';
import { MentorTimeline } from './MentorTimeline';

type Props = {
  problem: ProblemRecord;
  language: ProblemLanguage;
  sourceCode: string;
  sampleCases: SampleTestCase[];
  attempts: PracticeAttempt[];
  mastery: SkillMastery[];
  onAttempt: (attempt: PracticeAttempt) => void;
  onReference: () => void;
  onIntervention?: (kind: 'hint-requested' | 'hint-received', level: HintLevel, attemptId: string) => void;
  learnerId?: string;
  remediation?: { lessonId: string; title: string; reason: string } | null;
  onLearn?: (lessonId: string) => void;
};

type VisibleResult = { mode: 'run'; value: RunResult } | { mode: 'sample-submit'; value: SampleSubmissionResult };
type ActivePanel = 'testcase' | 'result' | 'history' | 'coach';

function attemptId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function runOutcome(result: RunResult): AttemptOutcome {
  return result.kind === 'success' ? 'executed' : result.kind;
}

function runTitle(result: RunResult): string {
  if (result.kind === 'success') return `运行完成${result.timeMs !== undefined ? ` · ${result.timeMs} ms` : ''}`;
  if (result.kind === 'timeout') return '运行超时';
  if (result.kind === 'compile-error') return '编译错误';
  if (result.kind === 'unavailable') return '执行服务不可用';
  return '运行错误';
}

function boundedOutput(value: string): string {
  return value.slice(0, 32_000);
}

export function RunnerPanel({ problem, language, sourceCode, sampleCases, attempts, mastery, onAttempt, onReference, onIntervention, learnerId, remediation, onLearn }: Props) {
  const [stdin, setStdin] = useState(sampleCases[0]?.stdin ?? '');
  const [result, setResult] = useState<VisibleResult | null>(null);
  const [busyMode, setBusyMode] = useState<'run' | 'sample-submit' | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('testcase');
  const [selectedAttempt, setSelectedAttempt] = useState<PracticeAttempt | undefined>();
  const configuredRunner = import.meta.env.VITE_RUNNER_URL as string | undefined;
  const configuredCoach = (import.meta.env.VITE_COACH_URL as string | undefined)?.trim() ?? '';
  const configuredAgent = (import.meta.env.VITE_LEARNING_API_URL as string | undefined)?.trim() ?? '';
  const runnerUrl = resolveRunnerUrl(configuredRunner);

  useEffect(() => {
    setStdin(sampleCases[0]?.stdin ?? '');
    setResult(null);
    setSelectedAttempt(undefined);
    setActivePanel('testcase');
  }, [problem.id, language, sampleCases]);

  async function run() {
    setBusyMode('run');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const nextResult = await runCode(runnerUrl, { language, sourceCode, stdin }, controller.signal);
      setResult({ mode: 'run', value: nextResult });
      setActivePanel('result');
      const practiceAttempt: PracticeAttempt = {
        id: attemptId(), problemId: problem.id, language, mode: 'run', codeSnapshot: sourceCode,
        outcome: runOutcome(nextResult), summary: runTitle(nextResult), createdAt: new Date().toISOString(),
        evidence: { stdout: boundedOutput(nextResult.stdout), stderr: boundedOutput(nextResult.stderr), ...(nextResult.timeMs !== undefined ? { timeMs: nextResult.timeMs } : {}) },
      };
      setSelectedAttempt(practiceAttempt);
      onAttempt(practiceAttempt);
      recordTelemetry(window.localStorage, { name: 'practice-run', problemId: problem.id, language, outcome: practiceAttempt.outcome, durationMs: nextResult.timeMs });
    } finally {
      window.clearTimeout(timeout);
      setBusyMode(null);
    }
  }

  async function submitSamples() {
    setBusyMode('sample-submit');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const submission = await judgeSampleCases(
        { language, sourceCode },
        sampleCases,
        (request, signal) => runCode(runnerUrl, request, signal),
        controller.signal,
      );
      setResult({ mode: 'sample-submit', value: submission });
      setActivePanel('result');
      const failedVerdict = submission.cases.find((item) => item.verdict !== 'passed')?.verdict;
      const failedCase = submission.cases.find((item) => item.verdict !== 'passed');
      const reviewableVerdicts: AttemptFailedCase['verdict'][] = ['wrong-answer', 'compile-error', 'runtime-error', 'timeout'];
      const failedCaseEvidence: AttemptFailedCase | undefined = failedCase && reviewableVerdicts.includes(failedCase.verdict as AttemptFailedCase['verdict']) ? {
        name: failedCase.name,
        stdin: failedCase.stdin.slice(0, 10_000),
        expectedOutput: boundedOutput(failedCase.expectedOutput),
        actualOutput: boundedOutput(failedCase.actualOutput),
        verdict: failedCase.verdict as AttemptFailedCase['verdict'],
      } : undefined;
      const practiceAttempt: PracticeAttempt = {
        id: attemptId(), problemId: problem.id, language, mode: 'sample-submit', codeSnapshot: sourceCode,
        outcome: submission.allPassed ? 'passed' : (failedVerdict ?? 'wrong-answer'),
        summary: submission.allPassed ? `公开样例 ${submission.passedCount}/${submission.totalCount} 通过` : `公开样例 ${submission.passedCount}/${submission.totalCount} 通过`,
        passedCount: submission.passedCount, totalCount: submission.totalCount, createdAt: new Date().toISOString(),
        evidence: {
          ...(failedCase?.stderr ? { stderr: boundedOutput(failedCase.stderr) } : {}),
          ...(failedCase?.timeMs !== undefined ? { timeMs: failedCase.timeMs } : {}),
          ...(failedCaseEvidence ? { failedCase: failedCaseEvidence } : {}),
        },
      };
      setSelectedAttempt(practiceAttempt);
      onAttempt(practiceAttempt);
      recordTelemetry(window.localStorage, { name: 'practice-submit', problemId: problem.id, language, outcome: practiceAttempt.outcome, durationMs: submission.cases.reduce((total, item) => total + (item.timeMs ?? 0), 0) });
    } finally {
      window.clearTimeout(timeout);
      setBusyMode(null);
    }
  }

  const runnable = hasRunnableSource(sourceCode);
  const recentAttempts = [...attempts].reverse().slice(0, 8);
  const coachAttempt = selectedAttempt ?? recentAttempts.find((attempt) => !['passed', 'executed', 'unavailable'].includes(attempt.outcome)) ?? recentAttempts[0];

  return (
    <section className="runner-panel" aria-labelledby="runner-title">
      <div className="runner-toolbar">
        <div className="runner-tabs" role="tablist" aria-label="测试面板">
          <button id="runner-title" type="button" role="tab" aria-selected={activePanel === 'testcase'} className={activePanel === 'testcase' ? 'selected' : ''} onClick={() => setActivePanel('testcase')}>测试用例</button>
          <button type="button" role="tab" aria-selected={activePanel === 'result'} className={activePanel === 'result' ? 'selected' : ''} onClick={() => setActivePanel('result')}>执行结果{result && <i />}</button>
          <button type="button" role="tab" aria-selected={activePanel === 'history'} className={activePanel === 'history' ? 'selected' : ''} onClick={() => setActivePanel('history')}>尝试记录{attempts.length ? ` ${attempts.length}` : ''}</button>
          {!configuredAgent && <button type="button" role="tab" aria-selected={activePanel === 'coach'} className={activePanel === 'coach' ? 'selected' : ''} onClick={() => setActivePanel('coach')}>AI 教练</button>}
        </div>
        <div className="runner-actions">
          <button type="button" className="secondary-button" disabled={!runnable || busyMode !== null} onClick={run}>{busyMode === 'run' ? '运行中…' : '▶ 运行'}</button>
          <button type="button" className="primary-button" title={sampleCases.length ? '执行所有可判定的公开样例' : '当前资料没有可判定的公开样例'} disabled={!runnable || busyMode !== null || sampleCases.length === 0} onClick={submitSamples}>{busyMode === 'sample-submit' ? '判题中…' : '样例提交'}</button>
        </div>
      </div>

      {remediation && <aside className="learning-remediation-card" aria-label="补一节再回来">
        <span>学习支持 · 未确认具体错因</span><div><strong>补一节：{remediation.title}</strong><p>{remediation.reason}</p></div>
        <button type="button" onClick={() => onLearn?.(remediation.lessonId)}>先学 15 分钟 →</button>
      </aside>}

      {configuredAgent && learnerId && <MentorTimeline learnerId={learnerId} agentUrl={configuredAgent} problem={problem} attempt={coachAttempt} sampleCases={sampleCases} />}

      {activePanel === 'testcase' && <div className="testcase-panel" role="tabpanel">
        <label className="field-label">自定义标准输入
          <textarea value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="在此粘贴标准输入" rows={4} />
        </label>
        <p className="runner-ready">“运行”只执行当前输入；“样例提交”会核对 {sampleCases.length} 个公开样例。</p>
        {!sampleCases.length && <p className="sample-warning">当前资料没有同时包含输入和预期输出的样例，因此只能运行，不能判定通过。</p>}
      </div>}

      {activePanel === 'result' && <div className="result-panel" role="tabpanel" aria-live="polite">
        {!result && <p className="result-placeholder">尚未执行代码。运行自定义输入，或提交全部公开样例。</p>}
        {result?.mode === 'run' && <div className={`run-result ${result.value.kind}`}>
          <strong>{runTitle(result.value)}</strong>
          {result.value.stdout && <><span className="output-label">标准输出</span><pre>{result.value.stdout}</pre></>}
          {result.value.stderr && <pre className="stderr">{result.value.stderr}</pre>}
          <small>本次仅运行自定义输入，不代表题目通过。</small>
        </div>}
        {result?.mode === 'sample-submit' && coachAttempt && <SubmissionFeedback submission={result.value} attempt={coachAttempt} problem={problem} mastery={mastery} onRetry={() => setActivePanel('testcase')} onHint={() => setActivePanel(configuredAgent ? 'result' : 'coach')} onReference={onReference} />}
      </div>}

      {activePanel === 'history' && <div className="history-panel" role="tabpanel">
        {!recentAttempts.length && <p className="result-placeholder">还没有尝试记录。每次运行或样例提交都会保留代码快照与结果。</p>}
        {recentAttempts.map((attempt) => <div className="attempt-row" key={attempt.id}><span className={`attempt-outcome ${attempt.outcome}`} /> <div><strong>{attempt.mode === 'run' ? '运行' : '样例提交'}</strong><small>{attempt.summary}</small></div><time>{new Date(attempt.createdAt).toLocaleString('zh-CN')}</time></div>)}
      </div>}
      {activePanel === 'coach' && <div role="tabpanel"><CoachPanel problem={problem} attempt={coachAttempt} mastery={mastery} coachUrl={configuredCoach} agentUrl={configuredAgent} onIntervention={onIntervention} /></div>}
    </section>
  );
}

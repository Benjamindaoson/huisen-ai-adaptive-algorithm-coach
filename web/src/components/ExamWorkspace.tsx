import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProblemLanguage, ProblemRecord } from '../lib/catalog';
import { runExamAgentTurn, type ExamAgentPhase, type ExamAgentTurn } from '../lib/exam-agent-client';
import { gradeExam, gradeExamWithDurableSubmissions, type DurableExamSubmitter } from '../lib/exam-grading';
import { getExamModePolicy, remainingExamMs, selectExamProblem, setExamAnswerLanguage, submitExam, updateExamAnswer, type ExamDimension, type ExamEvidence, type ExamReport, type ExamSession, type ExamVerdict } from '../lib/exam';
import { recordCollaborationEvent } from '../lib/exam-collaboration';
import { resolveLearningApiUrl } from '../lib/learning-client';
import { getProblemViewSections } from '../lib/problem-view';
import { hasRunnableSource, resolveRunnerUrl, runCode, type RunResult } from '../lib/runner-client';
import { getSkill, inferProblemSkills } from '../lib/skills';
import { recordTelemetry } from '../lib/telemetry';
import { CodeEditor } from './CodeEditor';

type Props = {
  session: ExamSession;
  problems: Record<string, ProblemRecord>;
  onChange: (session: ExamSession) => void;
  onExit: () => void;
  onRestart: () => void;
  agentBaseUrl?: string;
  submitHidden?: DurableExamSubmitter;
};

const languageNames: Record<ProblemLanguage, string> = { java: 'Java', python: 'Python', javascript: 'JavaScript', cpp: 'C++' };
const verdictLabels: Record<ExamVerdict, string> = { passed: '公开样例通过', failed: '公开样例未通过', unanswered: '未作答', unjudgeable: '无法判定', error: '判题异常' };

function starterCode(language: ProblemLanguage): string {
  if (language === 'python') return 'def solve():\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    solve()\n';
  if (language === 'javascript') return "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// 在这里编写你的代码\n";
  if (language === 'java') return 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        // 在这里编写你的代码\n    }\n}\n';
  return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // 在这里编写你的代码\n    return 0;\n}\n';
}

function formatClock(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1_000);
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  return `${minutes} 分 ${seconds} 秒`;
}

const dimensionLabels: Record<keyof ExamReport['dimensions'], string> = {
  algorithmAbility: 'Algorithm ability',
  independentCompletion: 'Independent completion',
  hintDependence: 'Hint dependence',
  aiCollaboration: 'AI collaboration',
};

function ExamDimensionCard({ label, dimension }: { label: string; dimension: ExamDimension }) {
  return <article className="exam-dimension-card">
    <strong>{label}</strong>
    <span>{dimension.status === 'observed' ? 'Observed' : 'Not observed'}</span>
    {dimension.status === 'observed' && dimension.value !== undefined && <b>{dimension.value}</b>}
    <small>{dimension.rationale}</small>
    {dimension.evidenceRefs.length > 0 && <p>{dimension.evidenceRefs.join(' · ')}</p>}
  </article>;
}

function ExamReportView({ session, problems, onExit, onRestart }: Pick<Props, 'session' | 'problems' | 'onExit' | 'onRestart'>) {
  const report = session.report;
  if (!report) return null;
  const trustedHidden = report.gradingScope === 'trusted-hidden';
  const skillGaps = [...new Set(report.results
    .filter((result) => result.verdict === 'failed')
    .flatMap((result) => {
      const problem = problems[result.problemId];
      return problem ? inferProblemSkills({ title: problem.title, excerpt: problem.sections.description, searchText: '' }).map((skill) => getSkill(skill).title) : [];
    }))];
  return <section className="exam-report" aria-label="考试报告">
    <header className="exam-report-hero">
      <div><p className="eyebrow">MOCK EXAM REPORT</p><h1>本场考试报告</h1><p>{trustedHidden ? '结果来自服务端不可变提交与可信隐藏用例的汇总判定；隐藏输入和答案不会发送到浏览器。' : '当前只用题库中的公开样例评分，结果用于学习诊断，不代表隐藏用例 AC。'}</p></div>
      <div className="exam-score"><strong>{report.score}</strong><span>{trustedHidden ? '可信隐藏判题分' : '公开样例模拟分'}</span></div>
    </header>
    <div className="exam-report-meta"><span>用时 <b>{formatDuration(report.durationUsedMs)}</b></span><span>通过 <b>{report.results.filter((item) => item.verdict === 'passed').length}/{report.results.length}</b></span><span className="scope-warning">{trustedHidden ? '隐藏用例仅在私有判题域执行' : '不代表隐藏用例 AC'}</span></div>
    <section className="exam-report-dimensions" aria-label="Evidence dimensions">
      {(Object.keys(dimensionLabels) as Array<keyof ExamReport['dimensions']>).map((key) => <ExamDimensionCard key={key} label={dimensionLabels[key]} dimension={report.dimensions[key]} />)}
    </section>
    <div className="exam-result-list">
      {report.results.map((result, index) => <article key={result.problemId} className={`exam-result-card ${result.verdict}`}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{problems[result.problemId]?.title ?? result.problemId}</strong><small>{result.errorSummary || `${trustedHidden ? '隐藏用例' : '公开样例'} ${result.passedCount}/${result.totalCount} 通过`}</small></div>
        <b>{verdictLabels[result.verdict]}</b>
      </article>)}
    </div>
    <section className="exam-next-step"><div><p className="eyebrow">NEXT STEP</p><h2>先复盘未通过题，再开始下一场</h2><p>回到练习空间后，可使用尝试记录和 AI 教练逐层定位错误；考试过程本身不会展示题解。</p>{skillGaps.length > 0 && <div className="exam-skill-gaps"><small>本场暴露的技能缺口</small>{skillGaps.map((skill) => <span key={skill}>{skill}</span>)}</div>}</div><div><button type="button" className="secondary-button" onClick={onExit}>返回学习空间</button><button type="button" className="primary-button" onClick={onRestart}>开始新考试</button></div></section>
  </section>;
}

export function ExamWorkspace({ session, problems, onChange, onExit, onRestart, agentBaseUrl, submitHidden }: Props) {
  const [now, setNow] = useState(Date.now());
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [collaborationType, setCollaborationType] = useState<ExamAgentPhase>('plan');
  const [collaborationPrompt, setCollaborationPrompt] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentTurn, setAgentTurn] = useState<ExamAgentTurn | null>(null);
  const submitting = useRef(false);
  const runnerUrl = resolveRunnerUrl(import.meta.env.VITE_RUNNER_URL as string | undefined);
  const learningApiUrl = agentBaseUrl ?? resolveLearningApiUrl();
  const currentProblem = problems[session.currentProblemId];
  const languages = useMemo(() => currentProblem ? Object.keys(currentProblem.solutions) as ProblemLanguage[] : [], [currentProblem]);
  const answer = session.answers[session.currentProblemId];
  const modePolicy = getExamModePolicy(session);
  const language = answer?.language ?? languages[0] ?? 'python';
  const sourceCode = answer?.sourceCode ?? starterCode(language);
  const remaining = remainingExamMs(session, now);

  useEffect(() => {
    if (session.status !== 'running') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  useEffect(() => { setStdin(''); setRunResult(null); setAgentTurn(null); }, [session.currentProblemId]);

  const submit = useCallback(async () => {
    if (session.status !== 'running' || submitting.current) return;
    submitting.current = true;
    setBusy('submit');
    try {
      const report = submitHidden
        ? await gradeExamWithDurableSubmissions(session, submitHidden)
        : await gradeExam(session, problems, (request, signal) => runCode(runnerUrl, request, signal));
      recordTelemetry(window.localStorage, { name: 'exam-submit', outcome: `${report.score}`, durationMs: report.durationUsedMs });
      onChange(submitExam(session, report));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }, [onChange, problems, runnerUrl, session, submitHidden]);

  useEffect(() => {
    if (session.status === 'running' && remaining === 0) void submit();
  }, [remaining, session.status, submit]);

  if (session.status === 'submitted') return <ExamReportView session={session} problems={problems} onExit={onExit} onRestart={onRestart} />;

  async function runCustomInput() {
    if (!hasRunnableSource(sourceCode) || busy) return;
    setBusy('run');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      setRunResult(await runCode(runnerUrl, { language, sourceCode, stdin }, controller.signal));
    } finally {
      window.clearTimeout(timeout);
      setBusy(null);
    }
  }

  function changeLanguage(next: ProblemLanguage) {
    onChange(setExamAnswerLanguage(session, session.currentProblemId, next, starterCode(next)));
  }

  const visibleSections = currentProblem ? getProblemViewSections('description', currentProblem.sections) : [];
  const answeredCount = session.problemIds.filter((id) => session.answers[id]?.touched && session.answers[id]?.sourceCode.trim()).length;

  function runtimeEvidence(turn: ExamAgentTurn): ExamEvidence[] {
    return turn.evidence.map((item) => ({ ...item }));
  }

  function persistRuntimeTurn(turn: ExamAgentTurn) {
    if (turn.mode !== 'deepseek' || !turn.evidence.length || turn.proposedDiff) return;
    const evidence = runtimeEvidence(turn);
    if (collaborationType === 'oral-explanation') evidence.push({
      id: `${turn.runId}:learner-oral`, kind: 'oral-response', summary: collaborationPrompt.trim(), source: 'learner-action', artifactRef: `exam-agent:${turn.runId}:oral-response`,
    });
    try {
      onChange(recordCollaborationEvent(session, { id: turn.runId, type: collaborationType, recordedAt: Date.now(), problemId: session.currentProblemId, evidence }));
      setCollaborationPrompt('');
    } catch {
      // The runtime may not have gathered the required artifact for this phase yet.
    }
  }

  async function executeAgentTurn() {
    if (!currentProblem || !collaborationPrompt.trim() || agentBusy || session.mode !== 'ai-collaboration') return;
    setAgentBusy(true);
    try {
      const turn = await runExamAgentTurn(learningApiUrl, {
        version: 1, sessionId: session.id, phase: collaborationType,
        problem: { id: currentProblem.id, title: currentProblem.title, description: currentProblem.sections.description ?? '题目描述未提供', input: currentProblem.sections.input ?? '', output: currentProblem.sections.output ?? '' },
        answer: { language, sourceCode }, learnerPrompt: collaborationPrompt.trim(),
      });
      setAgentTurn(turn);
      persistRuntimeTurn(turn);
    } finally { setAgentBusy(false); }
  }

  function decideProposedDiff(decision: 'accept' | 'reject') {
    if (!agentTurn?.proposedDiff || agentTurn.mode !== 'deepseek') return;
    const evidence: ExamEvidence[] = [...runtimeEvidence(agentTurn), {
      id: `${agentTurn.runId}:decision:${decision}`, kind: 'learner-decision', summary: decision === 'accept' ? '学习者检查后接受该修改。' : '学习者检查后拒绝该修改。',
      source: 'learner-action', artifactRef: `exam-agent:${agentTurn.runId}:decision:${decision}`,
    }];
    const next = decision === 'accept'
      ? updateExamAnswer(session, session.currentProblemId, language, agentTurn.proposedDiff.replacementSource)
      : session;
    onChange(recordCollaborationEvent(next, { id: agentTurn.runId, type: 'review', recordedAt: Date.now(), problemId: session.currentProblemId, evidence }));
    setCollaborationPrompt('');
    setAgentTurn(null);
  }

  return <section className="exam-workspace" aria-label="模拟考试工作台">
    <header className="exam-toolbar">
      <div><button type="button" className="exam-exit" onClick={onExit}>← 暂离</button><span>OD 模拟考试</span><em>{submitHidden ? '私有隐藏判题' : '公开样例评分'}</em><p>{modePolicy.mode === 'independent' ? 'Independent mode · AI assistance disabled' : 'AI collaboration mode · bounded evidence'}</p></div>
      <div className={`exam-timer ${remaining < 10 * 60_000 ? 'urgent' : ''}`}><small>剩余时间</small><strong>{formatClock(remaining)}</strong></div>
      <button type="button" className="exam-submit" disabled={busy !== null} onClick={() => setConfirmingSubmit(true)}>{busy === 'submit' ? '正在判题…' : `提交考试 · ${answeredCount}/${session.problemIds.length}`}</button>
    </header>

    {confirmingSubmit && <div className="exam-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="exam-submit-title">
      <section className="exam-submit-dialog"><span>FINAL SUBMISSION</span><h2 id="exam-submit-title">确认提交考试</h2><p>{submitHidden ? '提交后不能继续修改。代码会创建不可变服务端提交，并仅返回隐藏用例汇总结果。' : '提交后不能继续修改。本场只按已审核的公开样例生成模拟分，不代表隐藏用例 AC。'}</p><div><button type="button" className="secondary-button" onClick={() => setConfirmingSubmit(false)}>继续答题</button><button type="button" className="primary-button" onClick={() => { setConfirmingSubmit(false); void submit(); }}>确认并提交</button></div></section>
    </div>}

    <div className="exam-body">
      <nav className="exam-question-nav" aria-label="考试题目">
        {session.problemIds.map((problemId, index) => <button type="button" key={problemId} className={problemId === session.currentProblemId ? 'selected' : ''} onClick={() => onChange(selectExamProblem(session, problemId))}><span>{index + 1}</span><i className={session.answers[problemId]?.touched && session.answers[problemId]?.sourceCode.trim() ? 'answered' : ''} /></button>)}
      </nav>

      <section className="exam-problem-pane" aria-label="考试题目内容">
        {!currentProblem && <p className="loading">正在加载题目…</p>}
        {currentProblem && <div className="exam-problem-scroll"><header><div><span>{currentProblem.score ? `${currentProblem.score} 分` : '分值未标注'}</span><span>第 {session.problemIds.indexOf(currentProblem.id) + 1} 题</span></div><h1>{currentProblem.title}</h1></header><div className="reader-content">{visibleSections.map(([key, title, content]) => <section className="book-section" key={key}><h2>{title}</h2><pre>{content}</pre></section>)}</div></div>}
      </section>

      <aside className="exam-code-pane" aria-label="考试代码区">
        <header className="editor-pane-header"><strong><span>&lt;/&gt;</span> Code</strong><div className="language-tabs" aria-label="编程语言">{languages.map((item) => <button type="button" key={item} className={item === language ? 'selected' : ''} onClick={() => changeLanguage(item)}>{languageNames[item]}</button>)}</div></header>
        {currentProblem && languages.length > 0 ? <><CodeEditor language={language} value={sourceCode} onChange={(value) => onChange(updateExamAnswer(session, session.currentProblemId, language, value))} height="min(56vh, 610px)" />
          <section className="exam-runner"><div><label className="field-label">自定义标准输入<textarea rows={4} value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="仅用于调试，不计入考试评分" /></label><button type="button" className="secondary-button" disabled={!hasRunnableSource(sourceCode) || busy !== null} onClick={() => void runCustomInput()}>{busy === 'run' ? '运行中…' : '▶ 运行'}</button></div>{runResult && <div className={`exam-run-result ${runResult.kind}`}><strong>{runResult.kind === 'success' ? '运行完成' : '运行失败'}</strong><pre>{runResult.stdout || runResult.stderr || '无输出'}</pre></div>}<p>{submitHidden ? '考试提交时将进入私有隐藏判题；这里的自定义运行不会直接计分。' : '考试提交时将统一核对公开样例；这里的运行结果不会直接计分。'}</p></section></> : <p className="editor-empty">当前题目没有可运行语言。</p>}
        {session.mode === 'ai-collaboration' && <section className="exam-collaboration-evidence" aria-label="AI collaboration evidence"><h2>AI 协作 Mentor</h2><p>Mentor 会实际检查代码、运行测试或提出待审 diff。只有运行时证据和你的接受/拒绝决策才计入报告。</p><div className="collaboration-recorder"><label>协作阶段<select aria-label="协作阶段" value={collaborationType} onChange={(event) => { setCollaborationType(event.target.value as ExamAgentPhase); setAgentTurn(null); }}><option value="plan">计划</option><option value="delegation">委派</option><option value="review">代码审查</option><option value="test">测试</option><option value="correction">纠错</option><option value="oral-explanation">口述追问</option></select></label><label>给 Mentor 的任务<textarea aria-label="给 Mentor 的任务" value={collaborationPrompt} onChange={(event) => setCollaborationPrompt(event.target.value)} placeholder={collaborationType === 'oral-explanation' ? '写下你的口述回答，让 Mentor 追问验证' : '明确希望 Mentor 检查、执行或验证什么'} /></label><button type="button" className="secondary-button" disabled={!collaborationPrompt.trim() || agentBusy} onClick={() => void executeAgentTurn()}>{agentBusy ? 'Mentor 正在执行…' : '让 Mentor 执行证据轮次'}</button></div>
          {agentTurn && <article className={`exam-agent-turn ${agentTurn.mode}`}><strong>{agentTurn.mode === 'deepseek' ? '已验证的 Agent 轮次' : '本轮不可用'}</strong><p>{agentTurn.message}</p>{agentTurn.executions.length > 0 && <ul>{agentTurn.executions.map((execution) => <li key={execution.id}><b>{execution.tool}</b><span>{execution.summary}</span></li>)}</ul>}{agentTurn.oralQuestion && <p><b>口述追问：</b>{agentTurn.oralQuestion}</p>}{agentTurn.proposedDiff && <section className="exam-agent-diff"><p>{agentTurn.proposedDiff.rationale}</p><pre>{agentTurn.proposedDiff.replacementSource}</pre><div><button type="button" className="secondary-button" onClick={() => decideProposedDiff('reject')}>拒绝修改</button><button type="button" className="primary-button" onClick={() => decideProposedDiff('accept')}>接受修改</button></div></section>}</article>}
          {session.collaborationEvents.length ? <ul>{session.collaborationEvents.map((event) => <li key={event.id}><strong>{event.type}</strong>{event.evidence.map((evidence) => <span key={evidence.id}>{evidence.summary}</span>)}</li>)}</ul> : <p>尚无可计分的 Agent 运行证据。</p>}</section>}
      </aside>
    </div>
  </section>;
}

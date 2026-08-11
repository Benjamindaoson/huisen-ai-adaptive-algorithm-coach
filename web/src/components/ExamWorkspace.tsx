import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProblemLanguage, ProblemRecord } from '../lib/catalog';
import { gradeExam } from '../lib/exam-grading';
import { remainingExamMs, selectExamProblem, setExamAnswerLanguage, submitExam, updateExamAnswer, type ExamSession, type ExamVerdict } from '../lib/exam';
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

function ExamReportView({ session, problems, onExit, onRestart }: Pick<Props, 'session' | 'problems' | 'onExit' | 'onRestart'>) {
  const report = session.report;
  if (!report) return null;
  const skillGaps = [...new Set(report.results
    .filter((result) => result.verdict === 'failed')
    .flatMap((result) => {
      const problem = problems[result.problemId];
      return problem ? inferProblemSkills({ title: problem.title, excerpt: problem.sections.description, searchText: '' }).map((skill) => getSkill(skill).title) : [];
    }))];
  return <section className="exam-report" aria-label="考试报告">
    <header className="exam-report-hero">
      <div><p className="eyebrow">MOCK EXAM REPORT</p><h1>本场考试报告</h1><p>当前只用题库中的公开样例评分，结果用于学习诊断，不代表隐藏用例 AC。</p></div>
      <div className="exam-score"><strong>{report.score}</strong><span>公开样例模拟分</span></div>
    </header>
    <div className="exam-report-meta"><span>用时 <b>{formatDuration(report.durationUsedMs)}</b></span><span>通过 <b>{report.results.filter((item) => item.verdict === 'passed').length}/{report.results.length}</b></span><span className="scope-warning">不代表隐藏用例 AC</span></div>
    <div className="exam-result-list">
      {report.results.map((result, index) => <article key={result.problemId} className={`exam-result-card ${result.verdict}`}>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <div><strong>{problems[result.problemId]?.title ?? result.problemId}</strong><small>{result.errorSummary || `公开样例 ${result.passedCount}/${result.totalCount} 通过`}</small></div>
        <b>{verdictLabels[result.verdict]}</b>
      </article>)}
    </div>
    <section className="exam-next-step"><div><p className="eyebrow">NEXT STEP</p><h2>先复盘未通过题，再开始下一场</h2><p>回到练习空间后，可使用尝试记录和 AI 教练逐层定位错误；考试过程本身不会展示题解。</p>{skillGaps.length > 0 && <div className="exam-skill-gaps"><small>本场暴露的技能缺口</small>{skillGaps.map((skill) => <span key={skill}>{skill}</span>)}</div>}</div><div><button type="button" className="secondary-button" onClick={onExit}>返回学习空间</button><button type="button" className="primary-button" onClick={onRestart}>开始新考试</button></div></section>
  </section>;
}

export function ExamWorkspace({ session, problems, onChange, onExit, onRestart }: Props) {
  const [now, setNow] = useState(Date.now());
  const [stdin, setStdin] = useState('');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const submitting = useRef(false);
  const runnerUrl = resolveRunnerUrl(import.meta.env.VITE_RUNNER_URL as string | undefined);
  const currentProblem = problems[session.currentProblemId];
  const languages = useMemo(() => currentProblem ? Object.keys(currentProblem.solutions) as ProblemLanguage[] : [], [currentProblem]);
  const answer = session.answers[session.currentProblemId];
  const language = answer?.language ?? languages[0] ?? 'python';
  const sourceCode = answer?.sourceCode ?? starterCode(language);
  const remaining = remainingExamMs(session, now);

  useEffect(() => {
    if (session.status !== 'running') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  useEffect(() => { setStdin(''); setRunResult(null); }, [session.currentProblemId]);

  const submit = useCallback(async () => {
    if (session.status !== 'running' || submitting.current) return;
    submitting.current = true;
    setBusy('submit');
    try {
      const report = await gradeExam(session, problems, (request, signal) => runCode(runnerUrl, request, signal));
      recordTelemetry(window.localStorage, { name: 'exam-submit', outcome: `${report.score}`, durationMs: report.durationUsedMs });
      onChange(submitExam(session, report));
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }, [onChange, problems, runnerUrl, session]);

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

  return <section className="exam-workspace" aria-label="模拟考试工作台">
    <header className="exam-toolbar">
      <div><button type="button" className="exam-exit" onClick={onExit}>← 暂离</button><span>OD 模拟考试</span><em>公开样例评分</em></div>
      <div className={`exam-timer ${remaining < 10 * 60_000 ? 'urgent' : ''}`}><small>剩余时间</small><strong>{formatClock(remaining)}</strong></div>
      <button type="button" className="exam-submit" disabled={busy !== null} onClick={() => setConfirmingSubmit(true)}>{busy === 'submit' ? '正在判题…' : `提交考试 · ${answeredCount}/${session.problemIds.length}`}</button>
    </header>

    {confirmingSubmit && <div className="exam-submit-backdrop" role="dialog" aria-modal="true" aria-labelledby="exam-submit-title">
      <section className="exam-submit-dialog"><span>FINAL SUBMISSION</span><h2 id="exam-submit-title">确认提交考试</h2><p>提交后不能继续修改。本场只按已审核的公开样例生成模拟分，不代表隐藏用例 AC。</p><div><button type="button" className="secondary-button" onClick={() => setConfirmingSubmit(false)}>继续答题</button><button type="button" className="primary-button" onClick={() => { setConfirmingSubmit(false); void submit(); }}>确认并提交</button></div></section>
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
          <section className="exam-runner"><div><label className="field-label">自定义标准输入<textarea rows={4} value={stdin} onChange={(event) => setStdin(event.target.value)} placeholder="仅用于调试，不计入考试评分" /></label><button type="button" className="secondary-button" disabled={!hasRunnableSource(sourceCode) || busy !== null} onClick={() => void runCustomInput()}>{busy === 'run' ? '运行中…' : '▶ 运行'}</button></div>{runResult && <div className={`exam-run-result ${runResult.kind}`}><strong>{runResult.kind === 'success' ? '运行完成' : '运行失败'}</strong><pre>{runResult.stdout || runResult.stderr || '无输出'}</pre></div>}<p>考试提交时将统一核对公开样例；这里的运行结果不会直接计分。</p></section></> : <p className="editor-empty">当前题目没有可运行语言。</p>}
      </aside>
    </div>
  </section>;
}

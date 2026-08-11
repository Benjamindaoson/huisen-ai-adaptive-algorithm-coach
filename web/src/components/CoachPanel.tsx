import { useEffect, useRef, useState } from 'react';
import type { ProblemRecord } from '../lib/catalog';
import { buildCoachRequest, requestCoach, type CoachDiagnosis, type HintLevel } from '../lib/coach';
import type { SkillMastery } from '../lib/mastery';
import type { PracticeAttempt } from '../lib/practice';
import { recordTelemetry } from '../lib/telemetry';
import { buildAgentRequest, requestAgentRun, type AgentRunResponse } from '../lib/agent-client';

type Props = {
  problem: ProblemRecord;
  attempt?: PracticeAttempt;
  mastery: SkillMastery[];
  coachUrl: string;
  agentUrl?: string;
  onIntervention?: (kind: 'hint-requested' | 'hint-received', level: HintLevel, attemptId: string) => void;
};

const levelLabels: Record<HintLevel, string> = {
  1: '1 · 定位',
  2: '2 · 算法方向',
  3: '3 · 局部修改',
  4: '4 · 完整解法',
};

export function CoachPanel({ problem, attempt, mastery, coachUrl, agentUrl = '', onIntervention }: Props) {
  const [question, setQuestion] = useState('');
  const [diagnoses, setDiagnoses] = useState<CoachDiagnosis[]>([]);
  const [loadingLevel, setLoadingLevel] = useState<HintLevel | null>(null);
  const [error, setError] = useState('');
  const [agentRuns, setAgentRuns] = useState<Array<{ level: HintLevel; run: AgentRunResponse }>>([]);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDiagnoses([]);
    setError('');
    setAgentRuns([]);
    controllerRef.current?.abort();
  }, [attempt?.id, problem.id]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function diagnose(level: HintLevel) {
    if (!attempt) return;
    if (level === 4 && !window.confirm('第 4 级会解锁当前语言的完整参考解法。确认现在查看吗？')) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoadingLevel(level);
    setError('');
    onIntervention?.('hint-requested', level, attempt.id);
    try {
      if (agentUrl && level < 4) {
        const agentRun = await requestAgentRun(agentUrl, buildAgentRequest(problem, attempt, mastery, level), fetch, controller.signal);
        if (agentRun) {
          setAgentRuns((current) => [...current.filter((item) => item.level !== level), { level, run: agentRun }].sort((left, right) => left.level - right.level));
          onIntervention?.('hint-received', level, attempt.id);
          return;
        }
      }
      const response = await requestCoach(coachUrl, buildCoachRequest(problem, attempt, mastery, level, question), controller.signal);
      const fallback = agentUrl && response.source === 'local' ? { ...response, notice: '工具执行 Agent 暂不可用，已明确切换为本地 fallback。' } : response;
      if (fallback.invalidReason) recordTelemetry(window.localStorage, { name: 'coach-invalid', problemId: problem.id, outcome: fallback.invalidReason });
      setDiagnoses((current) => [...current.filter((item) => item.hintLevel !== level), fallback].sort((left, right) => left.hintLevel - right.hintLevel));
      onIntervention?.('hint-received', level, attempt.id);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === 'AbortError')) setError('诊断请求被中断，请重试。');
    } finally {
      if (controllerRef.current === controller) setLoadingLevel(null);
    }
  }

  const failedCase = attempt?.evidence?.failedCase;
  return <section className="coach-panel" aria-labelledby="coach-title">
    <header className="coach-header"><div><strong id="coach-title">证据驱动教练</strong><span>{agentUrl ? '工具执行 Agent · 可审计' : coachUrl ? '模型教练 · 服务端密钥' : '本地证据诊断 fallback · 未运行 Agent'}</span></div><em>提示逐级解锁</em></header>
    {!attempt ? <div className="coach-empty"><strong>先运行或提交一次代码</strong><p>教练只根据真实代码和执行结果诊断，不会在没有证据时猜测。</p></div> : <>
      <section className="coach-evidence" aria-label="本次诊断使用的证据">
        <h4>本次会使用</h4>
        <ul><li>代码快照 · {attempt.language}</li><li>{attempt.summary}</li>{attempt.evidence?.stderr && <li>错误输出 · {attempt.evidence.stderr.slice(0, 180)}</li>}{failedCase && <li>{failedCase.name} · 预期 {failedCase.expectedOutput || '无输出'} · 实际 {failedCase.actualOutput || '无输出'}</li>}<li>{mastery.filter((item) => item.evidenceCount > 0).length} 项历史技能证据</li></ul>
      </section>
      <label className="coach-question">你想重点确认什么？<textarea rows={2} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="可选，例如：为什么这个边界会错？" /></label>
    </>}

    <div className="hint-levels" aria-label="提示级别">{([1, 2, 3, 4] as HintLevel[]).map((level) => <button type="button" key={level} disabled={!attempt || loadingLevel !== null} className={diagnoses.some((item) => item.hintLevel === level) || agentRuns.some((item) => item.level === level) ? 'used' : ''} onClick={() => diagnose(level)}>{loadingLevel === level ? 'Agent 执行中…' : levelLabels[level]}</button>)}</div>
    {error && <p className="coach-error">{error}</p>}
    <div className="diagnosis-list" aria-live="polite">{diagnoses.map((diagnosis) => <article className="diagnosis-card" key={diagnosis.hintLevel}>
      <div className="diagnosis-meta"><span>Level {diagnosis.hintLevel}</span><b>{diagnosis.source === 'model' ? '模型诊断' : '本地证据诊断'} · 置信度 {Math.round(diagnosis.confidence * 100)}%</b></div>
      {diagnosis.notice && <p className="coach-notice">{diagnosis.notice}</p>}
      <h4>{diagnosis.diagnosis}</h4>
      <ul>{diagnosis.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      <p><strong>下一步：</strong>{diagnosis.nextAction}</p>
      {diagnosis.suggestedCode && <details className="suggested-code"><summary>展开完整参考代码</summary><pre>{diagnosis.suggestedCode}</pre></details>}
    </article>)}{agentRuns.map(({ level, run }) => <article className="diagnosis-card agent-run-card" key={`agent-${level}`}>
      <div className="diagnosis-meta"><span>Level {level} · {run.traceId.slice(0, 16)}</span><b>{run.mode === 'model-assisted' ? '模型协作 Agent' : '确定性 Agent'} · 置信度 {Math.round(run.hypothesis.confidence * 100)}%</b></div>
      <h4>{run.hypothesis.message}</h4>
      <ul>{run.evidence.map((item) => <li key={item.ref}><code>{item.ref}</code> · {item.excerpt} · {item.verification === 'verified' ? '已验证' : '待验证'}</li>)}</ul>
      <p><strong>下一步：</strong>{run.nextAction}</p>
      <p className="mastery-impact"><strong>掌握度投影：</strong>掌握概率 {Math.round(run.masteryImpact.probability * 100)}% · 证据置信度 {Math.round(run.masteryImpact.confidence * 100)}%{run.masteryImpact.needsTransfer ? ' · 仍需迁移验证' : ''}</p>
      <details className="agent-trace"><summary>已执行工具 {run.tools.length} · handoff {run.handoffs.length}</summary>
        <ol>{run.tools.map((tool) => <li key={tool.id}><b>{tool.role} / {tool.name}</b><span>{tool.summary} · {tool.durationMs} ms</span></li>)}</ol>
        <div className="handoff-list">{run.handoffs.map((handoff, index) => <p key={`${handoff.from}-${handoff.to}-${index}`}><code>{handoff.from} → {handoff.to}</code> {handoff.task}</p>)}</div>
      </details>
    </article>)}</div>
  </section>;
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ProblemRecord } from '../lib/catalog';
import { buildMentorRequest, continueMentorSession, startMentorSession, type MentorSession, type MentorTurnResponse } from '../lib/mentor-client';
import type { PracticeAttempt } from '../lib/practice';
import type { SampleTestCase } from '../lib/testcase';

type Props = {
  learnerId: string;
  agentUrl: string;
  problem: ProblemRecord;
  attempt?: PracticeAttempt;
  sampleCases: SampleTestCase[];
};

const eventLabels: Record<string, string> = {
  observation: '观察', hypothesis: '假设', 'missing-evidence': '证据缺口', tool: '工具', verification: '验证',
  'learner-question': '提问', 'learner-response': '你的回答', 'learner-action': '下一步', 'rejected-model-action': '安全拦截',
};

function modeLabel(result: MentorTurnResponse): string {
  if (result.session.mode === 'deepseek') return `DeepSeek · ${result.provider.model ?? result.session.model ?? '模型'} · 工具调用 ${result.provider.calls} 次 · ${result.provider.latencyMs} ms`;
  if (result.session.mode === 'fallback') return '模型动作已回退 · 确定性工具链';
  return '确定性 Mentor · 本地证据工具链';
}

function localFallback(sourceCode: string): { title: string; detail: string } {
  if (/<=\s*[A-Za-z_$][\w$]*\.length/.test(sourceCode)) return { title: '本地发现一个待验证边界', detail: '循环条件包含 <= length。它只是静态线索，需要执行证据才能确诊；没有伪造模型诊断。' };
  return { title: '服务暂不可用', detail: '判题与编辑器仍可使用。本地没有足够证据定位错误，也没有伪造模型诊断。' };
}

function platformLabel(result: MentorTurnResponse): string | null {
  if (!result.platform) return null;
  const storage = result.platform.storage === 'postgres' ? 'PostgreSQL 持久化' : '本地文件存储';
  const identity = result.platform.identity === 'signed' ? '签名身份' : '本地宽松身份';
  return `${storage} · ${identity}`;
}

export function MentorTimeline({ learnerId, agentUrl, problem, attempt, sampleCases }: Props) {
  const [result, setResult] = useState<MentorTurnResponse | null>(null);
  const [prediction, setPrediction] = useState('');
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<{ title: string; detail: string } | null>(null);
  const sessionRef = useRef<MentorSession | null>(null);
  const observedAttemptRef = useRef('');
  const problemRef = useRef(problem.id);

  useEffect(() => {
    if (!attempt || !agentUrl || observedAttemptRef.current === attempt.id) return;
    if (problemRef.current !== problem.id) {
      problemRef.current = problem.id;
      sessionRef.current = null;
      setResult(null);
      setFallback(null);
    }
    observedAttemptRef.current = attempt.id;
    const controller = new AbortController();
    let active = true;
    const request = buildMentorRequest(learnerId, problem, attempt, sampleCases);
    setBusy(true);
    const operation = sessionRef.current
      ? continueMentorSession(agentUrl, sessionRef.current.id, request, fetch, controller.signal)
      : startMentorSession(agentUrl, request, fetch, controller.signal);
    void operation.then((next) => {
      if (!active) return;
      if (!next) { setFallback(localFallback(attempt.codeSnapshot)); return; }
      sessionRef.current = next.session;
      setResult(next);
      setFallback(null);
    }).catch((error) => {
      if (active && !(error instanceof DOMException && error.name === 'AbortError')) setFallback(localFallback(attempt.codeSnapshot));
    }).finally(() => { if (active) setBusy(false); });
    return () => {
      active = false;
      controller.abort();
      if (observedAttemptRef.current === attempt.id) observedAttemptRef.current = '';
    };
  }, [agentUrl, attempt, learnerId, problem, sampleCases]);

  async function submitPrediction(event: FormEvent) {
    event.preventDefault();
    if (!attempt || !sessionRef.current || !prediction.trim() || busy) return;
    setBusy(true);
    const request = { ...buildMentorRequest(learnerId, problem, attempt, sampleCases), learnerResponse: prediction.trim().slice(0, 1_000) };
    try {
      const next = await continueMentorSession(agentUrl, sessionRef.current.id, request);
      if (!next) { setFallback(localFallback(attempt.codeSnapshot)); return; }
      sessionRef.current = next.session;
      setResult(next);
      setPrediction('');
      setFallback(null);
    } finally { setBusy(false); }
  }

  return <section className="mentor-timeline" aria-labelledby="mentor-title" aria-live="polite">
    <header className="mentor-timeline-header">
      <div><span className="mentor-orbit" aria-hidden="true">✦</span><div><strong id="mentor-title">Mentor</strong><small>证据驱动的实时导师</small></div></div>
      <span className={`mentor-mode ${result?.session.mode ?? 'idle'}`}>{result ? modeLabel(result) : fallback ? '本地静态回退 · 未验证' : busy ? '正在观察…' : '等待一次运行'}</span>
    </header>

    {!attempt && <div className="mentor-idle"><strong>先写、再运行，Mentor 才开始工作</strong><p>它会读取公开判题事实、代码结构和可信题库证据，不会提前展示参考答案。</p></div>}
    {fallback && <article className="mentor-event unverified"><span>回退</span><div><strong>{fallback.title}</strong><p>{fallback.detail}</p></div></article>}
    {result && <>
      {platformLabel(result) && <div className="mentor-platform-status" aria-label="Mentor 平台状态">{platformLabel(result)}</div>}
      <div className="mentor-phase-row"><span>当前阶段</span><strong>{result.session.phase}</strong><span>下一步</span><b>{result.session.nextAction}</b></div>
      <div className="mentor-events">
        {result.session.timeline.slice(-10).map((event) => <article className={`mentor-event ${event.status ?? 'unverified'}`} key={event.id}>
          <span>{eventLabels[event.type] ?? event.type}</span>
          <div><strong>{event.title}</strong><p>{event.detail}</p>{event.evidenceRefs.length > 0 && <small>{event.evidenceRefs.slice(0, 3).join(' · ')}</small>}</div>
        </article>)}
      </div>
      {result.session.phase === 'awaiting-prediction' && <form className="mentor-prediction" onSubmit={submitPrediction}>
        <label htmlFor="mentor-prediction-input">你的状态预测</label>
        <div><input id="mentor-prediction-input" value={prediction} onChange={(event) => setPrediction(event.target.value)} placeholder="先预测变量、下标或分支会发生什么" maxLength={1_000} /><button type="submit" disabled={!prediction.trim() || busy}>{busy ? '验证中…' : '提交预测'}</button></div>
        <small>Mentor 会根据你的预测判断具体误区，只给最小必要提示。</small>
      </form>}
    </>}
  </section>;
}

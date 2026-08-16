import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ProblemRecord } from '../lib/catalog';
import { buildMentorRequest, continueMentorSession, startMentorSession, type MentorSession, type MentorTransferTask, type MentorTurnResponse } from '../lib/mentor-client';
import type { PracticeAttempt } from '../lib/practice';
import type { SampleTestCase } from '../lib/testcase';
import { buildSubmissionDiff } from '../lib/submission-diff';
import { createMentorOSClient } from '../lib/mentor-os-client';
import type { MentorOSCheckpoint } from '../lib/mentor-os-state';
import { OD_SKILLS } from '../lib/skills';

type Props = {
  learnerId: string;
  agentUrl: string;
  problem: ProblemRecord;
  attempt?: PracticeAttempt;
  currentSourceCode?: string;
  sampleCases: SampleTestCase[];
  mentorOS?: { runId: string; cursor: number };
  mentorOSRequired?: boolean;
  onMentorOSCheckpoint?: (checkpoint: MentorOSCheckpoint) => void;
  onOpenTransfer?: (task: MentorTransferTask) => void;
  onRevisionVerified?: (attemptId: string) => void;
};

const languageLabels: Record<PracticeAttempt['language'], string> = { javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++' };
const statusLabels: Record<string, string> = { complete: '已验证', supported: '有证据支持', unverified: '待验证', rejected: '已否定' };

const eventLabels: Record<string, string> = {
  observation: '观察', hypothesis: '假设', 'missing-evidence': '证据缺口', tool: '工具', verification: '验证',
  'learner-question': '提问', 'learner-response': '你的回答', 'learner-action': '下一步', 'rejected-model-action': '模型状态',
};
const phaseLabels: Record<string, string> = {
  observing: '正在观察代码与运行证据',
  'awaiting-prediction': '等待你的状态预测',
  'awaiting-edit': '等待你完成最小修改',
  verifying: '正在验证修改',
  transfer: '正在验证能否迁移',
  complete: '本轮学习闭环已完成',
};
const teachingSteps = ['观察', '假设', '取证', '预测', '最小提示', '修改验证', '迁移'];
const phaseStep: Record<string, number> = { observing: 0, 'awaiting-prediction': 3, 'awaiting-edit': 4, verifying: 5, transfer: 6, complete: 6 };
const stopReasonLabels: Record<string, string> = {
  'awaiting-learner': '等待你继续操作',
  'awaiting-approval': '等待你确认高影响操作',
  'insufficient-evidence': '证据不足，等待新的运行结果',
  unavailable: 'AI 服务降级，已切换确定性工具链',
  'policy-denied': '当前模式禁止 AI 介入',
  'budget-exhausted': '达到本轮分析预算，保留当前证据',
  completed: '目标已达成，本轮主动结束',
};

function modeLabel(result: MentorTurnResponse): string {
  if (result.session.mode === 'deepseek' && result.provider.calls > 0) return 'DeepSeek 已动态规划';
  if (result.session.mode === 'deepseek') return '正在核对你的回答';
  if (result.session.mode === 'fallback') return '当前使用本地规则分析';
  return '正在依据本次运行结果分析';
}

function aiReceiptCopy(result: MentorTurnResponse): { label: string; title: string; detail: string; note: string } {
  if (result.session.mode === 'deepseek' && result.provider.calls > 0) return {
    label: 'AI 正在真实工作',
    title: 'DeepSeek 动态规划',
    detail: `${result.provider.calls} 次模型决策 · ${result.executions.length} 个工具 · ${providerLatency(result.provider.latencyMs)}`,
    note: '模型决定查什么；判题仍由运行服务决定。',
  };
  if (result.session.mode === 'deepseek') return {
    label: '证据规则正在更新',
    title: '本轮无需再次调用模型',
    detail: '0 次额外模型调用 · 沿用上一步 AI 问题的验证标准',
    note: '本轮只记录你的回答与能力证据；没有伪造新的模型推理。',
  };
  if (result.session.mode === 'fallback') return {
    label: '真实降级',
    title: '确定性工具接管',
    detail: '本轮没有把规则输出伪装成模型结论',
    note: '模型当前不可用；判题仍由运行服务决定。',
  };
  return {
    label: '确定性分析',
    title: '规则工具链执行',
    detail: '本轮没有把规则输出伪装成模型结论',
    note: '本地证据规则决定下一步；判题仍由运行服务决定。',
  };
}

function providerLatency(milliseconds: number): string {
  return milliseconds >= 1_000 ? `${(milliseconds / 1_000).toFixed(1)} 秒` : `${Math.round(milliseconds)} ms`;
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

type TwinChange = NonNullable<MentorSession['twin']>['lastChanges'][number];

function twinUpdateExplanation(changes: TwinChange[]): string {
  if (changes.some((change) => change.kind === 'assisted-pass')) return '这次有 Mentor 帮助，因此只记为“辅助通过”，还需要独立迁移验证。';
  if (changes.some((change) => change.kind === 'transfer-pass')) return '独立迁移已通过，这项技能获得更强的掌握证据。';
  if (changes.some((change) => change.kind === 'prediction-correct')) return '你的关键判断得到支持，因此能力档案小幅上调；只有独立完成和迁移验证才会形成更强的掌握证据。';
  if (changes.some((change) => change.kind === 'independent-pass')) return '这次独立完成已形成较强证据；还需要不同表面的迁移验证来确认能否真正应用。';
  const onlyNegative = changes.every((change) => change.kind === 'failure' || change.posterior <= change.prior)
    && changes.some((change) => change.kind === 'failure' || change.posterior < change.prior);
  if (onlyNegative) return '这次证据提示仍有未掌握部分；系统只下调有直接证据的技能，并等待你的下一次验证。';
  return '本次证据已记录，但方向还不一致；系统暂不把它解释为掌握提升或退步。';
}

export function MentorTimeline({ learnerId, agentUrl, problem, attempt, currentSourceCode, sampleCases, mentorOS, mentorOSRequired = false, onMentorOSCheckpoint, onOpenTransfer, onRevisionVerified }: Props) {
  const [result, setResult] = useState<MentorTurnResponse | null>(null);
  const [prediction, setPrediction] = useState('');
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<{ title: string; detail: string } | null>(null);
  const [checkpoint, setCheckpoint] = useState<MentorOSCheckpoint | null>(null);
  const sessionRef = useRef<MentorSession | null>(null);
  const resultRef = useRef<MentorTurnResponse | null>(null);
  const observedAttemptRef = useRef('');
  const durableOperationRef = useRef<{ attemptId: string; promise: Promise<MentorTurnResponse | null> } | null>(null);
  const problemRef = useRef(problem.id);
  const mentorOSCursorRef = useRef(mentorOS?.cursor ?? 0);
  const mentorOSRef = useRef(mentorOS);
  const checkpointCallbackRef = useRef(onMentorOSCheckpoint);
  mentorOSRef.current = mentorOS;
  checkpointCallbackRef.current = onMentorOSCheckpoint;
  resultRef.current = result;
  mentorOSCursorRef.current = Math.max(mentorOSCursorRef.current, mentorOS?.cursor ?? 0);
  const snapshotDiff = attempt ? buildSubmissionDiff(attempt.codeSnapshot, currentSourceCode ?? attempt.codeSnapshot) : null;
  const timeline = result?.session.timeline ?? [];
  const currentCycleStart = timeline.findLastIndex((event) => event.type === 'observation' && event.title === '判题器给出的确定事实');
  const currentTimeline = currentCycleStart >= 0 ? timeline.slice(currentCycleStart) : timeline.slice(-10);

  useEffect(() => {
    const pendingDurableOperation = attempt && durableOperationRef.current?.attemptId === attempt.id ? durableOperationRef.current : null;
    if (!attempt || !agentUrl || (mentorOSRequired && !mentorOSRef.current) || (observedAttemptRef.current === attempt.id && !pendingDurableOperation)) return;
    if (problemRef.current !== problem.id) {
      problemRef.current = problem.id;
      sessionRef.current = null;
      resultRef.current = null;
      observedAttemptRef.current = '';
      setResult(null);
      setFallback(null);
      setCheckpoint(null);
    }
    const previousAttemptId = observedAttemptRef.current;
    if (previousAttemptId !== attempt.id) {
      if (previousAttemptId && resultRef.current && attempt.outcome === 'passed') onRevisionVerified?.(attempt.id);
      observedAttemptRef.current = attempt.id;
      resultRef.current = null;
      setResult(null);
      setFallback(null);
      setCheckpoint(null);
    }
    const controller = new AbortController();
    let active = true;
    const request = buildMentorRequest(learnerId, problem, attempt, sampleCases);
    setBusy(true);
    const activeMentorOS = mentorOSRef.current;
    const operation = activeMentorOS
      ? pendingDurableOperation?.promise ?? createMentorOSClient().act(agentUrl, {
        runId: activeMentorOS.runId, learnerId, expectedSequence: mentorOSCursorRef.current, idempotencyKey: `attempt:${attempt.id}`,
        assessment: 'learning', mentorInput: request, context: [{ version: 1, id: `attempt-${attempt.id}`, kind: 'attempt', priority: 95, evidenceRefs: [`attempt:${attempt.id}`], data: { problemId: problem.id, outcome: attempt.outcome, summary: attempt.summary } }],
        ...(sessionRef.current ? { mentorSessionId: sessionRef.current.id } : {}),
      }).then((response) => {
        mentorOSCursorRef.current = response.checkpoint.sequence;
        setCheckpoint(response.checkpoint);
        checkpointCallbackRef.current?.(response.checkpoint);
        return response.mentorResult as MentorTurnResponse | undefined ?? null;
      })
      : sessionRef.current
        ? continueMentorSession(agentUrl, sessionRef.current.id, request, fetch, controller.signal)
        : startMentorSession(agentUrl, request, fetch, controller.signal);
    if (activeMentorOS && !pendingDurableOperation) durableOperationRef.current = { attemptId: attempt.id, promise: operation };
    void operation.then((next) => {
      if (!active) return;
      if (!next) { setFallback(localFallback(attempt.codeSnapshot)); return; }
      sessionRef.current = next.session;
      setResult(next);
      setFallback(null);
    }).catch((error) => {
      if (active && !(error instanceof DOMException && error.name === 'AbortError')) setFallback(localFallback(attempt.codeSnapshot));
    }).finally(() => {
      if (active) setBusy(false);
      if (durableOperationRef.current?.promise === operation) durableOperationRef.current = null;
    });
    return () => {
      active = false;
      if (!activeMentorOS) controller.abort();
      // Development StrictMode mounts, cleans up, then mounts again. Release
      // only an unfinished request, while retaining a finished diagnosis for
      // the next submitted revision.
      if (!activeMentorOS && observedAttemptRef.current === attempt.id && !resultRef.current) {
        observedAttemptRef.current = '';
      }
    };
  }, [agentUrl, attempt, learnerId, mentorOS?.runId, mentorOSRequired, onRevisionVerified, problem, sampleCases]);

  async function submitPrediction(event: FormEvent) {
    event.preventDefault();
    if (!attempt || !sessionRef.current || !prediction.trim() || busy) return;
    setBusy(true);
    const request = { ...buildMentorRequest(learnerId, problem, attempt, sampleCases), learnerResponse: prediction.trim().slice(0, 1_000) };
    try {
      const next = mentorOS
        ? await createMentorOSClient().act(agentUrl, { runId: mentorOS.runId, learnerId, expectedSequence: mentorOSCursorRef.current, idempotencyKey: `prediction:${attempt.id}:${sessionRef.current.timeline.length}`, assessment: 'learning', mentorSessionId: sessionRef.current.id, mentorInput: request, context: [{ version: 1, id: `response-${attempt.id}`, kind: 'pedagogical-event', priority: 90, evidenceRefs: [`attempt:${attempt.id}`, `mentor-session:${sessionRef.current.id}`], data: { responseLength: prediction.trim().length } }] }).then((response) => {
          mentorOSCursorRef.current = response.checkpoint.sequence;
          setCheckpoint(response.checkpoint);
          onMentorOSCheckpoint?.(response.checkpoint);
          return response.mentorResult as MentorTurnResponse | undefined ?? null;
        })
        : await continueMentorSession(agentUrl, sessionRef.current.id, request);
      if (!next) { setFallback(localFallback(attempt.codeSnapshot)); return; }
      sessionRef.current = next.session;
      setResult(next);
      setPrediction('');
      setFallback(null);
    } finally { setBusy(false); }
  }

  const receipt = result ? aiReceiptCopy(result) : null;
  const targetSkill = OD_SKILLS.find((skill) => skill.id === result?.session.pendingPrompt?.targetSkillId);

  return <section className="mentor-timeline" aria-labelledby="mentor-title" aria-live="polite">
    <header className="mentor-timeline-header">
      <div><span className="mentor-orbit" aria-hidden="true">✦</span><div><strong id="mentor-title">学习导师</strong><small>运行后结合实际结果，陪你找到下一步</small></div></div>
      <span className={`mentor-mode ${result?.session.mode ?? 'idle'}`}>{result ? modeLabel(result) : fallback ? '本地静态回退 · 未验证' : mentorOSRequired && attempt && !mentorOS ? '正在建立可恢复的分析记录…' : busy ? '正在观察…' : '等待一次运行'}</span>
    </header>

    {result?.session.phase === 'awaiting-prediction' && <form className="mentor-prediction" onSubmit={submitPrediction}>
      {targetSkill && <div className="mentor-target-inline" aria-label="本轮训练技能">
        <strong>本轮训练：{targetSkill.title}</strong>
        <small>答对只更新这一项能力证据</small>
      </div>}
      <p className="mentor-prediction-question">{result.session.nextAction}</p>
      <label htmlFor="mentor-prediction-input">你的状态预测</label>
      <div><input id="mentor-prediction-input" value={prediction} onChange={(event) => setPrediction(event.target.value)} placeholder="先预测变量、下标或分支会发生什么" maxLength={1_000} /><button type="submit" disabled={!prediction.trim() || busy}>{busy ? '验证中…' : '提交预测'}</button></div>
    </form>}

    {!attempt && <div className="mentor-idle"><strong>先写、再运行，Mentor 才开始工作</strong><p>它会读取公开判题事实、代码结构和可信题库证据，不会提前展示参考答案。</p></div>}
    {attempt && snapshotDiff && <aside className="mentor-attempt-binding" aria-label="Mentor 分析提交">
      <div>
        <strong>分析提交 {attempt.id}</strong>
        <span className={snapshotDiff.freshness === 'current' ? 'fresh' : 'stale'}>{snapshotDiff.freshness === 'current' ? '与当前代码一致' : '当前代码已修改'}</span>
      </div>
      <p>{attempt.mode === 'sample-submit' ? '样例提交' : '运行'} · {languageLabels[attempt.language]} · {new Date(attempt.createdAt).toLocaleString('zh-CN')} · {attempt.summary}</p>
      {snapshotDiff.freshness === 'stale' && <details>
        <summary>查看提交后变化 · -{snapshotDiff.removed} 行 · +{snapshotDiff.added} 行</summary>
        {snapshotDiff.truncated ? <p>代码超过 400 行，只显示变更统计；Mentor 仍分析原提交快照。</p> : <div className="mentor-code-diff">
          {snapshotDiff.hunks.flatMap((hunk, hunkIndex) => hunk.lines.map((line, lineIndex) => <code className={line.kind} key={`${hunkIndex}-${lineIndex}`}><b>{line.kind === 'added' ? `+${line.newLine}` : `-${line.oldLine}`}</b>{line.value || ' '}</code>))}
        </div>}
      </details>}
    </aside>}
    {fallback && <article className="mentor-event unverified"><span>回退</span><div><strong>{fallback.title}</strong><p>{fallback.detail}</p></div></article>}
    {result && <>
      {platformLabel(result) && <details className="mentor-technical-details"><summary>查看分析依据</summary><small>{platformLabel(result)}</small></details>}
      <div className={`mentor-ai-receipt ${result.session.mode}`} aria-label="AI 决策凭据">
        <span>{receipt?.label}</span>
        <strong>{receipt?.title}</strong>
        <p>{receipt?.detail}</p>
        <small>{receipt?.note}</small>
      </div>
      {checkpoint?.stopReason && <div className={`mentor-stop-reason ${checkpoint.stopReason}`} aria-label="Mentor 主动停止原因">
        <span>本轮为何停在这里</span><strong>{stopReasonLabels[checkpoint.stopReason] ?? checkpoint.stopReason}</strong>
      </div>}
      <div className="mentor-run-proof" aria-label="Mentor 本轮运行证据">我已核对 {result.executions.length} 个分析步骤，并保留 {new Set(currentTimeline.flatMap((event) => event.evidenceRefs)).size} 条可引用证据。</div>
      <ol className="mentor-loop-progress" aria-label="Mentor 教学闭环">
        {teachingSteps.map((step, index) => <li key={step} className={index <= (phaseStep[result.session.phase] ?? 0) ? 'reached' : ''} aria-current={index === (phaseStep[result.session.phase] ?? 0) ? 'step' : undefined}><i />{step}</li>)}
      </ol>
      <div className="mentor-phase-row"><span>当前阶段</span><strong>{phaseLabels[result.session.phase] ?? result.session.phase}</strong><span>下一步</span><b>{result.session.nextAction}</b></div>
      {result.session.twin?.lastChanges?.length ? <aside className="mentor-twin-update" aria-label="能力档案刚刚更新">
        <div><span>能力档案刚刚更新</span><strong>{result.session.twin.lastChanges.map((change) => change.skillId).join(' · ')}</strong></div>
        <p>{result.session.twin.lastChanges.map((change) => `${Math.round(change.prior * 100)}% → ${Math.round(change.posterior * 100)}%`).join('；')}。{twinUpdateExplanation(result.session.twin.lastChanges)}</p>
      </aside> : null}
      {result.session.transferTask && <aside className="mentor-transfer-card" aria-label="Mentor 迁移任务">
        <div><span>下一题才是真正的掌握验证</span><strong>{result.session.transferTask.title}</strong><p>相同核心技能，不同题目表面；进入后将关闭 Mentor、提示和参考答案。</p></div>
        <button type="button" onClick={() => onOpenTransfer?.(result.session.transferTask!)}>开始独立迁移</button>
      </aside>}
      <div className="mentor-events">
        {currentTimeline.slice(-10).map((event) => <article className={`mentor-event ${event.status ?? 'unverified'}`} key={event.id}>
          <span>{eventLabels[event.type] ?? event.type}</span>
          <div><strong>{event.title}</strong><em className="mentor-evidence-status">{statusLabels[event.status ?? 'unverified'] ?? '待验证'}</em><p>{event.detail}</p>{event.evidenceRefs.length > 0 && <details className="mentor-event-evidence"><summary>查看依据</summary><small>{event.evidenceRefs.slice(0, 3).join(' · ')}</small></details>}</div>
        </article>)}
      </div>
      {result.executions.length > 0 && <details className="mentor-executions">
        <summary>查看本轮分析过程（{result.executions.length} 步）</summary>
        {result.executions.map((execution) => <div key={execution.id}><strong>{execution.tool} · {execution.durationMs} ms</strong><span>{execution.summary}</span><small>{execution.evidenceRefs.length ? execution.evidenceRefs.join(' · ') : '无执行证据引用'}</small></div>)}
      </details>}
    </>}
  </section>;
}

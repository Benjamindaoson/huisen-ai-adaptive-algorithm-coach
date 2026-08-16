import { useEffect, useRef, useState } from 'react';
import type { CatalogProblem } from '../lib/catalog';
import type { FoundationLesson } from '../lib/foundation-curriculum';
import type { LearningEvent, LearningSignal } from '../lib/learner-memory';
import { lessonRecapReflectionReason, projectLessonRecapReflection, type LessonRecoveryContext } from '../lib/lesson-handoff';
import { buildGrowthReplay, buildTrainingSession, type TrainingStageId } from '../lib/ai-training';
import { evaluateImmediateTransfer, getImmediateTransferChallenge, type ImmediateTransferEvaluator, type ImmediateTransferResult } from '../lib/training-transfer';

type Props = {
  lesson: FoundationLesson;
  events: LearningEvent[];
  transferProblem: CatalogProblem | null;
  runnerUrl?: string;
  transferExecutor?: ImmediateTransferEvaluator;
  recoveryContext?: LessonRecoveryContext | null;
  onReturnToLesson?: () => void;
  onSignal: (signal: LearningSignal) => void;
  onOpenProblem: (problemId: string) => void;
};

function stageIndex(stage: TrainingStageId): number {
  return ['explain', 'observe', 'predict', 'build', 'transfer'].indexOf(stage);
}

export function TrainingCabinPage({ lesson, events, transferProblem, runnerUrl = '', transferExecutor = evaluateImmediateTransfer, recoveryContext, onReturnToLesson, onSignal, onOpenProblem }: Props) {
  const session = buildTrainingSession(lesson, events);
  const immediateTransfer = getImmediateTransferChallenge(lesson.id);
  const recapMode = Boolean(recoveryContext);
  const persistedRecapReflection = recoveryContext ? projectLessonRecapReflection(events, recoveryContext, lesson.id) : null;
  const shouldAutoStart = session.diagnosis.kind === 'entry-handoff' && !session.progress.started;
  const [started, setStarted] = useState(recapMode || session.progress.started || shouldAutoStart);
  const [stage, setStage] = useState<TrainingStageId>(recapMode ? 'explain' : session.progress.activeStageId);
  const [frame, setFrame] = useState(0);
  const [ranFrame, setRanFrame] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [showCue, setShowCue] = useState(false);
  const [transferCode, setTransferCode] = useState(immediateTransfer?.starterCode ?? '');
  const [transferResult, setTransferResult] = useState<ImmediateTransferResult | null>(null);
  const [runningTransfer, setRunningTransfer] = useState(false);
  const [transferRecorded, setTransferRecorded] = useState(session.progress.completedStageIds.includes('transfer'));
  const [recapChoice, setRecapChoice] = useState<'misconception' | 'corrected' | null>(null);
  const [recapReflectionRecorded, setRecapReflectionRecorded] = useState(Boolean(persistedRecapReflection));
  const onSignalRef = useRef(onSignal);
  const autoStartedLessonRef = useRef<string | null>(null);
  onSignalRef.current = onSignal;

  useEffect(() => {
    const autoStartSelectedLesson = session.diagnosis.kind === 'entry-handoff' && !session.progress.started;
    setStarted(recapMode || session.progress.started || autoStartSelectedLesson); setStage(recapMode ? 'explain' : session.progress.activeStageId); setFrame(0); setRanFrame(false); setSelected(null); setAnswer(''); setShowCue(false); setRecapChoice(null); setRecapReflectionRecorded(Boolean(persistedRecapReflection));
    const nextChallenge = getImmediateTransferChallenge(lesson.id);
    setTransferCode(nextChallenge?.starterCode ?? ''); setTransferResult(null); setRunningTransfer(false); setTransferRecorded(session.progress.completedStageIds.includes('transfer'));
    if (!recapMode && autoStartSelectedLesson && autoStartedLessonRef.current !== lesson.id) {
      autoStartedLessonRef.current = lesson.id;
      onSignalRef.current({ kind: 'training-session-started', data: { lessonId: lesson.id, stage: 'explain' } });
    }
    // Progress is intentionally restored only when entering another lesson. During a live
    // session, local stage transitions remain immediate while persisted events catch up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, recoveryContext?.recommendationId]);

  function completeStage(next: TrainingStageId, completed: TrainingStageId) {
    if (!recapMode) onSignal({ kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: completed, correct: true } });
    setStage(next);
  }

  function begin() {
    setStarted(true);
    onSignal({ kind: 'training-session-started', data: { lessonId: lesson.id, stage: 'explain' } });
  }

  function choosePrediction(index: number) {
    if (selected === lesson.checkpoint.answerIndex) return;
    setSelected(index);
    if (index === lesson.checkpoint.answerIndex) completeStage('build', 'predict');
  }

  function validateBuild() {
    if (answer.trim() !== lesson.completion.answer) { setShowCue(true); return; }
    setShowCue(false);
    completeStage('transfer', 'build');
    if (!recapMode) onSignal({ kind: 'training-session-completed', data: { lessonId: lesson.id, stage: 'transfer' } });
  }

  function beginTransfer() {
    if (!transferProblem) return;
    if (!recapMode) onSignal({ kind: 'lesson-transfer-started', problemId: transferProblem.id, data: { lessonId: lesson.id, stage: 'transfer', skillIds: [lesson.transfer.skillId] } });
    onOpenProblem(transferProblem.id);
  }

  async function runImmediateTransfer() {
    if (!immediateTransfer || runningTransfer) return;
    setRunningTransfer(true);
    const result = await transferExecutor(runnerUrl, immediateTransfer, transferCode);
    setTransferResult(result);
    setRunningTransfer(false);
    if (result.status === 'passed' && !transferRecorded && !recapMode) {
      setTransferRecorded(true);
      onSignal({ kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'transfer', correct: true, skillIds: [...immediateTransfer.skillIds] } });
    }
  }

  function confirmRecapReflection() {
    if (!recoveryContext || recapChoice !== 'corrected' || recapReflectionRecorded) return;
    setRecapReflectionRecorded(true);
    onSignal({
      kind: 'lesson-handoff-feedback',
      data: {
        lessonId: recoveryContext.returnLessonId,
        recommendationId: recoveryContext.recommendationId,
        choiceId: 'helpful',
        reason: lessonRecapReflectionReason(lesson.id),
      },
    });
  }

  const replay = buildGrowthReplay(lesson, events);
  const currentStageIndex = stageIndex(stage);
  const compactHandoff = started && session.diagnosis.kind === 'entry-handoff';
  const diagnosisEvidence = <>
    <p>{session.diagnosis.evidenceLabel}</p>
    {session.diagnosis.handoffObservations && <ul aria-label="入口诊断证据">
      {session.diagnosis.handoffObservations.map((observation) => <li className={observation.result} key={observation.evidenceRef}>
        <span><b>{observation.label}</b><em>{observation.result === 'stable' ? '稳定' : '需要补强'}</em></span>
        <small>{observation.detail}</small>
      </li>)}
    </ul>}
    {session.diagnosis.masteryBoundary && <em className="training-mastery-boundary">{session.diagnosis.masteryBoundary}</em>}
    <small>{session.diagnosis.uncertainty}</small>
  </>;

  return <main className="training-cabin">
    <header className="training-cabin-header">
      <button type="button" className="training-back" onClick={() => window.history.back()} aria-label="返回今日训练">←</button>
      <div><span>AI 算法训练</span><strong>{lesson.plainTitle}</strong></div>
      <small>约 10 分钟</small>
    </header>

    {recoveryContext && onReturnToLesson && <section className="training-recovery-context" aria-label="AI 补救学习上下文">
      <div><span>AI 补救路径</span><b>快速复习模式</b><strong>你刚才不清楚为什么要学「{recoveryContext.returnLessonTitle}」</strong><p>先从人话讲解重新看一遍它依赖的知识。这里的重播不会写入新掌握证据，你随时可以返回。</p></div>
      <button type="button" onClick={onReturnToLesson}>返回「{recoveryContext.returnLessonTitle}」</button>
    </section>}

    <section className={`training-diagnosis${compactHandoff ? ' compact' : ''}`} aria-labelledby="training-diagnosis-title">
      <div className="training-diagnosis-orb"><i /></div>
      <div><span>{session.diagnosis.eyebrow}</span><h1 id="training-diagnosis-title">{session.diagnosis.title}</h1><p>{session.diagnosis.claim}</p></div>
      {compactHandoff ? <aside className="training-handoff-evidence compact">
        <details><summary>查看 {session.diagnosis.handoffObservations?.length ?? 0} 条入口证据</summary><div><strong>我带来了刚才的证据</strong>{diagnosisEvidence}</div></details>
      </aside> : <aside className={session.diagnosis.handoffObservations ? 'training-handoff-evidence' : undefined}>
        <strong>{session.diagnosis.handoffObservations ? '我带来了刚才的证据' : '我依据什么'}</strong>{diagnosisEvidence}
      </aside>}
    </section>

    <section className={`training-mission${started ? ' compact' : ''}`} aria-label="十分钟训练任务">
      <div><span>你的 10 分钟任务</span><h2>{session.mission.title}</h2><p>{session.mission.objective}</p></div>
      {!started && <button className="training-primary" type="button" onClick={begin}>开始我的 10 分钟训练 <b>→</b></button>}
    </section>

    {recapMode && recapReflectionRecorded && <section className="training-recap-reflection recorded" aria-label="复盘理解已记录">
      <span>理解变化已确认</span><div><h2>这次认知修正已记录</h2><p>你已经区分了原来的误区和正确模型。它不会增加掌握度；下一次独立迁移才会验证你是否真的会用。</p></div>
    </section>}

    {recapMode && !recapReflectionRecorded && stage !== 'explain' && <section className="training-recap-reflection" aria-labelledby="recap-reflection-title">
      <header><span>不是“看完了”，而是“想法变了”</span><h2 id="recap-reflection-title">刚才哪里想岔了？</h2><p>选出你现在认可的理解。这里记录的是认知修正，不是掌握证明。</p></header>
      <div className="training-recap-models">
        <button type="button" aria-pressed={recapChoice === 'misconception'} className={recapChoice === 'misconception' ? 'selected wrong' : ''} onClick={() => setRecapChoice('misconception')}>{lesson.checkpoint.misconception}</button>
        <button type="button" aria-pressed={recapChoice === 'corrected'} className={recapChoice === 'corrected' ? 'selected correct' : ''} onClick={() => setRecapChoice('corrected')}>{lesson.checkpoint.explanation}</button>
      </div>
      {recapChoice === 'misconception' && <div className="training-recap-response wrong" role="status"><strong>这个理解还停留在原来的误区。</strong><p>没关系，回到生活语言和程序状态再看一遍，不需要硬记答案。</p><button type="button" onClick={() => { setStage('explain'); setRecapChoice(null); }}>回到人话讲解</button></div>}
      {recapChoice === 'corrected' && <div className="training-recap-response correct" role="status"><strong>你已经说清这次改变了什么。</strong><p>确认后只记录“理解已修正”；不会增加掌握度，仍需靠不同题面的独立迁移验证。</p></div>}
      <button className="training-primary" type="button" disabled={recapChoice !== 'corrected'} onClick={confirmRecapReflection}>我现在明白了</button>
    </section>}

    {started && <>
      <nav className="training-rail" aria-label="训练进度">{session.mission.stages.map((item, index) => <span key={item.id} className={index === currentStageIndex ? 'active' : index < currentStageIndex ? 'done' : ''}><i>{index < currentStageIndex ? '✓' : String(index + 1).padStart(2, '0')}</i><strong>{item.label}</strong><small>{item.purpose}</small></span>)}</nav>
      <section className="training-stage" aria-live="polite">
        {stage === 'explain' && <div className="training-explain">
          <span className="training-stage-kicker">01 / 先用人话听懂</span><h2>{lesson.plainTitle}</h2><blockquote>{lesson.analogy}</blockquote><p>{lesson.explanation}</p>
          <div className="training-bridge"><span>生活里的说法</span><strong>{lesson.plainTitle}</strong><i>→</i><span>算法里的名字</span><strong>{lesson.professionalName}</strong></div>
          <button className="training-primary" type="button" onClick={() => completeStage('observe', 'explain')}>我听懂了，去看程序怎么动</button>
        </div>}

        {stage === 'observe' && <div className="training-observe">
          <header><span className="training-stage-kicker">02 / 看见每一步</span><h2>{lesson.frames[frame].title}</h2><p>这是一段已经准备好的学习示例，不是隐藏运行结果。</p></header>
          <div className="training-state-lab"><div className="training-code-card"><span>Python · 示例</span><pre><code>{lesson.frames[frame].code}</code></pre><button type="button" onClick={() => { setRanFrame(true); if (!recapMode && lesson.id.startsWith('starter-')) onSignal({ kind: 'first-minute-first-run', data: { lessonId: lesson.id } }); }}>运行这一小步</button></div><div className="training-state-card"><span>这一刻，程序记住了什么？</span>{ranFrame ? lesson.frames[frame].state.map((item) => <div className={item.changed ? 'changed' : ''} key={item.name}><small>{item.name}</small><strong>{item.value}</strong></div>) : <p>先运行这一步，再揭开程序当下的状态。</p>}</div></div>
          {ranFrame && <div className="training-observation"><strong>{lesson.frames[frame].title}</strong><p>{lesson.frames[frame].note}</p></div>}
          {ranFrame && (frame < lesson.frames.length - 1 ? <button className="training-primary" type="button" onClick={() => { setFrame((value) => value + 1); setRanFrame(false); }}>继续观察</button> : <button className="training-primary" type="button" onClick={() => completeStage('predict', 'observe')}>轮到我先预测</button>)}
        </div>}

        {stage === 'predict' && <div className="training-predict">
          <span className="training-stage-kicker">03 / 先预测，再验证</span><h2>{lesson.checkpoint.question}</h2><p>不要找模板。只根据刚才看到的状态变化做判断。</p>
          <div className="training-options">{lesson.checkpoint.options.map((option, index) => <button type="button" key={option} onClick={() => choosePrediction(index)} className={selected === index ? (index === lesson.checkpoint.answerIndex ? 'correct' : 'wrong') : ''}>{option}</button>)}</div>
          {selected !== null && <div className={`training-feedback ${selected === lesson.checkpoint.answerIndex ? 'correct' : 'wrong'}`}><strong>{selected === lesson.checkpoint.answerIndex ? '判断正确，你抓住了状态变化。' : '先回到状态，而不是回到答案。'}</strong><p>{selected === lesson.checkpoint.answerIndex ? lesson.checkpoint.explanation : lesson.checkpoint.misconception}</p></div>}
        </div>}

        {stage === 'build' && <div className="training-build">
          <span className="training-stage-kicker">04 / 只写关键的一步</span><h2>{lesson.completion.prompt}</h2><p>这里不是完整题目；你只需要证明自己理解了这个动作。</p>
          <div className="training-local-editor"><pre><code>{lesson.completion.template}</code></pre><label>填写缺失代码<input aria-label="填写缺失代码" value={answer} onChange={(event) => { setAnswer(event.target.value); setShowCue(false); }} autoFocus placeholder="___" /></label></div>
          {showCue && <div className="training-feedback wrong"><strong>先不公布答案。</strong><p>先想：这一行要让程序拿到什么，还是要把什么记录下来？再回看上一步的状态。</p></div>}
          <button className="training-primary" type="button" onClick={validateBuild}>验证这一步</button>
        </div>}

        {stage === 'transfer' && <div className="training-transfer">
          <span className="training-stage-kicker">05 / 不同题面，自己来</span><h2>现在不需要看参考答案。</h2><p>{session.mission.transferCriterion}</p>
          {immediateTransfer ? <section className="training-immediate-transfer" aria-labelledby="immediate-transfer-title">
            <header><span>同技能 · 新情境</span><h3 id="immediate-transfer-title">{immediateTransfer.title}</h3><p>{immediateTransfer.prompt}</p></header>
            <label>独立迁移代码<textarea aria-label="独立迁移代码" value={transferCode} onChange={(event) => { setTransferCode(event.target.value); setTransferResult(null); }} spellCheck={false} /></label>
            <div className="training-transfer-actions"><button className="training-primary" type="button" disabled={runningTransfer || transferResult?.status === 'passed'} onClick={() => void runImmediateTransfer()}>{runningTransfer ? '正在隔离运行…' : `运行 ${immediateTransfer.cases.length} 组独立测试`}</button><small>代码只发送到私有隔离运行服务；本页不会执行 Python。</small></div>
            {transferResult && <div className={`training-transfer-result ${transferResult.status}`} role="status">
              <strong>{transferResult.status === 'passed' ? `${transferResult.passedCount}/${transferResult.totalCount} 组测试通过` : transferResult.status === 'unavailable' ? '运行服务暂时不可用' : `${transferResult.passedCount}/${transferResult.totalCount} 组测试通过`}</strong>
              <p>{transferResult.status === 'passed' ? '你在不同情境中独立写出了同一个数组遍历动作。' : transferResult.message}</p>
              {transferResult.status === 'passed' && <><em>这是即时迁移证据，不等于长期掌握；系统还会安排延迟复测。</em><a href="#/insights">查看我的训练地图 →</a></>}
            </div>}
          </section> : <div className="training-transfer-card"><div><span>独立挑战</span><strong>{transferProblem?.title ?? '匹配中的迁移题'}</strong><p>{lesson.transfer.prompt}</p></div>{transferProblem ? <button className="training-primary" type="button" onClick={beginTransfer}>进入独立挑战</button> : <small>暂时没有可信的匹配题。你的训练进度已保留，独立验证仍待完成。</small>}</div>}
          <section className="training-replay" aria-labelledby="training-replay-title"><span>AI 成长回放</span><h3 id="training-replay-title">你刚刚完成了什么？</h3><p>{replay.startingPoint}</p><div>{replay.evidence.length ? replay.evidence.map((item) => <article key={item.label}><strong>{item.label}</strong><p>{item.detail}</p></article>) : <article><strong>训练刚开始</strong><p>完成预测和关键代码动作后，这里会留下真实的学习证据。</p></article>}</div><footer className={replay.transfer.status}><strong>{replay.transfer.status === 'verified' ? '真实题独立迁移已有证据' : replay.transfer.status === 'immediate' ? '即时迁移已通过' : '独立迁移还没有发生'}</strong><p>{replay.transfer.detail}</p><small>{replay.nextAction}</small></footer></section>
        </div>}
      </section>
    </>}
  </main>;
}

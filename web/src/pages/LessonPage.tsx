import { useEffect, useRef, useState } from 'react';
import type { CatalogProblem } from '../lib/catalog';
import type { FoundationLesson } from '../lib/foundation-curriculum';
import type { EvidenceBoundLessonHandoff, LessonHandoffFeedbackChoice } from '../lib/lesson-handoff';
import type { LearningSignal } from '../lib/learner-memory';
import { hrefFor } from '../lib/routes';

type Props = {
  lesson: FoundationLesson;
  transferProblem: CatalogProblem | null;
  handoff?: EvidenceBoundLessonHandoff | null;
  handoffFeedback?: LessonHandoffFeedbackChoice | null;
  returnProblemId?: string;
  onSignal: (signal: LearningSignal) => void;
  onOpenProblem: (problemId: string) => void;
};

const stages = ['听懂', '观察', '预测', '补全', '迁移'];

export function LessonPage({ lesson, transferProblem, handoff, handoffFeedback, returnProblemId, onSignal, onOpenProblem }: Props) {
  const [stage, setStage] = useState(0);
  const [frame, setFrame] = useState(0);
  const [exampleRun, setExampleRun] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [completionError, setCompletionError] = useState(false);
  const onSignalRef = useRef(onSignal);
  onSignalRef.current = onSignal;

  useEffect(() => {
    setStage(0); setFrame(0); setExampleRun(false); setSelected(null); setAnswer(''); setCompletionError(false);
    onSignalRef.current({ kind: 'lesson-started', data: { lessonId: lesson.id, stage: 'explain' } });
  }, [lesson.id]);

  const checkpointCorrect = selected === lesson.checkpoint.answerIndex;
  function chooseCheckpoint(index: number) {
    if (selected === lesson.checkpoint.answerIndex) return;
    setSelected(index);
    if (index === lesson.checkpoint.answerIndex) onSignal({ kind: 'lesson-checkpoint-passed', data: { lessonId: lesson.id, stage: 'predict', correct: true } });
  }
  function checkCompletion() {
    const correct = answer.trim() === lesson.completion.answer;
    setCompletionError(!correct);
    if (!correct) return;
    onSignal({ kind: 'lesson-completed', data: { lessonId: lesson.id, stage: 'complete', correct: true } });
    setStage(4);
  }
  function startTransfer() {
    if (!transferProblem) return;
    onSignal({ kind: 'lesson-transfer-started', problemId: transferProblem.id, data: { lessonId: lesson.id, stage: 'transfer', skillIds: [lesson.transfer.skillId] } });
    onOpenProblem(transferProblem.id);
  }

  return <div className="lesson-page">
    <header className="lesson-header"><div><span className="section-kicker">算法微课 · {String(lesson.order).padStart(2, '0')}</span><h1>{lesson.title}</h1><p>{lesson.professionalName} · 约 {lesson.minutes} 分钟</p></div><div className="lesson-goal"><span>这节学会</span><strong>{lesson.objective}</strong></div></header>
    {handoff && <section className="lesson-handoff" aria-labelledby="lesson-handoff-title">
      <div className="lesson-handoff-copy"><span>AI 学习编排</span><h2 id="lesson-handoff-title">{handoff.headline}</h2><p>{handoff.reason}</p></div>
      <div className="lesson-handoff-payoff"><span>学完你将能做到</span><strong>{handoff.payoff}</strong></div>
      <p className="lesson-handoff-boundary">{handoff.boundary}</p>
      <details><summary>查看推荐依据 · {handoff.evidenceRefs.length} 条记录</summary><ul>{handoff.evidenceRefs.map((reference) => <li key={reference}><code>{reference}</code></li>)}</ul></details>
      <div className="lesson-handoff-feedback">
        <strong>这次安排对你有帮助吗？</strong>
        <div className="lesson-handoff-feedback-actions">
          <button
            type="button"
            aria-pressed={handoffFeedback === 'helpful'}
            onClick={() => onSignal({ kind: 'lesson-handoff-feedback', data: { lessonId: lesson.id, recommendationId: handoff.recommendationId, choiceId: 'helpful' } })}
          >这正是我需要的</button>
          <button
            type="button"
            aria-pressed={handoffFeedback === 'unclear'}
            onClick={() => onSignal({ kind: 'lesson-handoff-feedback', data: { lessonId: lesson.id, recommendationId: handoff.recommendationId, choiceId: 'unclear' } })}
          >我不明白为什么</button>
        </div>
        {handoffFeedback && <p role="status">你的反馈已保存，只用于改进推荐体验，不计入掌握度。</p>}
        {handoffFeedback === 'unclear' && <div className="lesson-handoff-recovery">
          <strong>这不是因为系统判定你很弱。</strong>
          <p>系统只是根据你已经完成的训练和先修关系安排下一步。你可以先复习刚完成的内容，再回来继续。</p>
          <a href={hrefFor({ name: 'training', lessonId: handoff.sourceLessonId, returnLessonId: lesson.id, recommendationId: handoff.recommendationId })}>先复习上一项训练</a>
        </div>}
      </div>
    </section>}
    <div className="lesson-stagebar" aria-label="课程进度">{stages.map((name, index) => <span className={index === stage ? 'active' : index < stage ? 'done' : ''} key={name}><i>{index < stage ? '✓' : index + 1}</i>{name}</span>)}</div>

    <main className="lesson-canvas">
      {stage === 0 && <section className="lesson-explain">
        <div className="lesson-plain-label">先不用记术语</div><h2>{lesson.plainTitle}</h2><blockquote>{lesson.analogy}</blockquote><p>{lesson.explanation}</p>
        <div className="term-bridge"><span>生活语言</span><strong>{lesson.plainTitle}</strong><i>→</i><span>专业名称</span><strong>{lesson.professionalName}</strong></div>
        <button type="button" className="primary-action" onClick={() => setStage(1)}>继续：观察程序</button>
      </section>}

      {stage === 1 && <section className="lesson-observe"><header><div><span className="lesson-plain-label">程序慢动作</span><h2>每次只看一小步</h2></div><strong>{frame + 1} / {lesson.frames.length}</strong></header>
        <div className="state-lab"><div className="state-code"><span>Python</span><pre><code>{lesson.frames[frame].code}</code></pre></div><div className="state-board"><small>此刻程序记住了什么</small>{lesson.frames[frame].state.map((item) => <div className={item.changed ? 'changed' : ''} key={item.name}><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></div>
        <div className="frame-note"><strong>{lesson.frames[frame].title}</strong><p>{lesson.frames[frame].note}</p></div>
        {!exampleRun && <button type="button" className="lesson-run-example" onClick={() => { setExampleRun(true); if (lesson.id.startsWith('starter-')) onSignal({ kind: 'first-minute-first-run', data: { lessonId: lesson.id } }); }}>运行示例</button>}
        {frame < lesson.frames.length - 1 ? <button type="button" className="primary-action" onClick={() => setFrame((value) => value + 1)}>执行下一步</button> : <button type="button" className="primary-action" onClick={() => setStage(2)}>继续：先预测</button>}
      </section>}

      {stage === 2 && <section className="lesson-checkpoint"><span className="lesson-plain-label">先想，再运行</span><h2>{lesson.checkpoint.question}</h2><p>不要猜模板。请根据刚才看到的状态变化做判断。</p><div className="checkpoint-options">{lesson.checkpoint.options.map((option, index) => <button type="button" className={selected === index ? (checkpointCorrect ? 'correct' : 'wrong') : ''} onClick={() => chooseCheckpoint(index)} key={option}>{option}</button>)}</div>
        {selected !== null && <div className={`checkpoint-feedback ${checkpointCorrect ? 'correct' : 'wrong'}`}><strong>{checkpointCorrect ? '判断正确：你抓住了程序状态。' : '这个选择暴露了一个很具体的误区。'}</strong><p>{checkpointCorrect ? lesson.checkpoint.explanation : lesson.checkpoint.misconception}</p></div>}
        {checkpointCorrect && <button type="button" className="primary-action" onClick={() => setStage(3)}>继续：亲手补全</button>}
      </section>}

      {stage === 3 && <section className="lesson-completion"><span className="lesson-plain-label">只补关键一步</span><h2>{lesson.completion.prompt}</h2><div className="completion-editor"><pre><code>{lesson.completion.template}</code></pre><label>填写缺失代码<input aria-label="填写缺失代码" value={answer} onChange={(event) => { setAnswer(event.target.value); setCompletionError(false); }} placeholder="___" autoFocus /></label></div>
        {completionError && <div className="checkpoint-feedback wrong"><strong>还差一点，不直接给答案。</strong><p>回到上面的目标：缺失位置应该让这一行完成什么动作？</p></div>}
        <button type="button" className="primary-action" onClick={checkCompletion}>检查我的答案</button>
      </section>}

      {stage === 4 && <section className="lesson-transfer"><span className="lesson-plain-label">真正的掌握验证</span><h2>把能力带到下一道题</h2><p>{lesson.completion.explanation}</p><div className="transfer-card"><div><small>{lesson.transfer.title}</small><strong>{transferProblem?.title ?? '题库暂时没有可信的匹配题'}</strong><p>{lesson.transfer.prompt}</p></div>{transferProblem ? <button type="button" className="primary-action" onClick={startTransfer}>进入真实题验证</button> : <span className="muted">课程完成已保存，匹配题不会被虚构。</span>}</div>
        {returnProblemId && <div className="remediation-return"><div><span>补课已完成</span><strong>回到刚才卡住的题，保留原提交继续修改</strong></div><button type="button" className="primary-action" onClick={() => onOpenProblem(returnProblemId)}>返回原题继续作答</button></div>}
        <div className="transfer-proof"><span>本节已验证</span><strong>听懂 → 预测正确 → 独立补全</strong><small>迁移题通过后，系统才会把这项能力视为更强证据。</small></div>
      </section>}
    </main>
  </div>;
}

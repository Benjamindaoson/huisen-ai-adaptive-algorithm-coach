import { useMemo, useState } from 'react';
import { ALGORITHM_KNOWLEDGE_GRAPH } from '../lib/algorithm-knowledge-graph';
import {
  DIAGNOSTIC_STEPS,
  DIAGNOSTIC_OBSERVATION_COPY,
  buildBridgePlan,
  deriveDiagnosticSnapshot,
  type DiagnosticStep,
} from '../lib/bridge-journey';
import type { LearningEvent, LearningSignal } from '../lib/learner-memory';
import { projectBridgeLearningAction } from '../lib/projected-learning-action';

type Props = {
  events: LearningEvent[];
  onSignal: (signal: LearningSignal) => void;
  onStartTraining: (lessonId: string) => void;
};

type Question = {
  step: DiagnosticStep;
  eyebrow: string;
  title: string;
  description: string;
  code?: string;
  options: string[];
  answer: number;
};

const QUESTIONS: Record<DiagnosticStep, Question> = {
  state: {
    step: 'state',
    eyebrow: '读懂程序状态',
    title: '这段代码运行后，total 是多少？',
    description: '不用心算速度，只看你能不能跟住变量的变化。',
    code: 'total = 3\ntotal = total + 5',
    options: ['5', '8', '15'],
    answer: 1,
  },
  implementation: {
    step: 'implementation',
    eyebrow: '把想法写成代码',
    title: '要逐个处理 scores，第一行应该怎么写？',
    description: '这不是完整编程题，只检查“重复处理”能不能落成一个动作。',
    options: ['for score in scores:', 'if score in scores:', 'return scores'],
    answer: 0,
  },
  modeling: {
    step: 'modeling',
    eyebrow: '把题意变成状态',
    title: '要快速判断一个数字是否重复，最需要保存什么？',
    description: '先选需要记住的信息，再决定用哪种算法。',
    options: ['已经见过的数字', '所有数字的总和', '最后一个数字'],
    answer: 0,
  },
};

function effectiveEvents(events: LearningEvent[], localResults: Partial<Record<DiagnosticStep, boolean>>): LearningEvent[] {
  const persistedSteps = new Set(events
    .filter((event) => event.kind === 'bridge-diagnostic-step-recorded' && event.data.curriculumVersion === ALGORITHM_KNOWLEDGE_GRAPH.version)
    .map((event) => event.data.diagnosticStep));
  const now = Date.now();
  const optimisticEvents = DIAGNOSTIC_STEPS.flatMap((step, index): LearningEvent[] => {
    if (persistedSteps.has(step) || localResults[step] === undefined) return [];
    return [{
      id: `optimistic-${step}`,
      learnerId: events[0]?.learnerId ?? 'local-diagnostic',
      kind: 'bridge-diagnostic-step-recorded',
      data: { curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, diagnosticStep: step, correct: localResults[step] },
      createdAt: new Date(now + index).toISOString(),
    }];
  });
  return [...events, ...optimisticEvents];
}

export function BridgeEntryDiagnosis({ events, onSignal, onStartTraining }: Props) {
  const persistedSnapshot = deriveDiagnosticSnapshot(events);
  const [started, setStarted] = useState(persistedSnapshot.status !== 'not-started');
  const [localResults, setLocalResults] = useState<Partial<Record<DiagnosticStep, boolean>>>({});
  const projectedEvents = useMemo(() => effectiveEvents(events, localResults), [events, localResults]);
  const snapshot = deriveDiagnosticSnapshot(projectedEvents);
  const plan = buildBridgePlan(projectedEvents);
  const projectedAction = projectBridgeLearningAction(projectedEvents);

  function startDiagnosis() {
    setStarted(true);
    onSignal({ kind: 'bridge-diagnostic-started', data: { curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version } });
  }

  function answerQuestion(question: Question, optionIndex: number) {
    const correct = optionIndex === question.answer;
    setLocalResults((current) => ({ ...current, [question.step]: correct }));
    onSignal({
      kind: 'bridge-diagnostic-step-recorded',
      data: { curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, diagnosticStep: question.step, correct },
    });
  }

  if (snapshot.status === 'complete' && plan) {
    return <section className="bridge-entry bridge-entry-result" aria-labelledby="bridge-diagnosis-result-title">
      <header className="bridge-entry-heading">
        <div><span className="bridge-ai-mark">AI</span><span><small>入口诊断已经形成第一版判断</small><strong>我没有给你打一个模糊的总分</strong></span></div>
        <em>基于 {snapshot.evidenceRefs.length} 个诊断动作</em>
      </header>
      <div className="bridge-result-grid">
        <article className="bridge-bottleneck">
          <span>目前最可能的卡点</span>
          <h2 id="bridge-diagnosis-result-title">{snapshot.bottleneck}</h2>
          <p>{snapshot.claim}</p>
          <div className="bridge-evidence-receipt">
            <span>AI 实际使用的诊断证据</span>
            <ul aria-label="AI 使用的诊断证据">
              {snapshot.observations.map((observation) => <li className={observation.result} key={observation.evidenceRef}>
                <span><strong>{DIAGNOSTIC_OBSERVATION_COPY[observation.step].label}</strong><em>{observation.result === 'stable' ? '稳定' : '需要补强'}</em></span>
                <small>{DIAGNOSTIC_OBSERVATION_COPY[observation.step].detail}</small>
              </li>)}
            </ul>
            <p>这些动作只用于安排起点，不等于掌握证明。</p>
          </div>
          <small>{snapshot.uncertainty}</small>
        </article>
        <article className="bridge-mission-card">
          <span>AI 为你安排的第一段训练 · {plan.estimatedMinutes} 分钟</span>
          <h3>{plan.title}</h3>
          <dl>
            <div><dt>这段训练目标</dt><dd>{plan.goal}</dd></div>
            <div><dt>开始前需要</dt><dd>{plan.prerequisite}</dd></div>
            <div><dt>为什么从这里开始</dt><dd>{plan.reason}</dd></div>
            <div><dt>完成后能做到</dt><dd>{plan.gain}</dd></div>
            <div><dt>怎样才算学会</dt><dd>{plan.completionCriterion}</dd></div>
            <div><dt>判断可靠度</dt><dd>{plan.confidenceBand === 'medium' ? '中等：基于三个入口动作，还要由真实训练继续校准。' : '较低：当前证据有限。'}</dd></div>
            <div><dt>什么会改变计划</dt><dd>{plan.changesWhen}</dd></div>
          </dl>
          <button type="button" className="primary-action" onClick={() => onStartTraining(plan.entryLessonId)}>{projectedAction.label}</button>
        </article>
      </div>
    </section>;
  }

  if (!started && snapshot.status === 'not-started') {
    return <section className="bridge-entry bridge-entry-intro" aria-labelledby="bridge-diagnosis-title">
      <div className="bridge-entry-copy">
        <span className="section-kicker">你的第一分钟</span>
        <h2 id="bridge-diagnosis-title">先让 AI 看见你怎么思考</h2>
        <p>不用填长问卷，也不用先做一道完整算法题。三个小动作分别看你如何读状态、写步骤、做建模，然后只安排最短的下一段训练。</p>
        <ul><li>不展示参考答案</li><li>不按学历猜基础</li><li>诊断中断后可继续</li></ul>
      </div>
      <aside><span className="bridge-diagnostic-orb"><i /><b>AI</b></span><strong>约 3 分钟</strong><small>3 个真实学习动作</small><button type="button" className="primary-action" onClick={startDiagnosis}>{projectedAction.label}</button></aside>
    </section>;
  }

  const step = snapshot.nextStep ?? 'state';
  const question = QUESTIONS[step];
  const stepNumber = DIAGNOSTIC_STEPS.indexOf(step) + 1;
  return <section className="bridge-entry bridge-entry-question" aria-labelledby="bridge-question-title">
    <header><div><span className="bridge-ai-mark">AI</span><span><small>正在观察：{question.eyebrow}</small><strong>第 {stepNumber} / 3 步</strong></span></div><div className="bridge-progress" aria-label={`诊断进度 ${stepNumber} / 3`}><i style={{ width: `${((stepNumber - 1) / 3) * 100}%` }} /></div></header>
    <div className="bridge-question-body">
      <div><h2 id="bridge-question-title">{question.title}</h2><p>{question.description}</p>{question.code && <pre><code>{question.code}</code></pre>}</div>
      <div className="bridge-options">{question.options.map((option, index) => <button type="button" key={option} onClick={() => answerQuestion(question, index)}>{option}</button>)}</div>
    </div>
    <footer>{snapshot.completedSteps.length ? `已保留 ${snapshot.completedSteps.length} 个动作，下次会从这里继续。` : '你的选择只用于安排学习起点，不作最终能力评价。'}</footer>
  </section>;
}

import { useEffect } from 'react';
import type { DailyPlanItem } from '../lib/daily-plan';
import { getSkill } from '../lib/skills';
import type { LearnerProfile } from '../lib/learner-memory';
import type { AgentDecision, LearningAction } from '../lib/learning-orchestrator';
import { LearnerGoalCard } from '../components/LearnerGoalCard';
import type { FoundationLesson } from '../lib/foundation-curriculum';
import type { LearningEvent } from '../lib/learner-memory';
import { explainAdaptivePlan } from '../lib/adaptive-plan-explanation';
import { buildGrowthReplay, buildTrainingSession } from '../lib/ai-training';
import { BridgeEntryDiagnosis } from '../components/BridgeEntryDiagnosis';
import type { LearningSignal } from '../lib/learner-memory';

type Props = {
  plan: DailyPlanItem[];
  evidenceCount: number;
  reviewCount: number;
  completedCount: number;
  onOpen: (problemId: string) => void;
  decision?: AgentDecision;
  profile?: LearnerProfile;
  onSaveProfile?: (patch: Pick<LearnerProfile, 'target' | 'examDate' | 'dailyMinutes' | 'preferredLanguage'>) => void;
  foundationLesson?: FoundationLesson | null;
  starterLesson?: FoundationLesson | null;
  trainingLesson?: FoundationLesson | null;
  onLearn?: (lessonId: string) => void;
  onStartTraining?: (lessonId: string) => void;
  onAcknowledgeMission?: () => void;
  onMissionSeen?: (lessonId: string) => void;
  onLearningSignal?: (signal: LearningSignal) => void;
  events?: LearningEvent[];
};

const kindLabels: Record<DailyPlanItem['kind'], string> = {
  review: '到期复习', weakness: '薄弱强化', transfer: '迁移练习', baseline: '能力诊断',
};

function kindLabel(kind: DailyPlanItem['kind'] | 'mastery-check'): string {
  return kind === 'mastery-check' ? '独立验证' : kindLabels[kind];
}

function describeMicroTask(item: DailyPlanItem | LearningAction) {
  const minutes = 'estimatedMinutes' in item ? item.estimatedMinutes : item.kind === 'review' ? 15 : item.kind === 'baseline' ? 18 : item.kind === 'transfer' ? 25 : 20;
  const skill = getSkill(item.skillId);
  const gain = item.kind === 'review'
    ? `验证你是否还能独立用好「${skill.title}」，而不是只记得上次答案。`
    : item.kind === 'transfer'
      ? `在不同题面中再次使用「${skill.title}」，把会做一道题变成掌握一个方法。`
      : item.kind === 'baseline'
        ? `留下第一次真实代码证据，让之后的推荐不再靠猜。`
        : `把「${skill.title}」里的薄弱环节变成一次可验证的独立通过。`;
  return { minutes, prerequisite: `先用一句话说出：这题与「${skill.title}」有什么关系。`, gain };
}

export function TodayPage({ plan, evidenceCount, reviewCount, completedCount, onOpen, decision, profile, onSaveProfile, foundationLesson, starterLesson, trainingLesson, onLearn, onStartTraining, onAcknowledgeMission, onMissionSeen, onLearningSignal, events = [] }: Props) {
  const actionPlan = decision?.actions.length ? decision.actions : plan;
  const primary = actionPlan[0];
  const primaryTask = primary ? describeMicroTask(primary) : null;
  const explanation = decision ? explainAdaptivePlan(decision, events) : null;
  const trainingSession = trainingLesson ? buildTrainingSession(trainingLesson, events) : null;
  const trainingReplay = trainingLesson ? buildGrowthReplay(trainingLesson, events) : null;
  const showBridgeDiagnosis = evidenceCount === 0 && Boolean(onLearningSignal && onStartTraining);
  useEffect(() => {
    if (!showBridgeDiagnosis && evidenceCount === 0 && starterLesson) onMissionSeen?.(starterLesson.id);
  }, [evidenceCount, onMissionSeen, showBridgeDiagnosis, starterLesson]);
  return <div className="module-page today-page">
    <header className="module-header today-hero">
      <div><span className="section-kicker">今日学习计划</span><h1>不是完成更多，<br/><em>而是掌握得更深。</em></h1><p>今天只做一个能带来明确进步的小任务；完成后，系统再依据你的实际表现安排下一步。</p></div>
      <time>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</time>
    </header>

    {showBridgeDiagnosis && onLearningSignal && onStartTraining ? <BridgeEntryDiagnosis events={events} onSignal={onLearningSignal} onStartTraining={onStartTraining} /> : <section className="ai-brief-card" aria-labelledby="today-primary-title">
      <div className="ai-brief-label"><span className="ai-orbit"><i /></span><span><strong>{evidenceCount ? '导师已根据你的学习记录安排下一步' : '先用一个小任务建立学习起点'}</strong><small>{evidenceCount ? `基于 ${evidenceCount} 条练习证据` : '完成后，系统才会依据你的真实表现继续安排'}</small></span>{decision && <em>{decision.mode === 'mastery-check' ? '独立掌握验证' : decision.strategy === 'sprint' ? '冲刺模式' : decision.mode === 'baseline' ? '起点诊断' : '个性化计划'}</em>}</div>
      {evidenceCount === 0 && starterLesson && (onStartTraining ?? onLearn) ? <div className="ai-brief-content starter-mission">
        <div><span className="task-chip">AI 入门训练 · 约 10 分钟</span><h2 id="today-primary-title">AI 先带你建立第一个算法直觉</h2><h3>{starterLesson.plainTitle}</h3><p>{starterLesson.objective}</p>
          <ul className="starter-mission-details"><li><strong>开始前</strong><span>{starterLesson.prerequisites.length ? '先完成上一节小课' : '不需要算法基础，只要会跟着例子观察'}</span></li><li><strong>完成后你将能够</strong><span>{starterLesson.transfer.prompt}</span></li><li><strong>为什么先学这个</strong><span>这是所有后续刷题都能反复用到的第一块算法直觉。</span></li></ul>
          {onAcknowledgeMission && <button type="button" className="mission-reason-action" onClick={onAcknowledgeMission}>我明白为什么从这里开始</button>}</div>
        <button type="button" className="primary-action" onClick={() => (onStartTraining ?? onLearn)?.(starterLesson.id)}>开始 AI 训练 <span>→</span></button>
      </div> : profile?.target === 'foundation' && foundationLesson && onLearn ? <div className="ai-brief-content foundation-today">
        <div><span className="task-chip">零基础起步 · 第 {foundationLesson.order} 节</span><h2 id="today-primary-title">今天先建立一个代码直觉</h2><h3>{foundationLesson.title}</h3><p>{foundationLesson.objective} 系统选择它，是因为它是当前最早已解锁、尚未完成的小课。</p></div>
        <button type="button" className="primary-action" onClick={() => onLearn(foundationLesson.id)}>开始小课<span>→</span></button>
      </div> : primary ? <div className="ai-brief-content">
        <div><span className="task-chip">{kindLabel(primary.kind)} · 预计 {primaryTask?.minutes} 分钟</span><h2 id="today-primary-title">今天先完成这一件事</h2><h3>{primary.title}</h3><p>{primary.reason}</p>
          {primaryTask && <ul className="starter-mission-details task-mission-details"><li><strong>开始前</strong><span>{primaryTask.prerequisite}</span></li><li><strong>完成后你将能够</strong><span>{primaryTask.gain}</span></li></ul>}</div>
        <button type="button" className="primary-action" onClick={() => onOpen(primary.problemId)}>开始练习 <span>→</span></button>
      </div> : <div className="empty-panel"><h2 id="today-primary-title">今天的任务已清空</h2><p>去题库选择一道新题，继续积累有效证据。</p></div>}
    </section>}

    {!showBridgeDiagnosis && trainingLesson && trainingSession && trainingReplay && <section className="today-training-map" aria-labelledby="today-training-map-title">
      <header><div><span className="section-kicker">AI 成长地图</span><h2 id="today-training-map-title">不是多做一题，而是建立一个可迁移的动作</h2></div><span>{trainingSession.diagnosis.kind === 'baseline' ? '正在建立起点' : '根据你的记录更新'}</span></header>
      <div className="today-training-map-grid"><article className="map-current"><span>现在正在建立</span><strong>{trainingLesson.plainTitle}</strong><p>{trainingSession.diagnosis.claim}</p><small>{trainingSession.diagnosis.evidenceLabel}</small></article><article><span>已经留下的证据</span><strong>{trainingReplay.completedStageIds.length ? `${trainingReplay.completedStageIds.length} 个训练动作` : '还没有训练证据'}</strong><p>{trainingReplay.evidence.map((item) => item.label).join(' · ') || '完成一次预测和关键代码动作后，AI 才会更新这里。'}</p></article><article className={trainingReplay.transfer.status}><span>还差哪一步</span><strong>{trainingReplay.transfer.status === 'verified' ? '独立迁移已验证' : '独立迁移待验证'}</strong><p>{trainingReplay.transfer.detail}</p></article></div>
      <footer><div><span>AI 为什么这样安排</span><p>{trainingReplay.nextAction}</p></div>{(onStartTraining ?? onLearn) && <button type="button" className="mission-reason-action" onClick={() => (onStartTraining ?? onLearn)?.(trainingLesson.id)}>进入训练舱 →</button>}</footer>
    </section>}

    {!showBridgeDiagnosis && <section className="today-metrics" aria-label="今日学习概览">
      <article><span>有效提交</span><strong>{evidenceCount}</strong><small>用于能力判断</small></article>
      <article><span>到期复习</span><strong>{reviewCount}</strong><small>{reviewCount ? '建议今天完成' : '当前没有积压'}</small></article>
      <article><span>已掌握</span><strong>{completedCount}</strong><small>继续保持稳定输出</small></article>
    </section>}

    {!showBridgeDiagnosis && (profile || decision) && <section className="agent-context-grid">
      {profile && onSaveProfile && <LearnerGoalCard profile={profile} onSave={onSaveProfile} />}
      {decision && <article className="agent-decision-card"><header><div><span className="ai-mark">AI</span><div><strong>为什么是这一步</strong><small>置信度 {Math.round(decision.confidence * 100)}%</small></div></div><code>{decision.traceId}</code></header><p>{decision.summary}</p><ul>{decision.evidence.slice(0, 3).map((item) => <li key={item.ref}>{item.summary}</li>)}</ul><details><summary>查看规划依据（规则计算）</summary>{decision.tools.map((tool) => <div className="agent-tool-row" key={tool.name}><code>{tool.name}</code><span>{tool.summary}</span></div>)}</details></article>}
    </section>}

    {!showBridgeDiagnosis && explanation && <section className="adaptation-map" aria-labelledby="adaptation-map-title">
      <header><div><span className="section-kicker">学习依据</span><h2 id="adaptation-map-title">为什么安排这一步</h2></div><span className={explanation.personalization}>{explanation.personalization === 'baseline' ? '刚开始学习' : '根据练习表现调整'}</span></header>
      <div className="adaptation-reason"><span>为什么是现在</span><strong>{explanation.whyNow}</strong><small>置信度 {Math.round(explanation.confidence * 100)}% · {explanation.skillGap}</small></div>
      <div className="adaptation-signals"><article><span>帮助依赖</span><p>{explanation.assistanceSignal}</p></article><article><span>迁移 / 复测</span><p>{explanation.reviewSignal}</p></article></div>
      <ol>{explanation.evidence.map((item, index) => <li key={`${item.ref}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><code>{item.ref}</code></li>)}</ol>
      <footer><span>什么会改变计划</span><p>{explanation.changesWhen}</p></footer>
    </section>}

    {!showBridgeDiagnosis && actionPlan.length > 1 && <section className="today-queue">
      <div className="section-title"><div><span className="section-kicker">接下来</span><h2>完成后继续</h2></div><span>{actionPlan.length - 1} 项</span></div>
      <div className="compact-task-list">{actionPlan.slice(1, 3).map((item, index) => <button type="button" key={item.problemId} onClick={() => onOpen(item.problemId)}>
        <span className="queue-number">0{index + 2}</span><span><em>{kindLabel(item.kind)} · {getSkill(item.skillId).title}</em><strong>{item.title}</strong><small>{item.reason}</small></span><b>→</b>
      </button>)}</div>
    </section>}
  </div>;
}

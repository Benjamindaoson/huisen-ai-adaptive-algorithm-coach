import type { DailyPlanItem } from '../lib/daily-plan';
import { getSkill } from '../lib/skills';
import type { LearnerProfile } from '../lib/learner-memory';
import type { AgentDecision } from '../lib/learning-orchestrator';
import { LearnerGoalCard } from '../components/LearnerGoalCard';
import type { FoundationLesson } from '../lib/foundation-curriculum';

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
  onLearn?: (lessonId: string) => void;
};

const kindLabels: Record<DailyPlanItem['kind'], string> = {
  review: '到期复习', weakness: '薄弱强化', transfer: '迁移练习', baseline: '能力诊断',
};

function kindLabel(kind: DailyPlanItem['kind'] | 'mastery-check'): string {
  return kind === 'mastery-check' ? '独立验证' : kindLabels[kind];
}

export function TodayPage({ plan, evidenceCount, reviewCount, completedCount, onOpen, decision, profile, onSaveProfile, foundationLesson, onLearn }: Props) {
  const actionPlan = decision?.actions.length ? decision.actions : plan;
  const primary = actionPlan[0];
  return <div className="module-page today-page">
    <header className="module-header">
      <div><span className="section-kicker">TODAY</span><h1>今天，只向前走一步。</h1><p>学习教练会根据你的提交证据安排下一题，而不是让你在题库里迷路。</p></div>
      <time>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</time>
    </header>

    <section className="ai-brief-card" aria-labelledby="today-primary-title">
      <div className="ai-brief-label"><span className="ai-mark">AI</span><span>学习编排决策 · {evidenceCount ? `基于 ${evidenceCount} 条练习证据` : '等待首次提交建立基线'}</span>{decision && <em>{decision.mode === 'mastery-check' ? '独立掌握验证' : decision.strategy === 'sprint' ? '冲刺模式' : decision.mode === 'baseline' ? '基线诊断' : '自适应计划'}</em>}</div>
      {profile?.target === 'foundation' && foundationLesson && onLearn ? <div className="ai-brief-content foundation-today">
        <div><span className="task-chip">零基础起步 · 第 {foundationLesson.order} 节</span><h2 id="today-primary-title">今天先建立一个代码直觉</h2><h3>{foundationLesson.title}</h3><p>{foundationLesson.objective} 系统选择它，是因为它是当前最早已解锁、尚未完成的小课。</p></div>
        <button type="button" className="primary-action" onClick={() => onLearn(foundationLesson.id)}>开始小课<span>→</span></button>
      </div> : primary ? <div className="ai-brief-content">
        <div><span className="task-chip">{kindLabel(primary.kind)} · {getSkill(primary.skillId).title}</span><h2 id="today-primary-title">今天先完成这一件事</h2><h3>{primary.title}</h3><p>{primary.reason}</p></div>
        <button type="button" className="primary-action" onClick={() => onOpen(primary.problemId)}>开始练习 <span>→</span></button>
      </div> : <div className="empty-panel"><h2 id="today-primary-title">今天的任务已清空</h2><p>去题库选择一道新题，继续积累有效证据。</p></div>}
    </section>

    <section className="today-metrics" aria-label="今日学习概览">
      <article><span>有效提交</span><strong>{evidenceCount}</strong><small>用于能力判断</small></article>
      <article><span>到期复习</span><strong>{reviewCount}</strong><small>{reviewCount ? '建议今天完成' : '当前没有积压'}</small></article>
      <article><span>已掌握</span><strong>{completedCount}</strong><small>继续保持稳定输出</small></article>
    </section>

    {(profile || decision) && <section className="agent-context-grid">
      {profile && onSaveProfile && <LearnerGoalCard profile={profile} onSave={onSaveProfile} />}
      {decision && <article className="agent-decision-card"><header><div><span className="ai-mark">AI</span><div><strong>为什么是这一步</strong><small>置信度 {Math.round(decision.confidence * 100)}%</small></div></div><code>{decision.traceId}</code></header><p>{decision.summary}</p><ul>{decision.evidence.slice(0, 3).map((item) => <li key={item.ref}>{item.summary}</li>)}</ul><details><summary>查看规划依据（规则计算）</summary>{decision.tools.map((tool) => <div className="agent-tool-row" key={tool.name}><code>{tool.name}</code><span>{tool.summary}</span></div>)}</details></article>}
    </section>}

    {actionPlan.length > 1 && <section className="today-queue">
      <div className="section-title"><div><span className="section-kicker">UP NEXT</span><h2>完成后继续</h2></div><span>{actionPlan.length - 1} 项</span></div>
      <div className="compact-task-list">{actionPlan.slice(1, 3).map((item, index) => <button type="button" key={item.problemId} onClick={() => onOpen(item.problemId)}>
        <span className="queue-number">0{index + 2}</span><span><em>{kindLabel(item.kind)} · {getSkill(item.skillId).title}</em><strong>{item.title}</strong><small>{item.reason}</small></span><b>→</b>
      </button>)}</div>
    </section>}
  </div>;
}

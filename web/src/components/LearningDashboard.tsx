import type { DailyPlanItem } from '../lib/daily-plan';
import type { SkillMastery } from '../lib/mastery';
import type { MistakeReviewCard } from '../lib/mistake-review';
import { getSkill } from '../lib/skills';

type Props = {
  plan: DailyPlanItem[];
  mastery: SkillMastery[];
  reviewCards: MistakeReviewCard[];
  onOpen: (problemId: string) => void;
};

const kindLabels: Record<DailyPlanItem['kind'], string> = {
  review: '到期复习',
  weakness: '薄弱强化',
  transfer: '迁移练习',
  baseline: '基线诊断',
};

const mistakeLabels: Record<MistakeReviewCard['outcome'], string> = {
  'wrong-answer': '答案错误',
  'compile-error': '编译错误',
  'runtime-error': '运行错误',
  timeout: '运行超时',
};

export function LearningDashboard({ plan, mastery, reviewCards, onOpen }: Props) {
  const evidenceCount = mastery.reduce((sum, item) => sum + item.evidenceCount, 0);
  const visibleSkills = [...mastery]
    .sort((left, right) => Number(right.evidenceCount > 0) - Number(left.evidenceCount > 0) || left.score - right.score)
    .slice(0, 6);

  return <section className="learning-dashboard" aria-labelledby="daily-plan-title">
    <div className="daily-plan-column">
      <div className="dashboard-heading"><div><p className="eyebrow">TODAY'S PLAN</p><h2 id="daily-plan-title">今日训练</h2></div><span>{evidenceCount ? `基于 ${evidenceCount} 条技能证据` : '等待首次样例提交'}</span></div>
      <div className="daily-plan-list">{plan.map((item, index) => <button type="button" className="daily-plan-card" key={item.problemId} onClick={() => onOpen(item.problemId)}>
        <span className="plan-index">0{index + 1}</span>
        <span className="plan-copy"><em>{kindLabels[item.kind]} · {getSkill(item.skillId).title}</em><strong>{item.title}</strong><small>{item.reason}</small></span>
        <b>开始 →</b>
      </button>)}</div>
      {reviewCards.length > 0 && <section className="mistake-review" aria-labelledby="mistake-review-title">
        <div className="mistake-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h3 id="mistake-review-title">错题复练</h3></div><span>{reviewCards.filter((card) => card.due).length} 条已到期</span></div>
        <div className="mistake-list">{reviewCards.slice(0, 3).map((card) => <button type="button" className="mistake-card" key={`${card.problemId}:${card.language}`} onClick={() => onOpen(card.problemId)}>
          <span className={`mistake-dot ${card.outcome}`} />
          <span><em>{mistakeLabels[card.outcome]} · {card.language}</em><strong>{card.title}</strong><small>{card.summary}</small></span>
          <b>{card.due ? '现在复练' : '计划复练'} →</b>
        </button>)}</div>
      </section>}
    </div>
    <aside className="mastery-card" aria-labelledby="mastery-title">
      <div className="dashboard-heading"><div><p className="eyebrow">SKILL MAP</p><h2 id="mastery-title">能力图谱</h2></div><span>规则 v1 · 可解释</span></div>
      {!evidenceCount && <p className="mastery-empty">当前数值不是 AI 猜测。完成一次“样例提交”后，系统才会用通过/错误证据更新掌握度。</p>}
      <div className="mastery-list">{visibleSkills.map((item) => <div className="mastery-row" key={item.skillId}>
        <div><strong>{getSkill(item.skillId).title}</strong><span>{item.evidenceCount ? `${Math.round(item.score * 100)}% · 置信度 ${Math.round(item.confidence * 100)}%` : '待诊断'}</span></div>
        <div className="mastery-track" aria-label={`${getSkill(item.skillId).title}掌握度`}><i style={{ width: item.evidenceCount ? `${Math.round(item.score * 100)}%` : '4%' }} /></div>
      </div>)}</div>
    </aside>
  </section>;
}

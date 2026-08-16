import type { MistakeReviewCard } from '../lib/mistake-review';
import { getSkill } from '../lib/skills';
import type { DelayedReviewAssignment } from '../lib/delayed-review';
import type { SkillId } from '../lib/skills';

type Props = { cards: MistakeReviewCard[]; delayedReviews?: DelayedReviewAssignment[]; onOpen: (id: string) => void; onOpenDelayed?: (item: DelayedReviewAssignment) => void };
const outcomeLabels = { 'wrong-answer': '答案错误', 'compile-error': '编译错误', 'runtime-error': '运行错误', timeout: '运行超时' } as const;

export function ReviewPage({ cards, delayedReviews = [], onOpen, onOpenDelayed }: Props) {
  const due = cards.filter((card) => card.due);
  const later = cards.filter((card) => !card.due);
  const masteryDue = delayedReviews.filter((item) => item.due);
  return <div className="module-page review-page">
    <header className="module-header"><div><span className="section-kicker">REPAIR LOOP</span><h1>错因复练</h1><p>不按题目收藏错误，而是按具体误区修复。重做、迁移和延迟复测通过后才真正离开队列。</p></div><strong className="header-count">{due.length}<small> 已到期</small></strong></header>
    {masteryDue.length > 0 && <section className="review-group mastery-review-group"><div className="section-title"><h2>延迟掌握复测</h2><span>{masteryDue.length}</span></div><div className="review-list">{masteryDue.map((item) => <article className="review-card" key={item.transferEventId}><span className="review-status" /><div><div className="review-card-meta"><span>第 {item.intervalIndex + 1} 次延迟复测</span><span>{item.status === 'failed' ? '上次未通过' : '已到期'}</span></div><h3>{getSkill(item.skillId as SkillId).title}</h3><p>来源证据：{item.evidenceRefs.join(' · ')}</p></div><button type="button" disabled={!item.reviewProblemId} onClick={() => item.reviewProblemId && onOpenDelayed?.(item)}>{item.reviewProblemId ? '开始独立复测 →' : '等待不同题面'}</button></article>)}</div></section>}
    {!cards.length ? <div className="empty-state-card"><span>✓</span><h2>当前没有待复练错题</h2><p>{masteryDue.length ? '错题已清空；请完成上方延迟复测。' : '样例提交失败后，系统会在这里安排复练。'}</p></div> : <>
      <section className="review-group"><div className="section-title"><h2>现在复练</h2><span>{due.length}</span></div><div className="review-list">{due.map((card) => <ReviewCard key={card.attemptId} card={card} onOpen={onOpen} />)}</div></section>
      {later.length > 0 && <section className="review-group"><div className="section-title"><h2>计划中</h2><span>{later.length}</span></div><div className="review-list">{later.map((card) => <ReviewCard key={card.attemptId} card={card} onOpen={onOpen} />)}</div></section>}
    </>}
  </div>;
}

function ReviewCard({ card, onOpen }: { card: MistakeReviewCard; onOpen: (id: string) => void }) {
  return <article className="review-card"><span className={`review-status ${card.outcome}`} />
    <div><div className="review-card-meta"><span>{outcomeLabels[card.outcome]}</span><span>{card.language}</span>{card.skills.slice(0, 2).map((id) => <span key={id}>{getSkill(id).title}</span>)}</div><h3>{card.title}</h3><p>{card.summary}</p></div>
    <button type="button" onClick={() => onOpen(card.problemId)}>重新练习 →</button>
  </article>;
}

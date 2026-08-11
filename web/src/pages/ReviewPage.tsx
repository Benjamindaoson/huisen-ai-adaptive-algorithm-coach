import type { MistakeReviewCard } from '../lib/mistake-review';
import { getSkill } from '../lib/skills';

type Props = { cards: MistakeReviewCard[]; onOpen: (id: string) => void };
const outcomeLabels = { 'wrong-answer': '答案错误', 'compile-error': '编译错误', 'runtime-error': '运行错误', timeout: '运行超时' } as const;

export function ReviewPage({ cards, onOpen }: Props) {
  const due = cards.filter((card) => card.due);
  const later = cards.filter((card) => !card.due);
  return <div className="module-page review-page">
    <header className="module-header"><div><span className="section-kicker">REVIEW</span><h1>错题本</h1><p>这里只保留仍未解决的错误。重做成功后，它会自动离开队列。</p></div><strong className="header-count">{due.length}<small> 已到期</small></strong></header>
    {!cards.length ? <div className="empty-state-card"><span>✓</span><h2>当前没有待复练错题</h2><p>样例提交失败后，系统会在这里安排复练。</p></div> : <>
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

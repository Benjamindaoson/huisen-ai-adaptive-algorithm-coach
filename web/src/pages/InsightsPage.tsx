import type { SkillMastery } from '../lib/mastery';
import { getSkill } from '../lib/skills';

type Props = { mastery: SkillMastery[] };

export function InsightsPage({ mastery }: Props) {
  const evidence = mastery.filter((item) => item.evidenceCount > 0).sort((a, b) => a.score - b.score);
  const total = evidence.reduce((sum, item) => sum + item.evidenceCount, 0);
  return <div className="module-page insights-page">
    <header className="module-header"><div><span className="section-kicker">INSIGHTS</span><h1>能力报告</h1><p>每个判断都来自真实样例提交；没有证据时，我们不会假装了解你。</p></div><strong className="header-count">{total}<small> 条证据</small></strong></header>
    {!evidence.length ? <div className="empty-state-card"><span>AI</span><h2>先完成一次样例提交</h2><p>提交后，系统会建立能力基线、识别薄弱点并解释下一题推荐。</p></div> : <div className="insights-layout">
      <section className="skill-report"><div className="section-title"><h2>技能掌握度</h2><span>规则模型 v1 · 可解释</span></div>{evidence.map((item) => <article className="skill-report-row" key={item.skillId}><div><strong>{getSkill(item.skillId).title}</strong><small>{item.evidenceCount} 条证据 · 置信度 {Math.round(item.confidence * 100)}%</small></div><div className="skill-meter"><i style={{ width: `${Math.round(item.score * 100)}%` }} /></div><b>{Math.round(item.score * 100)}%</b></article>)}</section>
      <aside className="insight-coach-card"><span className="ai-mark">AI</span><h2>教练判断</h2><p>{getSkill(evidence[0].skillId).title}是当前最值得投入的薄弱项。</p><small>依据：{evidence[0].evidenceCount} 次相关提交，最近掌握度 {Math.round(evidence[0].score * 100)}%。</small><a href="#/today">查看今日推荐 →</a></aside>
    </div>}
  </div>;
}

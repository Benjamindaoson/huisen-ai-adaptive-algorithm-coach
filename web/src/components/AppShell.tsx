import { useState, type ReactNode } from 'react';
import { hrefFor, type ModuleRouteName } from '../lib/routes';
import { LEARNER_MODULES, MOBILE_PRIMARY_LABELS, PRIMARY_MOBILE_MODULES, SECONDARY_MOBILE_MODULES, learnerModule, type LearnerModule } from '../lib/navigation';

type Props = {
  activeRoute: ModuleRouteName;
  onExport: () => void;
  onImport: () => void;
  mentor?: ReactNode;
  account?: ReactNode;
  catalogCount?: number;
  immersive?: boolean;
  children: ReactNode;
};

function NavGlyph({ glyph }: { glyph: LearnerModule['glyph'] }) {
  const paths = {
    spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/></>,
    learn: <><path d="M4 5.5c3-1.5 5.7-.8 8 1.2v12c-2.3-2-5-2.7-8-1.2z"/><path d="M20 5.5c-3-1.5-5.7-.8-8 1.2v12c2.3-2 5-2.7 8-1.2z"/></>,
    code: <><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></>,
    project: <><path d="M4 7h6l2 2h8v10H4z"/><path d="M8 13h8M8 16h5"/></>,
    review: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>,
    exam: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
    insights: <><path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/></>,
  } as const;
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[glyph]}</svg>;
}

export function AppShell({ activeRoute, onExport, onImport, mentor, account, catalogCount = 0, immersive = false, children }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const current = learnerModule(activeRoute);
  const secondaryActive = SECONDARY_MOBILE_MODULES.some((item) => item.name === activeRoute) || activeRoute === 'trust' || activeRoute === 'quality';
  const systemWorkspace = activeRoute === 'trust'
    ? { label: '信任与数据', description: '数据来源、评价边界与学习者控制' }
    : { label: '质量实验室', description: '教师裁决、内容可信度与模型回归门禁' };
  const description = activeRoute === 'problems' && catalogCount
    ? `${catalogCount} 道真实题目 · 可搜索 · 可运行`
    : current?.description ?? systemWorkspace.description;
  return <div className={`app-frame ${mentor ? 'with-mentor' : ''} ${immersive ? 'immersive-training' : ''}`}>
    <aside className="app-sidebar">
      <a className="app-brand" href={hrefFor({ name: 'today' })} aria-label="汇森AI 算法教练首页">
        <span>汇</span><div><strong>汇森AI 算法教练</strong><small>独立做出下一道题</small></div>
      </a>
      <nav className="app-nav" aria-label="主要导航">
        {LEARNER_MODULES.map((item) => <a
          key={item.name}
          href={hrefFor({ name: item.name })}
          className={activeRoute === item.name ? 'active' : ''}
          aria-current={activeRoute === item.name ? 'page' : undefined}
        ><span className="nav-step" aria-hidden="true">{item.step}</span><span className="nav-glyph"><NavGlyph glyph={item.glyph} /></span><strong>{item.label}</strong></a>)}
      </nav>
      <div className="sidebar-utility-label">数据与质量</div>
      <nav className="app-utility-nav" aria-label="系统工具">
        <a href={hrefFor({ name: 'trust' })} className={activeRoute === 'trust' ? 'active' : ''} aria-current={activeRoute === 'trust' ? 'page' : undefined}><span>◎</span><strong>信任与数据</strong></a>
        <a href={hrefFor({ name: 'quality' })} className={activeRoute === 'quality' ? 'active' : ''} aria-current={activeRoute === 'quality' ? 'page' : undefined}><span>◇</span><strong>质量实验室</strong></a>
      </nav>
      <section className="sidebar-coach-note" aria-label="AI 教练状态">
        <span className="mentor-pulse" />
        <div><strong>学习编排在线</strong><small>根据你的学习证据安排下一步</small></div>
      </section>
      <div className="sidebar-data-actions">
        <button type="button" onClick={onExport} aria-label="导出学习数据">导出</button>
        <button type="button" onClick={onImport} aria-label="导入学习数据">导入</button>
      </div>
    </aside>
    <main className="app-main">
      <header className="app-contextbar">
        <div><span>学习空间</span><i>/</i><strong>{current?.label ?? systemWorkspace.label}</strong></div>
        <p>{description}</p>
        <div className="context-actions"><span className="context-signal"><i />学习中</span>{account ?? <span className="context-avatar">BD</span>}</div>
      </header>
      <div className="app-canvas">{children}</div>
    </main>
    {mentor}
    {moreOpen && <nav className="mobile-more-tray" aria-label="更多学习功能">
      {SECONDARY_MOBILE_MODULES.map((item) => <a key={item.name} href={hrefFor({ name: item.name })} className={activeRoute === item.name ? 'active' : ''} aria-current={activeRoute === item.name ? 'page' : undefined} onClick={() => setMoreOpen(false)}><span><NavGlyph glyph={item.glyph} /></span>{item.shortLabel}</a>)}
      <a href={hrefFor({ name: 'trust' })} className={activeRoute === 'trust' ? 'active' : ''} aria-current={activeRoute === 'trust' ? 'page' : undefined} onClick={() => setMoreOpen(false)}><span>◎</span>数据</a>
      <a href={hrefFor({ name: 'quality' })} className={activeRoute === 'quality' ? 'active' : ''} aria-current={activeRoute === 'quality' ? 'page' : undefined} onClick={() => setMoreOpen(false)}><span>◇</span>质量</a>
    </nav>}
    <nav className="mobile-nav" aria-label="移动端主要导航">
      {PRIMARY_MOBILE_MODULES.map((item) => <a
        key={item.name}
        href={hrefFor({ name: item.name })}
        className={activeRoute === item.name ? 'active' : ''}
        aria-current={activeRoute === item.name ? 'page' : undefined}
      ><span><NavGlyph glyph={item.glyph} /></span><small>{MOBILE_PRIMARY_LABELS[item.name] ?? item.shortLabel}</small></a>)}
      <button type="button" className={secondaryActive ? 'active' : ''} aria-label="更多功能" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><span>···</span><small>更多</small></button>
    </nav>
  </div>;
}

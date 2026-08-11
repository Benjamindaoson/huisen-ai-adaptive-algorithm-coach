import type { ReactNode } from 'react';
import { hrefFor, type ModuleRouteName } from '../lib/routes';

type Props = {
  activeRoute: ModuleRouteName;
  onExport: () => void;
  onImport: () => void;
  children: ReactNode;
};

const navItems: Array<{ name: ModuleRouteName; label: string; icon: string }> = [
  { name: 'today', label: '今日', icon: '⌂' },
  { name: 'problems', label: '题库', icon: '▤' },
  { name: 'paths', label: '学习中心', icon: '↗' },
  { name: 'review', label: '错题本', icon: '↻' },
  { name: 'exam', label: '模拟考试', icon: '◷' },
  { name: 'insights', label: '能力报告', icon: '⌁' },
];

export function AppShell({ activeRoute, onExport, onImport, children }: Props) {
  return <div className="app-frame">
    <aside className="app-sidebar">
      <a className="app-brand" href={hrefFor({ name: 'today' })} aria-label="OD 学习教练首页">
        <span>OD</span><strong>学习教练</strong>
      </a>
      <nav className="app-nav" aria-label="主要导航">
        {navItems.map((item) => <a
          key={item.name}
          href={hrefFor({ name: item.name })}
          className={activeRoute === item.name ? 'active' : ''}
          aria-current={activeRoute === item.name ? 'page' : undefined}
        ><span aria-hidden="true">{item.icon}</span>{item.label}</a>)}
      </nav>
      <section className="sidebar-coach-note" aria-label="AI 教练状态">
        <span className="ai-mark">AI</span>
        <div><strong>教练已就绪</strong><small>基于你的真实练习证据</small></div>
      </section>
      <div className="sidebar-data-actions">
        <button type="button" onClick={onExport} aria-label="导出学习数据">导出</button>
        <button type="button" onClick={onImport} aria-label="导入学习数据">导入</button>
      </div>
    </aside>
    <main className="app-main">{children}</main>
    <nav className="mobile-nav" aria-label="移动端主要导航">
      {navItems.slice(0, 5).map((item) => <a
        key={item.name}
        href={hrefFor({ name: item.name })}
        className={activeRoute === item.name ? 'active' : ''}
        aria-current={activeRoute === item.name ? 'page' : undefined}
      ><span aria-hidden="true">{item.icon}</span><small>{item.label}</small></a>)}
    </nav>
  </div>;
}

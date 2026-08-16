import { useMemo, useState } from 'react';
import type { CatalogProblem } from '../lib/catalog';
import type { ProgressState } from '../lib/progress';
import { EMPTY_FILTERS, searchCatalog, type CatalogFilters } from '../lib/search';

type Props = { catalog: CatalogProblem[]; progress: ProgressState; onOpen: (id: string) => void };

function values(catalog: CatalogProblem[], select: (problem: CatalogProblem) => string[]): string[] {
  return [...new Set(catalog.flatMap(select).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

const statusLabels = { new: '未开始', 'in-progress': '进行中', mastered: '已掌握', review: '待复习' } as const;

export function ProblemsPage({ catalog, progress, onOpen }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const results = useMemo(() => searchCatalog(query, filters, catalog), [catalog, filters, query]);
  const collections = useMemo(() => values(catalog, (item) => [item.collection]), [catalog]);
  const languages = useMemo(() => values(catalog, (item) => item.languages), [catalog]);
  return <div className="module-page problems-page">
    <header className="module-header"><div><span className="section-kicker">ALGORITHM LAB</span><h1>题库练习</h1><p>754 道题不是用来刷完的。按技能、错因和目标，找到此刻最值得练习的一题。</p></div><strong className="header-count">{catalog.length}<small> 道真实题目</small></strong></header>
    <section className="library-toolbar" aria-label="搜索全部题库">
      <label className="library-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索题名、关键词或算法…" /></label>
      <div className="library-filters">
        <select aria-label="试卷" value={filters.collection} onChange={(event) => setFilters({ ...filters, collection: event.target.value })}><option value="">全部试卷</option>{collections.map((item) => <option key={item}>{item}</option>)}</select>
        <select aria-label="分值" value={filters.score} onChange={(event) => setFilters({ ...filters, score: event.target.value })}><option value="">全部分值</option><option value="100">100 分</option><option value="200">200 分</option></select>
        <select aria-label="语言" value={filters.language} onChange={(event) => setFilters({ ...filters, language: event.target.value })}><option value="">全部语言</option>{languages.map((item) => <option key={item}>{item}</option>)}</select>
      </div>
    </section>
    <div className="library-result-meta"><span>找到 <strong>{results.length}</strong> 道题</span><small>优先显示标题精确匹配</small></div>
    <section className="library-table" aria-label="题目列表">
      <div className="library-table-head"><span>状态</span><span>题目</span><span>分值</span><span>语言</span><span /></div>
      {results.slice(0, 100).map((item) => {
        const status = progress.problems[item.id]?.status ?? 'new';
        return <button type="button" className="library-row" key={item.id} onClick={() => onOpen(item.id)}>
          <span><i className={`status-dot ${status}`} />{statusLabels[status]}</span>
          <span className="library-problem"><strong>{item.title}</strong><small>{item.excerpt || item.collection}</small></span>
          <span>{item.score ?? '—'}</span><span>{item.languages.join(' / ') || '索引'}</span><b>→</b>
        </button>;
      })}
      {!results.length && <div className="empty-panel"><strong>没有匹配的题目</strong><p>减少筛选条件或换一个关键词。</p></div>}
    </section>
  </div>;
}

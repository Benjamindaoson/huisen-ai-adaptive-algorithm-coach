import type { CatalogProblem, ProblemLanguage } from './catalog';

export type CatalogFilters = {
  collection: string;
  score: string;
  language: string;
  tag: string;
};

export const EMPTY_FILTERS: CatalogFilters = { collection: '', score: '', language: '', tag: '' };

function normalized(value: string): string {
  return value.toLocaleLowerCase('zh-Hans-CN').replace(/\s+/g, ' ').trim();
}

export function searchCatalog(query: string, filters: CatalogFilters, catalog: CatalogProblem[]): CatalogProblem[] {
  const phrase = normalized(query);
  return catalog
    .filter((problem) => {
      if (filters.collection && problem.collection !== filters.collection) return false;
      if (filters.score && String(problem.score ?? '') !== filters.score) return false;
      if (filters.language && !problem.languages.includes(filters.language as ProblemLanguage)) return false;
      if (filters.tag && !problem.tags.includes(filters.tag)) return false;
      return !phrase || normalized(`${problem.title}\n${problem.searchText}`).includes(phrase);
    })
    .sort((left, right) => {
      const leftExact = normalized(left.title) === phrase ? 1 : 0;
      const rightExact = normalized(right.title) === phrase ? 1 : 0;
      if (leftExact !== rightExact) return rightExact - leftExact;
      const leftStarts = normalized(left.title).startsWith(phrase) ? 1 : 0;
      const rightStarts = normalized(right.title).startsWith(phrase) ? 1 : 0;
      if (leftStarts !== rightStarts) return rightStarts - leftStarts;
      return left.title.localeCompare(right.title, 'zh-Hans-CN');
    });
}

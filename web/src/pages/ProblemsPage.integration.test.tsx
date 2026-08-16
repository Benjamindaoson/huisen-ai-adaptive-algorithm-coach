// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CatalogProblem } from '../lib/catalog';
import { ProblemsPage } from './ProblemsPage';

afterEach(cleanup);

it('reports, searches, and opens a problem from the complete 754-item catalog', () => {
  const catalog: CatalogProblem[] = Array.from({ length: 754 }, (_, index) => ({
    id: `od-${index}`,
    title: index === 753 ? '唯一的迁移验证题' : `算法练习 ${index + 1}`,
    excerpt: '真实题目摘要',
    collection: 'OD 题库',
    score: 100,
    languages: ['python'],
    tags: ['数组'],
    completeness: 'complete',
    searchText: index === 753 ? '唯一的迁移验证题 迁移' : `算法练习 ${index + 1}`,
    sourcePaths: [],
    duplicateCount: 1,
  }));
  const onOpen = vi.fn();
  render(<ProblemsPage catalog={catalog} progress={{ version: 1, problems: {} }} onOpen={onOpen} />);

  expect(screen.getAllByText('754')).toHaveLength(2);
  fireEvent.change(screen.getByPlaceholderText(/搜索题名/), { target: { value: '唯一的迁移验证题' } });
  fireEvent.click(screen.getByRole('button', { name: /唯一的迁移验证题/ }));
  expect(onOpen).toHaveBeenCalledWith('od-753');
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReviewPage } from './ReviewPage';

afterEach(cleanup);

it('shows due delayed mastery reviews separately from ordinary mistakes', () => {
  const onOpenDelayed = vi.fn();
  const review = { skillId: 'array', sourceProblemId: 'p1', reviewProblemId: 'p2', transferEventId: 'transfer-1', intervalIndex: 0, dueAt: '2026-08-13T00:00:00.000Z', due: true, status: 'scheduled' as const, evidenceRefs: ['attempt:a1'], confidenceDelta: -0.1 };
  render(<ReviewPage cards={[]} delayedReviews={[review]} onOpen={vi.fn()} onOpenDelayed={onOpenDelayed} />);
  expect(screen.getByRole('heading', { name: '延迟掌握复测' })).toBeTruthy();
  expect(screen.getByText(/数组与序列/)).toBeTruthy();
  expect(screen.getByText(/attempt:a1/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /开始独立复测/ }));
  expect(onOpenDelayed).toHaveBeenCalledWith(review);
});

it('does not reopen the source problem when no different-surface review problem exists', () => {
  render(<ReviewPage cards={[]} delayedReviews={[{ skillId: 'array', sourceProblemId: 'p1', reviewProblemId: null, transferEventId: 'transfer-1', intervalIndex: 0, dueAt: '2026-08-13T00:00:00.000Z', due: true, status: 'scheduled', evidenceRefs: ['attempt:a1'], confidenceDelta: -0.1 }]} onOpen={vi.fn()} onOpenDelayed={vi.fn()} />);
  expect(screen.getByRole('button', { name: /等待不同题面/ }).hasAttribute('disabled')).toBe(true);
});

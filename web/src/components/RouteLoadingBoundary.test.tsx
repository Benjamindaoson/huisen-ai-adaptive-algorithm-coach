// @vitest-environment jsdom
import { lazy } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { RouteLoadingBoundary } from './RouteLoadingBoundary';

afterEach(cleanup);

it('keeps a learner-readable route fallback until the requested surface resolves', async () => {
  let release!: (module: { default: () => React.JSX.Element }) => void;
  const DeferredSurface = lazy(() => new Promise<{ default: () => React.JSX.Element }>((resolve) => { release = resolve; }));

  render(<RouteLoadingBoundary><DeferredSurface /></RouteLoadingBoundary>);

  expect(screen.getByText('正在打开这个学习空间…')).toBeTruthy();
  expect(screen.getByText(/你的进度已经保留/)).toBeTruthy();

  await act(async () => release({ default: () => <h1>训练舱已就绪</h1> }));
  expect(await screen.findByRole('heading', { name: '训练舱已就绪' })).toBeTruthy();
  expect(screen.queryByText('正在打开这个学习空间…')).toBeNull();
});

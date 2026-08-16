import { Suspense, type ReactNode } from 'react';

type Props = { children: ReactNode };

export function RouteLoadingBoundary({ children }: Props) {
  return <Suspense fallback={<section className="route-loading" aria-live="polite">
    <span className="route-loading-orb"><i /></span>
    <div><strong>正在打开这个学习空间…</strong><p>你的进度已经保留，马上继续刚才的任务。</p></div>
  </section>}>
    {children}
  </Suspense>;
}

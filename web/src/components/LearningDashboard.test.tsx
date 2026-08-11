import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LearningDashboard } from './LearningDashboard';

it('renders unresolved mistake evidence as a review card', () => {
  const html = renderToStaticMarkup(<LearningDashboard
    plan={[]}
    mastery={[]}
    reviewCards={[{
      attemptId: 'a', problemId: 'p1', title: '数组排序', language: 'python', outcome: 'wrong-answer',
      summary: '公开样例 0/2 通过', skills: ['array'], createdAt: '2026-08-10T00:00:00Z',
      reviewAt: '2026-08-11T00:00:00Z', due: true,
    }]}
    onOpen={() => undefined}
  />);

  expect(html).toContain('错题复练');
  expect(html).toContain('数组排序');
  expect(html).toContain('答案错误');
  expect(html).toContain('现在复练');
});

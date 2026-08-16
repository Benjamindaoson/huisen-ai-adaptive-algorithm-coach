// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FOUNDATION_LESSONS } from '../lib/foundation-curriculum';
import { STARTER_ALGORITHM_LESSONS } from '../lib/starter-algorithm-curriculum';
import { LessonPage } from './LessonPage';

afterEach(cleanup);

it('teaches through observe, predict and completion before transfer', () => {
  const onSignal = vi.fn();
  render(<LessonPage lesson={FOUNDATION_LESSONS[0]} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);
  expect(screen.getByText(/严格的收银员/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '继续：观察程序' }));
  expect(screen.getByText('先收到文字')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '继续：先预测' }));
  fireEvent.click(screen.getByRole('button', { name: "文字 '7'" }));
  expect(screen.getByText(/input\(\) 的结果总是文字/)).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson-checkpoint-passed' }));
  fireEvent.click(screen.getByRole('button', { name: '继续：亲手补全' }));
  fireEvent.change(screen.getByLabelText('填写缺失代码'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '检查我的答案' }));
  expect(screen.getByRole('heading', { name: '把能力带到下一道题' })).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson-completed' }));
});

it('records the first runnable starter example before asking the learner to continue', () => {
  const onSignal = vi.fn();
  render(<LessonPage lesson={STARTER_ALGORITHM_LESSONS[0]} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: '继续：观察程序' }));
  fireEvent.click(screen.getByRole('button', { name: '运行示例' }));

  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' },
  }));
});

it('returns to the exact interrupted problem after remediation completion', () => {
  const onOpenProblem = vi.fn();
  render(<LessonPage lesson={FOUNDATION_LESSONS[0]} transferProblem={null} returnProblemId="od/42" onSignal={vi.fn()} onOpenProblem={onOpenProblem} />);
  fireEvent.click(screen.getByRole('button', { name: '继续：观察程序' }));
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '执行下一步' }));
  fireEvent.click(screen.getByRole('button', { name: '继续：先预测' }));
  fireEvent.click(screen.getByRole('button', { name: "文字 '7'" }));
  fireEvent.click(screen.getByRole('button', { name: '继续：亲手补全' }));
  fireEvent.change(screen.getByLabelText('填写缺失代码'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: '检查我的答案' }));
  fireEvent.click(screen.getByRole('button', { name: '返回原题继续作答' }));
  expect(onOpenProblem).toHaveBeenCalledWith('od/42');
});

it('shows an evidence-bound AI handoff before the lesson flow', () => {
  render(<LessonPage
    lesson={FOUNDATION_LESSONS[1]}
    transferProblem={null}
    handoff={{
      authority: 'event-projection',
      recommendationId: 'handoff-variables-state-0123abcd',
      headline: 'AI 为什么现在安排「给信息贴标签」',
      sourceLessonId: 'starter-array-traversal',
      sourceTitle: '从头到尾看懂一组数据',
      lessonTitle: '给信息贴标签',
      reason: '你刚完成「从头到尾看懂一组数据」的即时迁移。根据已完成的课程和先修关系，「给信息贴标签」是当前已解锁的下一步。',
      payoff: '理解变量会随语句执行而改变，并能预测某一步的值。',
      boundary: '这次安排只说明下一步学习顺序，不代表长期掌握；长期掌握仍需要延迟复测或之后的独立任务证据。',
      evidenceRefs: ['event:instant-transfer', 'event:input-complete'],
    }}
    onSignal={vi.fn()}
    onOpenProblem={vi.fn()}
  />);

  expect(screen.getByRole('heading', { name: 'AI 为什么现在安排「给信息贴标签」' })).toBeTruthy();
  expect(screen.getByText(/根据已完成的课程和先修关系/)).toBeTruthy();
  expect(screen.getByText('学完你将能做到')).toBeTruthy();
  expect(screen.getAllByText(/理解变量会随语句执行而改变/)).toHaveLength(2);
  expect(screen.getByText(/不代表长期掌握/)).toBeTruthy();
  expect(screen.getByText('查看推荐依据 · 2 条记录')).toBeTruthy();
  expect(screen.getByText('event:instant-transfer')).toBeTruthy();
  expect(screen.getByText('event:input-complete')).toBeTruthy();
});

it('records bounded handoff feedback and gives confused learners a recovery path', () => {
  const onSignal = vi.fn();
  const handoff = {
    authority: 'event-projection' as const,
    recommendationId: 'handoff-variables-state-0123abcd',
    headline: 'AI 为什么现在安排「给信息贴标签」',
    sourceLessonId: 'starter-array-traversal',
    sourceTitle: '从头到尾看懂一组数据', lessonTitle: '给信息贴标签',
    reason: '你刚完成上一项训练，这节是当前已解锁的下一步。',
    payoff: FOUNDATION_LESSONS[1].objective,
    boundary: '这次安排不代表长期掌握。',
    evidenceRefs: ['event:instant-transfer', 'event:input-complete'],
  };
  const { rerender } = render(<LessonPage lesson={FOUNDATION_LESSONS[1]} transferProblem={null} handoff={handoff} handoffFeedback={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: '这正是我需要的' }));
  expect(onSignal).toHaveBeenCalledWith({
    kind: 'lesson-handoff-feedback',
    data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' },
  });

  rerender(<LessonPage lesson={FOUNDATION_LESSONS[1]} transferProblem={null} handoff={handoff} handoffFeedback="helpful" onSignal={onSignal} onOpenProblem={vi.fn()} />);
  expect(screen.getByRole('button', { name: '这正是我需要的' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText(/只用于改进推荐体验，不计入掌握度/)).toBeTruthy();

  rerender(<LessonPage lesson={FOUNDATION_LESSONS[1]} transferProblem={null} handoff={handoff} handoffFeedback="unclear" onSignal={onSignal} onOpenProblem={vi.fn()} />);
  expect(screen.getByRole('button', { name: '我不明白为什么' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText(/不是因为系统判定你很弱/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '先复习上一项训练' }).getAttribute('href')).toBe('#/training/starter-array-traversal?returnLesson=variables-state&recommendation=handoff-variables-state-0123abcd');
});

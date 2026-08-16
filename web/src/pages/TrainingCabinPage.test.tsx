// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { STARTER_ALGORITHM_LESSONS } from '../lib/starter-algorithm-curriculum';
import type { LearningEvent } from '../lib/learner-memory';
import { TrainingCabinPage } from './TrainingCabinPage';

afterEach(cleanup);

function completedEntryDiagnosis(): LearningEvent[] {
  return ['state', 'implementation', 'modeling'].map((diagnosticStep, index) => ({
    id: `diagnostic-${diagnosticStep}`,
    learnerId: 'learner-a',
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '2.0.0', diagnosticStep, correct: true },
    createdAt: new Date(Date.parse('2026-08-14T00:00:00Z') + index).toISOString(),
  })) as LearningEvent[];
}

it('gives a cold-start learner an honest diagnosis before the first training action', () => {
  render(<TrainingCabinPage lesson={STARTER_ALGORITHM_LESSONS[0]!} events={[]} transferProblem={null} onSignal={vi.fn()} onOpenProblem={vi.fn()} />);

  expect(screen.getByText('AI 从这里开始认识你')).toBeTruthy();
  expect(screen.getByText(/还没有可用的同技能学习记录/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /开始我的 10 分钟训练/ })).toBeTruthy();
  expect(screen.queryByText('number')).toBeNull();
});

it('explains a verified recovery review and returns without emitting learning evidence', () => {
  const onSignal = vi.fn();
  const onReturnToLesson = vi.fn();
  render(<TrainingCabinPage
    lesson={STARTER_ALGORITHM_LESSONS[0]!}
    events={readyForImmediateTransfer()}
    transferProblem={null}
    recoveryContext={{ returnLessonId: 'variables-state', returnLessonTitle: '给信息贴标签', recommendationId: 'handoff-variables-state-0123abcd' }}
    onReturnToLesson={onReturnToLesson}
    onSignal={onSignal}
    onOpenProblem={vi.fn()}
  />);

  expect(screen.getByText(/你刚才不清楚为什么要学「给信息贴标签」/)).toBeTruthy();
  expect(screen.getByText('快速复习模式')).toBeTruthy();
  expect(screen.getByText('01 / 先用人话听懂')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '我听懂了，去看程序怎么动' }));
  expect(screen.getByText('02 / 看见每一步')).toBeTruthy();
  expect(onSignal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '返回「给信息贴标签」' }));
  expect(onReturnToLesson).toHaveBeenCalledTimes(1);
  expect(onSignal).not.toHaveBeenCalled();
});

it('closes recap with one corrected-model reflection without claiming mastery', () => {
  const lesson = STARTER_ALGORITHM_LESSONS[0]!;
  const onSignal = vi.fn();
  const onReturnToLesson = vi.fn();
  const recoveryContext = { returnLessonId: 'variables-state', returnLessonTitle: '给信息贴标签', recommendationId: 'handoff-variables-state-0123abcd' };
  const view = render(<TrainingCabinPage
    lesson={lesson}
    events={readyForImmediateTransfer()}
    transferProblem={null}
    recoveryContext={recoveryContext}
    onReturnToLesson={onReturnToLesson}
    onSignal={onSignal}
    onOpenProblem={vi.fn()}
  />);

  fireEvent.click(screen.getByRole('button', { name: '我听懂了，去看程序怎么动' }));
  expect(screen.getByRole('heading', { name: '刚才哪里想岔了？' })).toBeTruthy();
  const confirm = screen.getByRole('button', { name: '我现在明白了' });
  expect(confirm.hasAttribute('disabled')).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: lesson.checkpoint.misconception }));
  expect(screen.getByText(/这个理解还停留在原来的误区/)).toBeTruthy();
  expect(onSignal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '回到人话讲解' }));
  expect(screen.getByText('01 / 先用人话听懂')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: '我听懂了，去看程序怎么动' }));
  fireEvent.click(screen.getByRole('button', { name: lesson.checkpoint.explanation }));
  fireEvent.click(screen.getByRole('button', { name: '我现在明白了' }));

  expect(onSignal).toHaveBeenCalledTimes(1);
  expect(onSignal).toHaveBeenCalledWith({
    kind: 'lesson-handoff-feedback',
    data: {
      lessonId: 'variables-state', recommendationId: recoveryContext.recommendationId,
      choiceId: 'helpful', reason: 'recap-corrected-model:starter-array-traversal',
    },
  });
  expect(screen.getByText('这次认知修正已记录')).toBeTruthy();
  expect(screen.getByText(/不会增加掌握度/)).toBeTruthy();

  view.rerender(<TrainingCabinPage
    lesson={lesson}
    events={[...readyForImmediateTransfer(), {
      id: 'recap-reflection', learnerId: 'learner-a', kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: recoveryContext.recommendationId, choiceId: 'helpful', reason: 'recap-corrected-model:starter-array-traversal' },
      createdAt: '2026-08-14T00:10:00Z',
    }]}
    transferProblem={null}
    recoveryContext={recoveryContext}
    onReturnToLesson={onReturnToLesson}
    onSignal={onSignal}
    onOpenProblem={vi.fn()}
  />);
  expect(screen.getByText('这次认知修正已记录')).toBeTruthy();
  expect(onSignal).toHaveBeenCalledTimes(1);
});

it('opens a diagnosis-selected lesson at the first teaching action and records one start', async () => {
  const onSignal = vi.fn();
  const view = render(<TrainingCabinPage lesson={STARTER_ALGORITHM_LESSONS[0]!} events={completedEntryDiagnosis()} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);

  expect(screen.getByText('继续刚才的入口诊断')).toBeTruthy();
  expect(screen.getByText('读懂程序状态')).toBeTruthy();
  expect(screen.getByText('把想法写成代码')).toBeTruthy();
  expect(screen.getByText('把题意变成状态')).toBeTruthy();
  expect(screen.getByText(/三个入口动作都有正确证据/)).toBeTruthy();
  expect(screen.getByText(/不等于掌握证明/)).toBeTruthy();
  expect(screen.getByText(/短诊断不能证明掌握/)).toBeTruthy();
  expect(screen.queryByText('AI 从这里开始认识你')).toBeNull();
  expect(screen.getByText('01 / 先用人话听懂')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /开始我的 10 分钟训练/ })).toBeNull();
  const evidenceDisclosure = screen.getByText('查看 3 条入口证据').closest('details');
  expect(evidenceDisclosure).toBeTruthy();
  expect(evidenceDisclosure?.hasAttribute('open')).toBe(false);
  expect(evidenceDisclosure?.textContent).toContain('读懂程序状态');
  expect(evidenceDisclosure?.textContent).toContain('不等于掌握证明');
  expect(evidenceDisclosure?.textContent).toContain('短诊断不能证明掌握');
  expect(document.querySelector('.training-diagnosis.compact')).toBeTruthy();
  expect(document.querySelector('.training-mission.compact')).toBeTruthy();
  await waitFor(() => expect(onSignal).toHaveBeenCalledTimes(1));
  expect(onSignal).toHaveBeenCalledWith({ kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' } });

  view.rerender(<TrainingCabinPage lesson={STARTER_ALGORITHM_LESSONS[0]!} events={completedEntryDiagnosis()} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);
  expect(onSignal).toHaveBeenCalledTimes(1);
});

it('does not emit another automatic start when the selected lesson already has start evidence', () => {
  const onSignal = vi.fn();
  const events: LearningEvent[] = [
    ...completedEntryDiagnosis(),
    { id: 'start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z' },
  ];

  render(<TrainingCabinPage lesson={STARTER_ALGORITHM_LESSONS[0]!} events={events} transferProblem={null} onSignal={onSignal} onOpenProblem={vi.fn()} />);

  expect(screen.getByText('01 / 先用人话听懂')).toBeTruthy();
  expect(onSignal).not.toHaveBeenCalled();
});

it('requires prediction and local coding before independent transfer', () => {
  const onSignal = vi.fn();
  render(<TrainingCabinPage lesson={STARTER_ALGORITHM_LESSONS[0]!} events={[]} transferProblem={{ id: 'p-array', title: '数组练习' } as never} onSignal={onSignal} onOpenProblem={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /开始我的 10 分钟训练/ }));
  fireEvent.click(screen.getByRole('button', { name: '我听懂了，去看程序怎么动' }));
  fireEvent.click(screen.getByRole('button', { name: '运行这一小步' }));
  fireEvent.click(screen.getByRole('button', { name: '继续观察' }));
  fireEvent.click(screen.getByRole('button', { name: '运行这一小步' }));
  fireEvent.click(screen.getByRole('button', { name: '继续观察' }));
  fireEvent.click(screen.getByRole('button', { name: '运行这一小步' }));
  fireEvent.click(screen.getByRole('button', { name: '轮到我先预测' }));
  fireEvent.click(screen.getByRole('button', { name: '4' }));
  fireEvent.change(screen.getByLabelText('填写缺失代码'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: '验证这一步' }));
  expect(screen.getByText(/先想：这一行要让程序拿到什么/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: '运行 2 组独立测试' })).toBeNull();

  fireEvent.change(screen.getByLabelText('填写缺失代码'), { target: { value: 'number' } });
  fireEvent.click(screen.getByRole('button', { name: '验证这一步' }));

  expect(screen.getByText('独立迁移还没有发生')).toBeTruthy();
  expect(screen.getByRole('button', { name: '运行 2 组独立测试' })).toBeTruthy();
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'training-stage-completed', data: expect.objectContaining({ stage: 'build', correct: true }) }));
});

it('resumes from persisted stage evidence instead of resetting to explanation', () => {
  const lesson = STARTER_ALGORITHM_LESSONS[0]!;
  const events: LearningEvent[] = [
    { id: 'start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: lesson.id, stage: 'explain' }, createdAt: '2026-08-14T00:00:00Z' },
    { id: 'explain', learnerId: 'learner-a', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'explain', correct: true }, createdAt: '2026-08-14T00:01:00Z' },
    { id: 'observe', learnerId: 'learner-a', kind: 'training-stage-completed', data: { lessonId: lesson.id, stage: 'observe', correct: true }, createdAt: '2026-08-14T00:02:00Z' },
  ];

  render(<TrainingCabinPage lesson={lesson} events={events} transferProblem={null} onSignal={vi.fn()} onOpenProblem={vi.fn()} />);

  expect(screen.getByText('03 / 先预测，再验证')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /开始我的 10 分钟训练/ })).toBeNull();
});

function readyForImmediateTransfer(): LearningEvent[] {
  return (['explain', 'observe', 'predict', 'build'] as const).map((stage, index) => ({
    id: `stage-${stage}`, learnerId: 'learner-a', kind: 'training-stage-completed',
    data: { lessonId: 'starter-array-traversal', stage, correct: true }, createdAt: new Date(Date.parse('2026-08-14T00:00:00Z') + index).toISOString(),
  }));
}

it('keeps the first transfer inside a same-skill executable challenge', async () => {
  const onSignal = vi.fn();
  const transferExecutor = vi.fn().mockResolvedValue({ status: 'passed', passedCount: 2, totalCount: 2, caseResults: [] });
  render(<TrainingCabinPage
    lesson={STARTER_ALGORITHM_LESSONS[0]!}
    events={readyForImmediateTransfer()}
    transferProblem={{ id: 'od-5e34daac53f3', title: '会议室占用时间' } as never}
    runnerUrl="http://runner"
    transferExecutor={transferExecutor}
    onSignal={onSignal}
    onOpenProblem={vi.fn()}
  />);

  expect(screen.getByRole('heading', { name: '逐件核对行李重量' })).toBeTruthy();
  expect(screen.queryByText('会议室占用时间')).toBeNull();
  expect(screen.getByText(/只需要用刚学会的数组遍历/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('独立迁移代码'), { target: { value: 'def show_each(weights):\n    for weight in weights:\n        print(weight)' } });
  fireEvent.click(screen.getByRole('button', { name: '运行 2 组独立测试' }));

  await waitFor(() => expect(screen.getByText(/2\/2 组测试通过/)).toBeTruthy());
  expect(transferExecutor).toHaveBeenCalledWith('http://runner', expect.objectContaining({ skillIds: ['array'] }), expect.stringContaining('for weight in weights'));
  expect(onSignal).toHaveBeenCalledWith({ kind: 'training-stage-completed', data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, skillIds: ['array'] } });
  expect(onSignal).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'lesson-transfer-passed' }));
  expect(screen.getByText(/不等于长期掌握/)).toBeTruthy();
});

it('keeps progress pending when the private runner is unavailable', async () => {
  const onSignal = vi.fn();
  render(<TrainingCabinPage
    lesson={STARTER_ALGORITHM_LESSONS[0]!}
    events={readyForImmediateTransfer()}
    transferProblem={null}
    runnerUrl="http://runner"
    transferExecutor={vi.fn().mockResolvedValue({ status: 'unavailable', passedCount: 0, totalCount: 2, caseResults: [], message: '无法连接运行服务。' })}
    onSignal={onSignal}
    onOpenProblem={vi.fn()}
  />);

  fireEvent.click(screen.getByRole('button', { name: '运行 2 组独立测试' }));
  await waitFor(() => expect(screen.getByText(/运行服务暂时不可用/)).toBeTruthy());
  expect(onSignal).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stage: 'transfer' }) }));
});

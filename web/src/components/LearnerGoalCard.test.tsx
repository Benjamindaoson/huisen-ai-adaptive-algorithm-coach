// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { emptyLearnerMemory } from '../lib/learner-memory';
import { LearnerGoalCard } from './LearnerGoalCard';

afterEach(cleanup);

it('edits and saves the learner goal as one focused form', () => {
  const onSave = vi.fn();
  render(<LearnerGoalCard profile={emptyLearnerMemory('learner-a').profile} onSave={onSave} />);
  expect(screen.getByRole('heading', { name: '通过算法初试' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '调整目标' }));
  expect(screen.getByRole('option', { name: '通过算法初试' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('目标场景'), { target: { value: 'interview' } });
  fireEvent.input(screen.getByLabelText('目标日期'), { target: { value: '2026-09-01' } });
  fireEvent.change(screen.getByLabelText('每天投入'), { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('首选语言'), { target: { value: 'java' } });
  fireEvent.click(screen.getByRole('button', { name: '保存目标' }));
  expect(onSave).toHaveBeenCalledWith({ target: 'interview', examDate: '2026-09-01', dailyMinutes: 60, preferredLanguage: 'java' });
});

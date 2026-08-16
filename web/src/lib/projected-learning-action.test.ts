import { describe, expect, it } from 'vitest';
import { FOUNDATION_LESSONS } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { projectBridgeLearningAction, projectMentorNextAction } from './projected-learning-action';

const completedDiagnosis: LearningEvent[] = [
  { id: 'diagnostic-state', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }, createdAt: '2026-08-14T00:00:00Z' },
  { id: 'diagnostic-implementation', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'implementation', correct: true }, createdAt: '2026-08-14T00:00:01Z' },
  { id: 'diagnostic-modeling', learnerId: 'learner-a', kind: 'bridge-diagnostic-step-recorded', data: { curriculumVersion: '2.0.0', diagnosticStep: 'modeling', correct: true }, createdAt: '2026-08-14T00:00:02Z' },
];

const completedImmediateTransfer: LearningEvent = {
  id: 'instant-transfer', learnerId: 'learner-a', kind: 'training-stage-completed',
  data: { lessonId: 'starter-array-traversal', stage: 'transfer', correct: true, skillIds: ['array'] }, createdAt: '2026-08-14T00:02:00Z',
};

describe('projected learning action', () => {
  it('covers cold, partial, ready, and resumable bridge states with one label and destination', () => {
    expect(projectBridgeLearningAction([])).toMatchObject({
      state: 'start-diagnosis', label: '开始 3 分钟诊断', route: { name: 'today' }, href: '#/today', evidenceRefs: [],
    });
    expect(projectBridgeLearningAction(completedDiagnosis.slice(0, 1))).toMatchObject({
      state: 'continue-diagnosis', label: '继续入口诊断', route: { name: 'today' }, href: '#/today', evidenceRefs: ['event:diagnostic-state'],
    });
    expect(projectBridgeLearningAction(completedDiagnosis)).toMatchObject({
      state: 'start-training', label: '开始 10 分钟训练', route: { name: 'training', lessonId: 'starter-array-traversal' }, href: '#/training/starter-array-traversal',
      evidenceRefs: ['event:diagnostic-state', 'event:diagnostic-implementation', 'event:diagnostic-modeling'],
    });
    expect(projectBridgeLearningAction([
      ...completedDiagnosis,
      { id: 'other-training-start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-hash-lookup', stage: 'explain' }, createdAt: '2026-08-14T00:00:30Z' },
    ]).state).toBe('start-training');
    expect(projectBridgeLearningAction([
      ...completedDiagnosis,
      { id: 'training-start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z' },
    ])).toMatchObject({
      state: 'continue-training', label: '继续 10 分钟训练', route: { name: 'training', lessonId: 'starter-array-traversal' }, href: '#/training/starter-array-traversal',
    });
  });

  it('uses the bridge action for evidence-free Today and Insights but preserves non-bridge and established-learning actions', () => {
    expect(projectMentorNextAction({ name: 'today' }, completedDiagnosis, 0)).toBe('开始 10 分钟训练');
    expect(projectMentorNextAction({ name: 'insights' }, completedDiagnosis, 0)).toBe('开始 10 分钟训练');
    const started: LearningEvent[] = [...completedDiagnosis, {
      id: 'training-start', learnerId: 'learner-a', kind: 'training-session-started' as const,
      data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z',
    }];
    expect(projectMentorNextAction({ name: 'insights' }, started, 0)).toBe(projectBridgeLearningAction(started).label);
    expect(projectMentorNextAction({ name: 'insights' }, started, 0)).toBe('继续 10 分钟训练');
    expect(projectMentorNextAction({ name: 'review' }, completedDiagnosis, 0)).toBe('先解释上次错误，再开始复练');
    expect(projectMentorNextAction({ name: 'insights' }, completedDiagnosis, 2)).toBe('查看一个最需要补强的技能');
  });

  it('opens the exact first teachable foundation lesson after immediate transfer', () => {
    expect(projectBridgeLearningAction([completedImmediateTransfer])).toMatchObject({
      state: 'continue-foundation', label: '继续下一课：让程序听懂你的话', route: { name: 'learn', lessonId: 'input-output' }, href: '#/learn/input-output', evidenceRefs: ['event:instant-transfer'],
    });
    const history: LearningEvent[] = [
      ...completedDiagnosis,
      { id: 'training-start', learnerId: 'learner-a', kind: 'training-session-started', data: { lessonId: 'starter-array-traversal', stage: 'explain' }, createdAt: '2026-08-14T00:01:00Z' },
      completedImmediateTransfer,
    ];
    expect(projectBridgeLearningAction(history).state).toBe('continue-foundation');
    expect(projectMentorNextAction({ name: 'insights' }, history, 0)).toBe('继续下一课：让程序听懂你的话');
    expect(projectMentorNextAction({ name: 'today' }, history, 0)).toBe('继续下一课：让程序听懂你的话');
    expect(projectMentorNextAction({ name: 'insights' }, history, 2)).toBe('继续下一课：让程序听懂你的话');
  });

  it('uses completed prerequisites and in-progress evidence to project the same next lesson as the curriculum', () => {
    const inputCompleted: LearningEvent = {
      id: 'input-complete', learnerId: 'learner-a', kind: 'lesson-completed',
      data: { lessonId: 'input-output', stage: 'complete', correct: true }, createdAt: '2026-08-14T00:01:30Z',
    };
    const variablesStarted: LearningEvent = {
      id: 'variables-start', learnerId: 'learner-a', kind: 'lesson-started',
      data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-14T00:03:00Z',
    };

    expect(projectBridgeLearningAction([inputCompleted, completedImmediateTransfer])).toMatchObject({
      state: 'continue-foundation', label: '继续下一课：给信息贴标签',
      route: { name: 'learn', lessonId: 'variables-state' }, href: '#/learn/variables-state',
      evidenceRefs: ['event:instant-transfer', 'event:input-complete'],
    });
    expect(projectBridgeLearningAction([inputCompleted, completedImmediateTransfer, variablesStarted])).toMatchObject({
      state: 'continue-foundation', route: { name: 'learn', lessonId: 'variables-state' },
      evidenceRefs: ['event:instant-transfer', 'event:input-complete', 'event:variables-start'],
    });
  });

  it('falls back to the learning map only when the foundation curriculum is exhausted', () => {
    const completedCurriculum: LearningEvent[] = FOUNDATION_LESSONS.map((lesson, index) => ({
      id: `lesson-complete-${lesson.id}`, learnerId: 'learner-a', kind: 'lesson-completed' as const,
      data: { lessonId: lesson.id, stage: 'complete', correct: true }, createdAt: `2026-08-13T${String(index).padStart(2, '0')}:00:00Z`,
    }));

    expect(projectBridgeLearningAction([...completedCurriculum, completedImmediateTransfer])).toMatchObject({
      state: 'choose-next-training', label: '选择下一项训练', route: { name: 'paths' }, href: '#/paths',
      evidenceRefs: ['event:instant-transfer'],
    });
  });
});

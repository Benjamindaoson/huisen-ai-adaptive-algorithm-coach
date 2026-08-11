import { describe, expect, it } from 'vitest';
import { validateLearnerId, validateLearningEvent, validateLearningEventsBatch, validateLearnerProfile, validatePlanRequest } from './learning-validation.js';

describe('learning API validation', () => {
  it('rejects prototype-reserved learner ids', () => {
    expect(() => validateLearnerId('__proto__')).toThrow('Invalid learner id');
    expect(() => validateLearnerId('constructor')).toThrow('Invalid learner id');
  });

  it('accepts a bounded learner profile', () => {
    expect(validateLearnerProfile('learner-a', {
      target: 'od-exam', examDate: '2026-09-01', dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-11T00:00:00Z',
    })).toMatchObject({ learnerId: 'learner-a', target: 'od-exam' });
  });

  it('rejects source code and unknown learning event fields', () => {
    expect(() => validateLearningEvent('learner-a', {
      id: 'event-a', kind: 'hint-received', problemId: 'od-a', data: { sourceCode: 'secret' }, createdAt: '2026-08-11T00:00:00Z',
    })).toThrow('Invalid learning event data');
  });

  it('limits agent planning candidates', () => {
    expect(() => validatePlanRequest({ learnerId: 'learner-a', candidates: Array.from({ length: 21 }, (_, index) => ({ problemId: `od-${index}`, title: '题目', skillId: 'array' })) })).toThrow('Invalid plan candidates');
  });

  it('accepts at most one hundred safe events in an initial sync batch', () => {
    const event = { id: 'event-a', kind: 'hint-received', problemId: 'od-a', attemptId: 'attempt-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00Z' };
    expect(validateLearningEventsBatch('learner-a', { events: [event] })).toHaveLength(1);
    expect(() => validateLearningEventsBatch('learner-a', { events: Array.from({ length: 101 }, (_, index) => ({ ...event, id: `event-${index}` })) })).toThrow('Invalid learning event batch');
  });

  it('accepts bounded lesson evidence', () => {
    expect(validateLearningEvent('learner-a', {
      id: 'lesson-event-1', kind: 'lesson-checkpoint-passed',
      data: { lessonId: 'input-output', stage: 'predict', correct: true }, createdAt: '2026-08-11T00:00:00Z',
    })).toMatchObject({ kind: 'lesson-checkpoint-passed', data: { lessonId: 'input-output', correct: true } });
  });

  it('rejects unknown lesson stages and free-form learner answers', () => {
    expect(() => validateLearningEvent('learner-a', {
      id: 'lesson-event-2', kind: 'lesson-completed',
      data: { lessonId: 'input-output', stage: 'secret-stage' }, createdAt: '2026-08-11T00:00:00Z',
    })).toThrow('Invalid learning event data');
    expect(() => validateLearningEvent('learner-a', {
      id: 'lesson-event-3', kind: 'lesson-completed',
      data: { lessonId: 'input-output', answer: 'private response' }, createdAt: '2026-08-11T00:00:00Z',
    })).toThrow('Invalid learning event data');
  });
});

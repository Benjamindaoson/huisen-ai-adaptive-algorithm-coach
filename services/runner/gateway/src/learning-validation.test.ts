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

  it('accepts only bounded evidence-linked lesson handoff feedback', () => {
    const valid = {
      id: 'handoff-feedback-helpful', kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' }, createdAt: '2026-08-14T10:00:00Z',
    };
    expect(validateLearningEvent('learner-a', valid)).toMatchObject({ kind: 'lesson-handoff-feedback', data: { choiceId: 'helpful' } });
    expect(() => validateLearningEvent('learner-a', { ...valid, data: { ...valid.data, choiceId: 'explain-everything' } })).toThrow('Invalid learning event semantics');
    expect(() => validateLearningEvent('learner-a', { ...valid, data: { lessonId: 'variables-state', choiceId: 'helpful' } })).toThrow('Invalid learning event semantics');
  });

  it('accepts bounded bridge diagnosis events and rejects answer text', () => {
    const event = {
      id: 'diagnostic-state', kind: 'bridge-diagnostic-step-recorded',
      data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true }, createdAt: '2026-08-14T00:00:00Z',
    };
    expect(validateLearningEvent('learner-a', event)).toMatchObject({ kind: 'bridge-diagnostic-step-recorded', data: { diagnosticStep: 'state', correct: true } });
    expect(() => validateLearningEvent('learner-a', { ...event, data: { ...event.data, answer: 'private' } })).toThrow('Invalid learning event data');
  });

  it('keeps gateway parity for existing first-minute and training events', () => {
    expect(validateLearningEvent('learner-a', {
      id: 'training-build', kind: 'training-stage-completed',
      data: { lessonId: 'starter-array-traversal', stage: 'build', correct: true }, createdAt: '2026-08-14T00:00:00Z',
    })).toMatchObject({ kind: 'training-stage-completed', data: { stage: 'build' } });
    expect(validateLearningEvent('learner-a', {
      id: 'first-run', kind: 'first-minute-first-run',
      data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-14T00:01:00Z',
    })).toMatchObject({ kind: 'first-minute-first-run' });
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

  it('accepts only independently verified transfer pass evidence', () => {
    const valid = {
      id: 'lesson-transfer-pass-1', kind: 'lesson-transfer-passed', problemId: 'od-transfer', attemptId: 'attempt-pass',
      data: { lessonId: 'arrays-strings', stage: 'transfer', correct: true, assisted: false }, createdAt: '2026-08-12T00:00:00Z',
    };
    expect(validateLearningEvent('learner-a', valid)).toMatchObject({ kind: 'lesson-transfer-passed', problemId: 'od-transfer', attemptId: 'attempt-pass' });
    expect(() => validateLearningEvent('learner-a', { ...valid, attemptId: undefined })).toThrow('Invalid learning event semantics');
    expect(() => validateLearningEvent('learner-a', { ...valid, data: { ...valid.data, assisted: true } })).toThrow('Invalid learning event semantics');
  });

  it('accepts bounded project practicum evidence and rejects source code', () => {
    const event = {
      id: 'practicum-test-1', kind: 'practicum-tested', problemId: 'repo-pagination',
      data: { phase: 'verification', passed: false, passedCount: 2, totalCount: 4 }, createdAt: '2026-08-13T00:00:00Z',
    };
    expect(validateLearningEvent('learner-a', event)).toMatchObject({ kind: 'practicum-tested', problemId: 'repo-pagination' });
    expect(() => validateLearningEvent('learner-a', { ...event, data: { ...event.data, sourceCode: 'secret' } })).toThrow('Invalid learning event data');
  });
});

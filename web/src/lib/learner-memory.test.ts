import { describe, expect, it } from 'vitest';
import { appendLearningEvent, emptyLearnerMemory, loadLearnerMemory, parseLearnerMemory, recordLearningSignal, updateLearnerProfile } from './learner-memory';

describe('learner memory', () => {
  it('creates an isolated persistent device learner instead of a shared public id', () => {
    let stored: string | null = null;
    const storage = { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } };
    const first = loadLearnerMemory(storage);
    const second = loadLearnerMemory(storage);
    expect(first.profile.learnerId).toMatch(/^device-/);
    expect(second.profile.learnerId).toBe(first.profile.learnerId);
  });

  it('migrates the legacy shared learner id without losing events', () => {
    let stored = JSON.stringify({
      ...emptyLearnerMemory('local-learner', new Date('2026-08-11T00:00:00Z')),
      events: [{ id: 'event-old', learnerId: 'local-learner', kind: 'hint-requested', problemId: 'od-a', attemptId: 'attempt-a', data: { hintLevel: 1 }, createdAt: '2026-08-11T00:00:00Z' }],
    });
    const memory = loadLearnerMemory({ getItem: () => stored, setItem: (_key, value) => { stored = value; } });
    expect(memory.profile.learnerId).toMatch(/^device-/);
    expect(memory.events[0]).toMatchObject({ id: 'event-old', learnerId: memory.profile.learnerId });
  });

  it('stores an explicit goal without mutating previous memory', () => {
    const current = emptyLearnerMemory('learner-a', new Date('2026-08-11T00:00:00Z'));
    const next = updateLearnerProfile(current, {
      target: 'od-exam', examDate: '2026-09-01', dailyMinutes: 45, preferredLanguage: 'python',
    }, new Date('2026-08-11T01:00:00Z'));

    expect(current.profile.examDate).toBeNull();
    expect(next.profile).toMatchObject({ target: 'od-exam', examDate: '2026-09-01', dailyMinutes: 45, preferredLanguage: 'python' });
    expect(next.events.at(-1)).toMatchObject({ kind: 'goal-updated', learnerId: 'learner-a' });
  });

  it('appends events idempotently and keeps a bounded newest-first history', () => {
    let memory = emptyLearnerMemory('learner-a');
    for (let index = 0; index < 510; index += 1) {
      memory = appendLearningEvent(memory, {
        id: `event-${index}`, learnerId: 'learner-a', kind: 'hint-requested',
        problemId: 'od-a', data: { hintLevel: 1 }, createdAt: new Date(1_700_000_000_000 + index).toISOString(),
      });
    }
    const duplicate = appendLearningEvent(memory, memory.events[0]);
    expect(duplicate.events).toHaveLength(500);
    expect(duplicate.events[0].id).toBe('event-10');
    expect(duplicate.events.at(-1)?.id).toBe('event-509');
  });

  it('rejects source code and invalid event metadata', () => {
    const memory = emptyLearnerMemory('learner-a');
    expect(() => parseLearnerMemory({
      ...memory,
      events: [{ id: 'event-1', learnerId: 'learner-a', kind: 'hint-requested', data: { sourceCode: 'secret' }, createdAt: '2026-08-11T00:00:00Z' }],
    })).toThrow('Invalid learning event data');
  });

  it('turns a UI learning signal into a safe immutable event', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'hint-received', problemId: 'od-a', attemptId: 'attempt-a', data: { hintLevel: 2 },
    }, new Date('2026-08-11T00:00:00Z'), 'event-safe');
    expect(memory.events[0]).toEqual({
      id: 'event-safe', learnerId: 'learner-a', kind: 'hint-received', problemId: 'od-a', attemptId: 'attempt-a',
      data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00.000Z',
    });
  });

  it('accepts bounded lesson evidence but never lesson source or free-form answers', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'lesson-checkpoint-passed', data: { lessonId: 'input-output', stage: 'predict', correct: true },
    }, new Date('2026-08-11T00:00:00Z'), 'event-lesson');
    expect(memory.events[0]).toMatchObject({ kind: 'lesson-checkpoint-passed', data: { lessonId: 'input-output', stage: 'predict', correct: true } });
    expect(() => parseLearnerMemory({
      ...memory,
      events: [{ ...memory.events[0], data: { lessonId: 'input-output', answer: 'private learner response' } }],
    })).toThrow('Invalid learning event data');
  });
});

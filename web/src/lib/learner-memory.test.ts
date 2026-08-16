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

  it('re-projects recoverable longitudinal milestones during bootstrap parsing and append', () => {
    const base = emptyLearnerMemory('learner-a', new Date('2026-08-01T00:00:00Z'));
    const mission = { id: 'mission-old', learnerId: 'learner-a', kind: 'first-minute-mission-seen' as const, data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-01T00:00:00.000Z' };
    const recent = Array.from({ length: 520 }, (_, index) => ({
      id: `recent-${index}`, learnerId: 'learner-a', kind: 'hint-requested' as const, problemId: 'od-a', attemptId: `attempt-${index}`,
      data: { hintLevel: 1 }, createdAt: new Date(Date.parse('2026-08-02T00:00:00Z') + index * 1_000).toISOString(),
    }));

    const parsed = parseLearnerMemory({ ...base, events: [mission, ...recent] });
    expect(parsed.events).toHaveLength(500);
    expect(parsed.events.some((event) => event.id === mission.id)).toBe(true);

    let appended = appendLearningEvent(base, mission);
    for (const item of recent) appended = appendLearningEvent(appended, item);
    expect(appended.events).toHaveLength(500);
    expect(appended.events.some((event) => event.id === mission.id)).toBe(true);
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

  it('stores the first runnable activation fact only once', () => {
    let memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' },
    }, new Date('2026-08-14T09:02:10Z'), 'first-run');
    memory = recordLearningSignal(memory, {
      kind: 'first-minute-first-run', data: { lessonId: 'starter-array-traversal' },
    }, new Date('2026-08-14T09:05:00Z'), 'later-frame-run');

    expect(memory.events.filter((event) => event.kind === 'first-minute-first-run')).toEqual([
      expect.objectContaining({ id: 'first-run', createdAt: '2026-08-14T09:02:10.000Z' }),
    ]);
  });

  it('stores one semantic lesson start despite repeated mounts with different event ids', () => {
    let memory = emptyLearnerMemory('learner-a');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' },
    }, new Date('2026-08-14T09:00:00Z'), 'lesson-start-first');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' },
    }, new Date('2026-08-14T09:05:00Z'), 'lesson-start-second');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' },
    }, new Date('2026-08-14T09:10:00Z'), 'lesson-start-third');

    expect(memory.events.filter((event) => event.kind === 'lesson-started')).toEqual([
      expect.objectContaining({ id: 'lesson-start-first', createdAt: '2026-08-14T09:00:00.000Z', data: { lessonId: 'variables-state', stage: 'explain' } }),
    ]);
  });

  it('keeps distinct lessons and independent learner lifecycles separate', () => {
    let learnerA = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' },
    }, new Date('2026-08-14T09:00:00Z'), 'learner-a-input');
    learnerA = recordLearningSignal(learnerA, {
      kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' },
    }, new Date('2026-08-14T09:01:00Z'), 'learner-a-variables');
    const learnerB = recordLearningSignal(emptyLearnerMemory('learner-b'), {
      kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' },
    }, new Date('2026-08-14T09:02:00Z'), 'learner-b-input');

    expect(learnerA.events.filter((event) => event.kind === 'lesson-started').map((event) => event.id)).toEqual(['learner-a-input', 'learner-a-variables']);
    expect(learnerB.events.filter((event) => event.kind === 'lesson-started').map((event) => event.id)).toEqual(['learner-b-input']);
  });

  it('preserves imported duplicate history but appends no further same-lesson start', () => {
    const base = emptyLearnerMemory('learner-a');
    const imported = parseLearnerMemory({ ...base, events: [
      { id: 'historical-start-1', learnerId: 'learner-a', kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-13T09:00:00.000Z' },
      { id: 'historical-start-2', learnerId: 'learner-a', kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-13T10:00:00.000Z' },
    ] });
    const afterReopen = recordLearningSignal(imported, {
      kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' },
    }, new Date('2026-08-14T09:00:00Z'), 'new-duplicate');

    expect(afterReopen.events.filter((event) => event.kind === 'lesson-started').map((event) => event.id)).toEqual(['historical-start-1', 'historical-start-2']);
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

  it('accepts only bounded evidence-linked lesson handoff feedback', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' },
    }, new Date('2026-08-14T10:00:00Z'), 'handoff-feedback-helpful');
    expect(memory.events[0]).toMatchObject({
      kind: 'lesson-handoff-feedback',
      data: { lessonId: 'variables-state', recommendationId: 'handoff-variables-state-0123abcd', choiceId: 'helpful' },
    });
    expect(() => parseLearnerMemory({ ...memory, events: [{ ...memory.events[0], data: { ...memory.events[0].data, choiceId: 'explain-everything' } }] })).toThrow('Invalid learning event semantics');
    expect(() => parseLearnerMemory({ ...memory, events: [{ ...memory.events[0], data: { lessonId: 'variables-state', choiceId: 'helpful' } }] })).toThrow('Invalid learning event semantics');
  });

  it('suppresses the active handoff choice but preserves a changed response revision', () => {
    const recommendationId = 'handoff-variables-state-0123abcd';
    let memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId, choiceId: 'helpful' },
    }, new Date('2026-08-14T10:00:00Z'), 'feedback-helpful-first');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId, choiceId: 'helpful' },
    }, new Date('2026-08-14T10:01:00Z'), 'feedback-helpful-repeat');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId, choiceId: 'unclear' },
    }, new Date('2026-08-14T10:02:00Z'), 'feedback-unclear');
    memory = recordLearningSignal(memory, {
      kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId, choiceId: 'unclear' },
    }, new Date('2026-08-14T10:03:00Z'), 'feedback-unclear-repeat');

    expect(memory.events.filter((event) => event.kind === 'lesson-handoff-feedback').map((event) => [event.id, event.data.choiceId])).toEqual([
      ['feedback-helpful-first', 'helpful'], ['feedback-unclear', 'unclear'],
    ]);
  });

  it('accepts bounded training milestones but rejects unconstrained stage names', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'training-stage-completed', data: { lessonId: 'starter-array-traversal', stage: 'build', correct: true },
    }, new Date('2026-08-14T00:00:00Z'), 'event-training-build');
    expect(memory.events[0]).toMatchObject({ kind: 'training-stage-completed', data: { stage: 'build', correct: true } });
    expect(() => parseLearnerMemory({ ...memory, events: [{ ...memory.events[0], data: { ...memory.events[0].data, stage: 'essay' } }] })).toThrow('Invalid learning event data');
  });

  it('records diagnostic results without storing the selected answer', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'bridge-diagnostic-step-recorded',
      data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: false },
    }, new Date('2026-08-14T00:00:00Z'), 'diagnostic-state');

    expect(memory.events[0].data).toEqual({ curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: false });
    expect(() => parseLearnerMemory({
      ...memory,
      events: [{ ...memory.events[0], data: { ...memory.events[0].data, answer: 'private' } }],
    })).toThrow('Invalid learning event data');
  });

  it('requires transfer pass evidence to bind lesson, problem, and attempt', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'lesson-transfer-passed', problemId: 'od-transfer', attemptId: 'attempt-pass',
      data: { lessonId: 'arrays-strings', stage: 'transfer', correct: true, assisted: false },
    }, new Date('2026-08-12T00:00:00Z'), 'event-transfer-pass');
    expect(memory.events[0]).toMatchObject({ kind: 'lesson-transfer-passed', problemId: 'od-transfer', attemptId: 'attempt-pass' });
    expect(() => parseLearnerMemory({
      ...memory,
      events: [{ ...memory.events[0], problemId: undefined }],
    })).toThrow('Invalid learning event semantics');
  });

  it('records bounded practicum phases without source code or free-form reflection text', () => {
    const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
      kind: 'practicum-tested', problemId: 'repo-pagination',
      data: { phase: 'verification', passed: true, passedCount: 4, totalCount: 4 },
    }, new Date('2026-08-13T00:00:00Z'), 'event-practicum-test');
    expect(memory.events[0]).toMatchObject({ kind: 'practicum-tested', problemId: 'repo-pagination', data: { passed: true, passedCount: 4 } });
    expect(() => parseLearnerMemory({ ...memory, events: [{ ...memory.events[0], data: { ...memory.events[0].data, sourceCode: 'secret' } }] })).toThrow('Invalid learning event data');
    expect(() => parseLearnerMemory({ ...memory, events: [{ ...memory.events[0], kind: 'practicum-reflected', data: { phase: 'reflection', reflection: 'free text' } }] })).toThrow('Invalid learning event data');
  });
});

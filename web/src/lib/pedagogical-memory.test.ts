import { describe, expect, it } from 'vitest';
import { emptyPedagogicalMemory, loadPedagogicalMemory, pedagogicalDraftsFromAttempt, pedagogicalEditDraft, recordPedagogicalDraft, recordPedagogicalSignal } from './pedagogical-memory';
import { projectPedagogicalEvents } from './learning-projection';
import type { LearningSignal } from './learner-memory';

describe('pedagogical memory bridge', () => {
  it('records only meaningful bounded events from existing learning signals', () => {
    let memory = emptyPedagogicalMemory();
    memory = recordPedagogicalSignal(memory, 'learner-1', { kind: 'attempt-recorded', problemId: 'p1', attemptId: 'a1', data: { outcome: 'wrong-answer', skillIds: ['array'] } }, new Date('2026-08-12T00:00:00Z'), 'ped-1');
    memory = recordPedagogicalSignal(memory, 'learner-1', { kind: 'hint-received', problemId: 'p1', attemptId: 'a1', data: { hintLevel: 1 } }, new Date('2026-08-12T00:01:00Z'), 'ped-2');
    expect(memory.events.map((event) => event.kind)).toEqual(['submission-recorded', 'hint-viewed']);
    expect(JSON.stringify(memory)).not.toContain('sourceCode');
    expect(memory.events[0].evidenceRefs).toEqual(['attempt:a1', 'run:a1']);
  });

  it('ignores signals that lack required evidence instead of inventing it', () => {
    const memory = recordPedagogicalSignal(emptyPedagogicalMemory(), 'learner-1', { kind: 'reference-unlocked', problemId: 'p1', data: {} }, new Date('2026-08-12T00:00:00Z'), 'ped-1');
    expect(memory.events).toEqual([]);
  });

  it('projects one pedagogical lesson open despite repeated mounts', () => {
    let memory = emptyPedagogicalMemory();
    const signal: LearningSignal = { kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' } };
    memory = recordPedagogicalSignal(memory, 'learner-1', signal, new Date('2026-08-14T09:00:00Z'), 'ped-open-first');
    memory = recordPedagogicalSignal(memory, 'learner-1', signal, new Date('2026-08-14T09:05:00Z'), 'ped-open-second');
    memory = recordPedagogicalSignal(memory, 'learner-1', signal, new Date('2026-08-14T09:10:00Z'), 'ped-open-third');

    expect(memory.events.filter((event) => event.kind === 'lesson-opened')).toEqual([
      expect.objectContaining({ id: 'ped-open-first', createdAt: '2026-08-14T09:00:00.000Z', evidenceRefs: ['lesson:variables-state'] }),
    ]);
  });

  it('keeps separate lesson and learner open evidence', () => {
    let memory = emptyPedagogicalMemory();
    memory = recordPedagogicalSignal(memory, 'learner-1', { kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' } }, new Date('2026-08-14T09:00:00Z'), 'learner-1-input');
    memory = recordPedagogicalSignal(memory, 'learner-1', { kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' } }, new Date('2026-08-14T09:01:00Z'), 'learner-1-variables');
    memory = recordPedagogicalSignal(memory, 'learner-2', { kind: 'lesson-started', data: { lessonId: 'input-output', stage: 'explain' } }, new Date('2026-08-14T09:02:00Z'), 'learner-2-input');

    expect(memory.events.filter((event) => event.kind === 'lesson-opened').map((event) => event.id)).toEqual([
      'learner-1-input', 'learner-1-variables', 'learner-2-input',
    ]);
  });

  it('rejects corrupt stored events and returns an empty bounded memory', () => {
    const storage = { getItem: () => JSON.stringify({ version: 1, events: [{ kind: 'raw-keystroke', sourceCode: 'secret' }] }) };
    expect(loadPedagogicalMemory(storage).events).toEqual([]);
  });

  it('captures a real failed run and subsequent edit as replayable debugging evidence', () => {
    const failedAttempt = { id: 'attempt-1', problemId: 'p1', language: 'python' as const, mode: 'run' as const, codeSnapshot: 'print(1)', outcome: 'wrong-answer' as const, summary: 'failed', createdAt: '2026-08-12T00:00:00.000Z', evidence: {} };
    const [failedRun] = pedagogicalDraftsFromAttempt(failedAttempt, ['array']);
    const edit = pedagogicalEditDraft('print(1)', 'print(input())', 'p1', 'attempt-1', ['array']);
    expect(edit?.data).toMatchObject({ insertedLines: 1, deletedLines: 1, pasteBand: 'small' });

    let memory = recordPedagogicalDraft(emptyPedagogicalMemory(), 'learner-a', failedRun, new Date('2026-08-12T00:00:00Z'), 'run-failed');
    memory = recordPedagogicalDraft(memory, 'learner-a', edit!, new Date('2026-08-12T00:01:00Z'), 'edit-after-failure');
    expect(projectPedagogicalEvents(memory.events).phaseReplay).toContainEqual({
      phase: 'debugging', eventIds: ['run-failed', 'edit-after-failure'], evidenceRefs: ['attempt:attempt-1', 'run:attempt-1', 'attempt:attempt-1', 'diff:attempt-1'],
    });
  });

  it('maps a sample submission to executed test and validation events without raw source', () => {
    const attempt = { id: 'attempt-2', problemId: 'p2', language: 'java' as const, mode: 'sample-submit' as const, codeSnapshot: 'class Main {}', outcome: 'passed' as const, summary: '1/1', createdAt: '2026-08-12T00:00:00.000Z', evidence: {} };
    const drafts = pedagogicalDraftsFromAttempt(attempt, ['loop']);
    expect(drafts.map((item) => item.kind)).toEqual(['test-recorded', 'submission-recorded']);
    expect(JSON.stringify(drafts)).not.toContain('class Main');
  });
});

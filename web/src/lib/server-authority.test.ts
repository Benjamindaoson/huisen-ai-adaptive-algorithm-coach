import { describe, expect, it } from 'vitest';
import { adoptAuthoritativeLearning, mergeAppendOnlyLearningEvents } from './server-authority';

describe('server-authoritative learning adoption', () => {
  it('preserves unsynced local append-only events while server events win id conflicts', () => {
    const local = [
      { id: 'local-only', learnerId: 'user-1', kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId: 'handoff-1', choiceId: 'unclear' }, createdAt: '2026-08-14T10:01:00Z' },
      { id: 'shared', learnerId: 'user-1', kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId: 'handoff-1', choiceId: 'unclear' }, createdAt: '2026-08-14T10:00:00Z' },
    ] as const;
    const remote = [
      { id: 'shared', learnerId: 'user-1', kind: 'lesson-handoff-feedback', data: { lessonId: 'variables-state', recommendationId: 'handoff-1', choiceId: 'helpful' }, createdAt: '2026-08-14T10:00:00Z' },
      { id: 'remote-only', learnerId: 'user-1', kind: 'lesson-started', data: { lessonId: 'variables-state', stage: 'explain' }, createdAt: '2026-08-14T09:59:00Z' },
    ] as const;

    const merged = mergeAppendOnlyLearningEvents(local as never, remote as never, 'user-1');

    expect(merged.map((event) => event.id)).toEqual(['remote-only', 'shared', 'local-only']);
    expect(merged.find((event) => event.id === 'shared')?.data.choiceId).toBe('helpful');
    expect(merged.find((event) => event.id === 'local-only')?.learnerId).toBe('user-1');
  });

  it('uses server progress, attempts and exam while retaining only newer offline drafts', () => {
    const localPractice = {
      version: 1 as const,
      drafts: {
        'od-1:python': { problemId: 'od-1', language: 'python' as const, sourceCode: 'new local draft', updatedAt: '2026-08-13T02:00:00Z' },
        'od-2:python': { problemId: 'od-2', language: 'python' as const, sourceCode: 'local only', updatedAt: '2026-08-13T01:00:00Z' },
      },
      attempts: [{ id: 'local-attempt', problemId: 'od-1', language: 'python' as const, mode: 'run' as const, codeSnapshot: 'stale', outcome: 'executed' as const, summary: 'local', createdAt: '2026-08-13T00:00:00Z' }],
    };
    const serverPractice = {
      version: 1,
      drafts: { 'od-1:python': { problemId: 'od-1', language: 'python', sourceCode: 'old server draft', updatedAt: '2026-08-13T01:00:00Z' } },
      attempts: [{ id: 'server-attempt', problemId: 'od-1', language: 'python', mode: 'sample-submit', codeSnapshot: 'server', outcome: 'passed', summary: 'server', createdAt: '2026-08-13T01:30:00Z' }],
    };
    const result = adoptAuthoritativeLearning(localPractice, {
      states: [
        { learnerId: 'u1', kind: 'progress', version: 3, payload: { version: 1, problems: {} }, updatedAt: '2026-08-13T02:00:00Z' },
        { learnerId: 'u1', kind: 'practice', version: 4, payload: serverPractice, updatedAt: '2026-08-13T02:00:00Z' },
        { learnerId: 'u1', kind: 'exam', version: 2, payload: { version: 2, id: 'exam-1', mode: 'independent', status: 'running', startedAt: 1, deadlineAt: 5_400_001, problemIds: ['od-1'], currentProblemId: 'od-1', answers: {}, collaborationEvents: [] }, updatedAt: '2026-08-13T02:00:00Z' },
      ],
    });
    expect(result.practice.attempts.map((item) => item.id)).toEqual(['server-attempt']);
    expect(result.practice.drafts['od-1:python'].sourceCode).toBe('new local draft');
    expect(result.practice.drafts['od-2:python'].sourceCode).toBe('local only');
    expect(result.progress).toEqual({ version: 1, problems: {} });
    expect(result.exam?.id).toBe('exam-1');
    expect(result.versions).toEqual({ progress: 3, practice: 4, exam: 2 });
  });

  it('does not preserve stale local attempts or progress when the server has no mutable state', () => {
    const result = adoptAuthoritativeLearning({ version: 1, drafts: {}, attempts: [{ id: 'stale', problemId: 'od-1', language: 'python', mode: 'run', codeSnapshot: '', outcome: 'executed', summary: '', createdAt: '2026-08-13T00:00:00Z' }] }, { states: [] });
    expect(result.practice.attempts).toEqual([]);
    expect(result.progress).toEqual({ version: 1, problems: {} });
    expect(result.exam).toBeNull();
  });
});

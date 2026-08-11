import { describe, expect, it } from 'vitest';
import type { CatalogProblem } from './catalog';
import { FOUNDATION_LESSONS } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { deriveLessonProgress, findTransferProblem, nextFoundationLesson, remediationLessonFor } from './lesson-progress';
import type { PracticeAttempt } from './practice';

function event(kind: LearningEvent['kind'], lessonId: string, stage?: LearningEvent['data']['stage']): LearningEvent {
  return {
    id: `${kind}-${lessonId}-${stage ?? 'none'}`, learnerId: 'learner-a', kind,
    data: { lessonId, ...(stage ? { stage } : {}) }, createdAt: '2026-08-11T00:00:00Z',
  };
}

function problem(overrides: Partial<CatalogProblem> = {}): CatalogProblem {
  return {
    id: 'p-array', title: '数组练习', collection: 'OD', score: 100, tags: [], languages: ['python'],
    completeness: 'complete', sourcePaths: [], duplicateCount: 0, skills: ['array'], excerpt: '', searchText: '',
    quality: { practiceReady: true, reviewStatus: 'verified', solutionCoverage: 1, issues: [] },
    ...overrides,
  };
}

describe('lesson progress', () => {
  it('unlocks only lessons whose prerequisites are complete', () => {
    expect(deriveLessonProgress([]).get('input-output')?.state).toBe('available');
    expect(deriveLessonProgress([]).get('variables-state')?.state).toBe('locked');

    const progress = deriveLessonProgress([event('lesson-completed', 'input-output')]);
    expect(progress.get('input-output')?.state).toBe('completed');
    expect(progress.get('variables-state')?.state).toBe('available');
  });

  it('preserves checkpoint evidence without claiming completion', () => {
    const progress = deriveLessonProgress([
      event('lesson-started', 'input-output', 'explain'),
      event('lesson-checkpoint-passed', 'input-output', 'predict'),
    ]);
    expect(progress.get('input-output')).toMatchObject({ state: 'checkpoint-passed', checkpointPassed: true });
    expect(nextFoundationLesson(progress)?.id).toBe('input-output');
  });

  it('chooses a stable, practice-ready transfer problem for the lesson skill', () => {
    const lesson = FOUNDATION_LESSONS.find((item) => item.id === 'hash-lookup')!;
    const selected = findTransferProblem(lesson, [
      problem({ id: 'z', skills: ['hash'] }),
      problem({ id: 'a', skills: ['hash'] }),
      problem({ id: 'broken', skills: ['hash'], quality: { practiceReady: false, reviewStatus: 'unreviewed', solutionCoverage: 0, issues: [] } }),
      problem({ id: 'other', skills: ['array'] }),
    ]);
    expect(selected?.id).toBe('a');
    expect(findTransferProblem(lesson, [problem({ id: 'a', skills: ['hash'] })], () => false)).toBeNull();
  });

  it('recommends one unfinished prerequisite lesson after a failed submission', () => {
    const failed: PracticeAttempt = {
      id: 'attempt-a', problemId: 'p-hash', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(0)',
      outcome: 'wrong-answer', summary: '0/1', createdAt: '2026-08-11T00:00:00Z',
    };
    const recommendation = remediationLessonFor(problem({ id: 'p-hash', skills: ['hash'] }), [failed], []);
    expect(recommendation).toMatchObject({ lesson: { id: 'input-output' } });
    expect(recommendation?.reason).toContain('哈希');
  });

  it('does not invent remediation without a failed submission or explicit skill evidence', () => {
    expect(remediationLessonFor(problem({ skills: undefined }), [], [])).toBeNull();
    const passed: PracticeAttempt = {
      id: 'attempt-pass', problemId: 'p-array', language: 'python', mode: 'sample-submit', codeSnapshot: '',
      outcome: 'passed', summary: '1/1', createdAt: '2026-08-11T00:00:00Z',
    };
    expect(remediationLessonFor(problem(), [passed], [])).toBeNull();
  });
});

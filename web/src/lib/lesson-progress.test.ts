import { describe, expect, it } from 'vitest';
import type { CatalogProblem } from './catalog';
import { FOUNDATION_LESSONS } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { activeTransferForProblem, deriveLessonProgress, findTransferProblem, nextFoundationLesson, remediationLessonFor, verifiedTransferReceiptForProblem, verifiedTransferSignalFor } from './lesson-progress';
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

  it('keeps course completion separate from independently verified transfer', () => {
    const completed = event('lesson-completed', 'input-output', 'complete');
    expect(deriveLessonProgress([completed]).get('input-output')).toMatchObject({ completed: true, transferVerified: false });
    const transferPassed: LearningEvent = {
      id: 'transfer-pass', learnerId: 'learner-a', kind: 'lesson-transfer-passed', problemId: 'p-input', attemptId: 'attempt-pass',
      data: { lessonId: 'input-output', stage: 'transfer', correct: true, assisted: false }, createdAt: '2026-08-12T00:01:00Z',
    };
    expect(deriveLessonProgress([completed, transferPassed]).get('input-output')).toMatchObject({ completed: true, transferVerified: true });
  });

  it('finds only a still-active matching transfer before a passing attempt', () => {
    const started: LearningEvent = { id: 'transfer-start', learnerId: 'learner-a', kind: 'lesson-transfer-started', problemId: 'p-input', data: { lessonId: 'input-output', stage: 'transfer' }, createdAt: '2026-08-12T00:00:00Z' };
    expect(activeTransferForProblem([started], 'p-input', new Date('2026-08-12T00:01:00Z'))).toMatchObject({ data: { lessonId: 'input-output' } });
    expect(activeTransferForProblem([started], 'other', new Date('2026-08-12T00:01:00Z'))).toBeNull();
  });

  it('creates transfer proof only for an unassisted passing submission after transfer start', () => {
    const started: LearningEvent = { id: 'transfer-start', learnerId: 'learner-a', kind: 'lesson-transfer-started', problemId: 'p-input', data: { lessonId: 'input-output', stage: 'transfer' }, createdAt: '2026-08-12T00:00:00Z' };
    const pass: PracticeAttempt = { id: 'attempt-pass', problemId: 'p-input', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(1)', outcome: 'passed', summary: '1/1', createdAt: '2026-08-12T00:02:00Z' };
    expect(verifiedTransferSignalFor(pass, [], [started])).toEqual({
      kind: 'lesson-transfer-passed', problemId: 'p-input', attemptId: 'attempt-pass',
      data: { lessonId: 'input-output', stage: 'transfer', correct: true, assisted: false, skillIds: ['io-parsing'] },
    });
    const hint: LearningEvent = { id: 'hint', learnerId: 'learner-a', kind: 'hint-received', problemId: 'p-input', attemptId: 'attempt-fail', data: { hintLevel: 2 }, createdAt: '2026-08-12T00:01:00Z' };
    expect(verifiedTransferSignalFor(pass, [], [started, hint])).toBeNull();
  });

  it('builds a persistent receipt only from a pass bound to its matching transfer start', () => {
    const started: LearningEvent = { id: 'transfer-start', learnerId: 'learner-a', kind: 'lesson-transfer-started', problemId: 'p-input', data: { lessonId: 'input-output', stage: 'transfer', skillIds: ['io-parsing'] }, createdAt: '2026-08-12T00:00:00Z' };
    const passed: LearningEvent = { id: 'transfer-pass', learnerId: 'learner-a', kind: 'lesson-transfer-passed', problemId: 'p-input', attemptId: 'attempt-pass', data: { lessonId: 'input-output', stage: 'transfer', correct: true, assisted: false, skillIds: ['io-parsing'] }, createdAt: '2026-08-12T00:02:00Z' };

    expect(verifiedTransferReceiptForProblem([started, passed], 'p-input')).toEqual({
      eventId: 'transfer-pass', problemId: 'p-input', lessonId: 'input-output', attemptId: 'attempt-pass', verifiedAt: '2026-08-12T00:02:00Z',
      skillIds: ['io-parsing'], evidenceRefs: ['event:transfer-start', 'event:transfer-pass', 'attempt:attempt-pass'],
    });
    expect(verifiedTransferReceiptForProblem([passed], 'p-input')).toBeNull();
    expect(verifiedTransferReceiptForProblem([started, { ...passed, data: { ...passed.data, assisted: true } }], 'p-input')).toBeNull();
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
    expect(recommendation).toMatchObject({ confidence: 'low', authority: 'skill-route' });
  });

  it('prefers submission evidence over broad problem tags when choosing remediation', () => {
    const failed: PracticeAttempt = {
      id: 'attempt-input', problemId: 'p-array', language: 'python', mode: 'sample-submit', codeSnapshot: 'parts = input.split()',
      outcome: 'runtime-error', summary: '运行错误', createdAt: '2026-08-11T00:00:00Z',
      evidence: { stderr: "object has no attribute 'split'" },
    };
    const recommendation = remediationLessonFor(problem({ skills: ['array'] }), [failed], []);
    expect(recommendation).toMatchObject({ lesson: { id: 'input-output' }, misconceptionId: 'input-parsing', confidence: 'high', authority: 'runtime-evidence' });
    expect(recommendation?.reason).toContain('运行错误证据');
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

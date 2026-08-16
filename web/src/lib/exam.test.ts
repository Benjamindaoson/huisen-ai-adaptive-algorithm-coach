import { describe, expect, it } from 'vitest';
import {
  EXAM_STORAGE_KEY,
  createExamSession,
  getExamModePolicy,
  loadExam,
  remainingExamMs,
  saveExam,
  setExamAnswerLanguage,
  submitExam,
  updateExamAnswer,
} from './exam';

describe('exam session', () => {
  it('uses an absolute deadline that cannot be extended by a reload', () => {
    const exam = createExamSession(['a', 'b', 'c'], 90, 1_000, 'exam-1');
    expect(exam.deadlineAt).toBe(5_401_000);
    expect(remainingExamMs(exam, 61_000)).toBe(5_340_000);
    expect(remainingExamMs(exam, 9_000_000)).toBe(0);
  });

  it('defaults new and legacy sessions to the explicit independent no-AI policy', () => {
    const created = createExamSession(['a'], 90, 1_000, 'exam-1');
    expect(created.mode).toBe('independent');
    expect(getExamModePolicy(created)).toMatchObject({
      mode: 'independent',
      aiAssistance: 'disabled',
      mentor: 'unavailable',
      references: 'unavailable',
      historicalSolutions: 'unavailable',
    });

    const storage = new MemoryStorage();
    storage.setItem(EXAM_STORAGE_KEY, JSON.stringify({
      version: 1,
      id: 'legacy-exam',
      status: 'running',
      problemIds: ['a'],
      currentProblemId: 'a',
      startedAt: 1_000,
      deadlineAt: 5_401_000,
      answers: {},
    }));

    expect(loadExam(storage)).toMatchObject({
      version: 2,
      id: 'legacy-exam',
      mode: 'independent',
      collaborationEvents: [],
      deadlineAt: 5_401_000,
    });
  });

  it('keeps the language and source isolated by problem', () => {
    const exam = createExamSession(['a', 'b'], 90, 1_000, 'exam-1');
    const withA = updateExamAnswer(exam, 'a', 'python', 'print(1)', 2_000);
    const withB = updateExamAnswer(withA, 'b', 'javascript', 'console.log(2)', 3_000);

    expect(withB.answers.a).toMatchObject({ language: 'python', sourceCode: 'print(1)' });
    expect(withB.answers.b).toMatchObject({ language: 'javascript', sourceCode: 'console.log(2)' });
    expect(exam.answers).toEqual({});
  });

  it('does not count a language starter as a real answer until the user edits it', () => {
    const exam = createExamSession(['a'], 90, 1_000, 'exam-1');
    const starter = setExamAnswerLanguage(exam, 'a', 'python', 'starter', 2_000);
    expect(starter.answers.a.touched).toBe(false);
    expect(updateExamAnswer(starter, 'a', 'python', 'user code', 3_000).answers.a.touched).toBe(true);
  });

  it('persists and restores a valid session but rejects corrupt data', () => {
    const storage = new MemoryStorage();
    const exam = updateExamAnswer(createExamSession(['a'], 30, 1_000, 'exam-1'), 'a', 'cpp', '#include <iostream>', 2_000);
    saveExam(storage, exam);
    expect(loadExam(storage)).toEqual(exam);

    storage.setItem(EXAM_STORAGE_KEY, JSON.stringify({ ...exam, deadlineAt: 'tomorrow' }));
    expect(loadExam(storage)).toBeNull();
    storage.setItem(EXAM_STORAGE_KEY, '{bad json');
    expect(loadExam(storage)).toBeNull();
  });

  it('rejects a persisted independent session that contains collaboration evidence', () => {
    const storage = new MemoryStorage();
    storage.setItem(EXAM_STORAGE_KEY, JSON.stringify({
      version: 2,
      id: 'tampered-exam',
      status: 'running',
      mode: 'independent',
      problemIds: ['a'],
      currentProblemId: 'a',
      startedAt: 1_000,
      deadlineAt: 5_401_000,
      answers: {},
      collaborationEvents: [{
        id: 'plan-1', type: 'plan', recordedAt: 2_000,
        evidence: [{ id: 'prompt-1', kind: 'prompt', summary: 'Plan.' }],
      }],
    }));
    expect(loadExam(storage)).toBeNull();
  });

  it('submits once and preserves the original report on repeated calls', () => {
    const exam = createExamSession(['a'], 30, 1_000, 'exam-1');
    const report = {
      submittedAt: 10_000,
      durationUsedMs: 9_000,
      score: 100,
      gradingScope: 'public-samples' as const,
      results: [{ problemId: 'a', verdict: 'passed' as const, passedCount: 2, totalCount: 2, errorSummary: '' }],
    };
    const submitted = submitExam(exam, report);
    expect(submitted.status).toBe('submitted');
    expect(submitExam(submitted, { ...report, score: 0 })).toBe(submitted);
    expect(() => updateExamAnswer(submitted, 'a', 'python', 'changed', 11_000)).toThrow('submitted');
  });
});

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

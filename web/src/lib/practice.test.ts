import { describe, expect, it } from 'vitest';
import { emptyPractice, loadPractice, parsePracticeState, recordAttempt, updateDraft, type PracticeAttempt } from './practice';

function attempt(id: string, problemId = 'od-a', language: PracticeAttempt['language'] = 'python'): PracticeAttempt {
  return {
    id,
    problemId,
    language,
    mode: 'run',
    codeSnapshot: `code-${id}`,
    outcome: 'executed',
    summary: '运行成功',
    createdAt: `2026-08-11T00:00:${id.padStart(2, '0')}.000Z`,
  };
}

describe('practice state', () => {
  it('keeps drafts isolated by problem and language', () => {
    let state = emptyPractice();
    state = updateDraft(state, 'od-a', 'python', 'print(1)', new Date('2026-08-11T01:00:00Z'));
    state = updateDraft(state, 'od-a', 'java', 'class Main {}', new Date('2026-08-11T01:01:00Z'));

    expect(state.drafts['od-a:python'].sourceCode).toBe('print(1)');
    expect(state.drafts['od-a:java'].sourceCode).toBe('class Main {}');
  });

  it('retains only the newest 20 attempts for one problem and language', () => {
    let state = emptyPractice();
    state = recordAttempt(state, attempt('other', 'od-b'));
    for (let index = 0; index < 22; index += 1) state = recordAttempt(state, attempt(String(index)));

    const ownAttempts = state.attempts.filter((item) => item.problemId === 'od-a');
    expect(ownAttempts).toHaveLength(20);
    expect(ownAttempts[0].id).toBe('2');
    expect(state.attempts.some((item) => item.id === 'other')).toBe(true);
  });

  it('validates imported state instead of trusting arbitrary data', () => {
    expect(() => parsePracticeState({ version: 1, drafts: [], attempts: [] })).toThrow('Invalid practice drafts');
    expect(() => parsePracticeState({ version: 99, drafts: {}, attempts: [] })).toThrow('Unsupported practice version');
  });

  it('recovers with an empty state when browser storage is malformed', () => {
    const storage = { getItem: () => '{bad json' } as Pick<Storage, 'getItem'>;
    expect(loadPractice(storage)).toEqual(emptyPractice());
  });

  it('accepts legacy attempts without evidence and validates bounded new evidence', () => {
    const legacy = attempt('1');
    expect(parsePracticeState({ version: 1, drafts: {}, attempts: [legacy] }).attempts[0].evidence).toBeUndefined();

    const withEvidence = {
      ...legacy,
      evidence: {
        stderr: 'SyntaxError: missing )',
        timeMs: 12,
        failedCase: {
          name: '示例 1', stdin: '1', expectedOutput: '2', actualOutput: '3', verdict: 'wrong-answer',
        },
      },
    };
    expect(parsePracticeState({ version: 1, drafts: {}, attempts: [withEvidence] }).attempts[0].evidence).toEqual(withEvidence.evidence);
  });

  it('rejects oversized or malformed attempt evidence', () => {
    const oversized = { ...attempt('1'), evidence: { stderr: 'x'.repeat(32_001) } };
    const hiddenShape = { ...attempt('2'), evidence: { failedCase: { name: 'x', stdin: '1', expectedOutput: '2', actualOutput: '3', verdict: 'hidden' } } };
    expect(() => parsePracticeState({ version: 1, drafts: {}, attempts: [oversized] })).toThrow('Invalid practice attempt evidence');
    expect(() => parsePracticeState({ version: 1, drafts: {}, attempts: [hiddenShape] })).toThrow('Invalid practice attempt evidence');
  });
});

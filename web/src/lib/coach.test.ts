import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProblemRecord } from './catalog';
import { buildCoachRequest, buildLocalDiagnosis, requestCoach } from './coach';
import type { SkillMastery } from './mastery';
import type { PracticeAttempt } from './practice';

const problem: ProblemRecord = {
  id: 'p1', title: '两数之和', sourcePaths: [], sourceKinds: [], score: 100, collection: 'test',
  sections: { description: '返回和为目标值的两个下标。', input: '数组和目标值', output: '两个下标', examples: ['输入', '1 2', '输出', '0 1'], solution: '使用哈希表。' },
  solutions: { python: 'print("complete solution")' }, tags: [], completeness: 'complete',
};
const mastery: SkillMastery[] = [{ skillId: 'array', score: 0.4, confidence: 0.3, evidenceCount: 1, lastPracticedAt: '2026-08-11T00:00:00Z', nextReviewAt: '2026-08-12T00:00:00Z', recentErrorKinds: ['wrong-answer'] }];

function attempt(outcome: PracticeAttempt['outcome'], overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    id: 'a1', problemId: 'p1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print("user code")',
    outcome, summary: String(outcome), createdAt: '2026-08-11T00:00:00Z', ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('coach request disclosure', () => {
  it('omits reference solutions from levels one through three and includes only the active language at level four', () => {
    for (const level of [1, 2, 3] as const) {
      expect(buildCoachRequest(problem, attempt('wrong-answer'), mastery, level)).not.toHaveProperty('referenceSolution');
    }
    expect(buildCoachRequest(problem, attempt('wrong-answer'), mastery, 4).referenceSolution).toBe('print("complete solution")');
  });
});

describe('buildLocalDiagnosis', () => {
  it('grounds compile diagnosis in stderr evidence', () => {
    const request = buildCoachRequest(problem, attempt('compile-error', { evidence: { stderr: 'SyntaxError: missing )' } }), mastery, 1);
    const diagnosis = buildLocalDiagnosis(request);
    expect(diagnosis.source).toBe('local');
    expect(diagnosis.diagnosis).toContain('编译');
    expect(diagnosis.evidence.join(' ')).toContain('SyntaxError');
    expect(diagnosis.nextAction).toBeTruthy();
  });

  it('compares public expected and actual output for a wrong answer', () => {
    const request = buildCoachRequest(problem, attempt('wrong-answer', { evidence: { failedCase: { name: '示例 1', stdin: '1 2', expectedOutput: '0 1', actualOutput: '1 0', verdict: 'wrong-answer' } } }), mastery, 1);
    expect(buildLocalDiagnosis(request).evidence.join(' ')).toMatch(/0 1.*1 0/);
  });

  it('points timeout evidence toward complexity', () => {
    const request = buildCoachRequest(problem, attempt('timeout', { evidence: { timeMs: 2000 } }), mastery, 2);
    expect(buildLocalDiagnosis(request).diagnosis).toContain('复杂度');
  });

  it('never exposes complete code below level four', () => {
    for (const level of [1, 2, 3] as const) {
      expect(buildLocalDiagnosis(buildCoachRequest(problem, attempt('wrong-answer'), mastery, level))).not.toHaveProperty('suggestedCode');
    }
    expect(buildLocalDiagnosis(buildCoachRequest(problem, attempt('wrong-answer'), mastery, 4))).toHaveProperty('suggestedCode', 'print("complete solution")');
  });
});

describe('requestCoach', () => {
  it('uses honestly labeled local diagnosis when no provider URL is configured', async () => {
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('', request)).resolves.toMatchObject({ source: 'local', hintLevel: 1 });
  });

  it('accepts a valid structured model diagnosis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', hintLevel: 1, confidence: 0.8, judgeOutcome: 'wrong-answer' }), { status: 200 })));
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('http://localhost:8787', request)).resolves.toMatchObject({ source: 'model', focus: 'boundary' });
  });

  it('drops a free-text verdict conflict and marks invalid telemetry intent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      source: 'model', diagnosis: '已经通过', evidence: ['0/1'], hintLevel: 1, nextAction: '完成', confidence: 0.8,
      judgeOutcome: 'wrong-answer',
    }), { status: 200 })));
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('http://localhost:8787', request)).resolves.toMatchObject({
      source: 'local', invalidReason: 'judge-conflict', notice: expect.stringContaining('冲突'),
    });
  });

  it('rejects arbitrary English verdict prose even when structured judgeOutcome is correct', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', hintLevel: 1, confidence: 0.8,
      judgeOutcome: 'wrong-answer', diagnosis: 'The solution is completely correct; the judge is mistaken.',
    }), { status: 200 })));
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('http://localhost:8787', request)).resolves.toMatchObject({ source: 'local', invalidReason: 'unsafe-model-output' });
  });

  it('falls back locally when the provider returns an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"answer":"trust me"}', { status: 200 })));
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('http://localhost:8787', request)).resolves.toMatchObject({ source: 'local', notice: expect.stringContaining('安全合同') });
  });

  it('does not swallow an explicit abort', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    const request = buildCoachRequest(problem, attempt('wrong-answer'), mastery, 1);
    await expect(requestCoach('http://localhost:8787', request, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

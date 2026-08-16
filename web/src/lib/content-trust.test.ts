import { describe, expect, it } from 'vitest';
import {
  computeGeneratedContentHash,
  evaluateExpansionGate,
  isEligibleForTrustedLearning,
  promoteContent,
  validateGeneratedContent,
  type GeneratedContentCandidate,
} from './content-trust';

const candidateWithoutHash: Omit<GeneratedContentCandidate, 'contentHash'> = {
  id: 'content-1', version: 1, kind: 'transfer-problem', title: '窗口迁移题', body: '求满足条件的最短连续区间。',
  generator: { provider: 'deepseek', model: 'deepseek-chat', promptHash: 'sha256:prompt' },
  sourceEvidence: ['lesson:sliding-window@1'], targetSkillIds: ['array'], language: 'python',
  trust: 'candidate', constraints: { timeLimitMs: 1000, memoryLimitMb: 128 },
  solution: 'print(input())', tests: [{ input: 'a\n', expectedOutput: 'a\n' }], answerLeakage: false,
};
const candidate: GeneratedContentCandidate = { ...candidateWithoutHash, contentHash: computeGeneratedContentHash(candidateWithoutHash) };

describe('generated content trust', () => {
  it('keeps a candidate unpublished when executable evidence fails', async () => {
    const result = await validateGeneratedContent(candidate, async () => ({ passed: false, output: 'b\n', durationMs: 10 }));
    expect(result.content.trust).toBe('candidate');
    expect(result.publishable).toBe(false);
    expect(result.evidence.some((item) => item.check === 'solution-execution' && !item.passed)).toBe(true);
  });

  it('promotes only to auto-validated after deterministic checks, then requires a human', async () => {
    const validated = await validateGeneratedContent(candidate, async () => ({ passed: true, output: 'a\n', durationMs: 12 }));
    expect(validated.content.trust).toBe('auto-validated');
    expect(validated.publishable).toBe(false);
    expect(() => promoteContent(validated.content, { reviewerId: '', decision: 'approve', reviewedAt: '2026-08-12T00:00:00.000Z' })).toThrow();
    const promoted = promoteContent(validated.content, { reviewerId: 'teacher-1', decision: 'approve', reviewedAt: '2026-08-12T00:00:00.000Z' });
    expect(promoted.trust).toBe('human-verified');
    expect(promoted.review?.contentHash).toBe(candidate.contentHash);
    expect(isEligibleForTrustedLearning(promoted)).toBe(true);
    expect(isEligibleForTrustedLearning(validated.content)).toBe(false);
  });

  it('keeps expansion closed and exposes missing evidence', () => {
    const gate = evaluateExpansionGate({ realAdjudicatedCases: 84, transferLift: 0.07, delayedRetention: 0.41, humanVerifiedContent: 9 });
    expect(gate.open).toBe(false);
    expect(gate.missing.map((item) => item.metric)).toEqual(['realAdjudicatedCases', 'transferLift', 'delayedRetention', 'humanVerifiedContent']);
  });

  it('rejects post-validation content tampering and non-finite expansion evidence', async () => {
    const validated = await validateGeneratedContent(candidate, async () => ({ passed: true, output: 'a\n', durationMs: 12 }));
    const tampered = { ...validated.content, body: `${validated.content.body} changed` };
    expect(() => promoteContent(tampered, { reviewerId: 'teacher-1', decision: 'approve', reviewedAt: '2026-08-12T00:00:00.000Z' })).toThrow(/changed/i);
    expect(evaluateExpansionGate({ realAdjudicatedCases: Number.NaN, transferLift: Number.POSITIVE_INFINITY, delayedRetention: 1, humanVerifiedContent: 20 }).open).toBe(false);
  });

  it('keeps normalized duplicate generated content at candidate trust', async () => {
    const duplicateBase = { ...candidate, id: 'content-2', title: `  ${candidate.title} `, body: candidate.body.replace(/ /g, '  '), contentHash: '' };
    const duplicate = { ...duplicateBase, contentHash: computeGeneratedContentHash(duplicateBase) };
    const result = await validateGeneratedContent(duplicate, async () => ({ passed: true, output: 'a\n', durationMs: 12 }), [candidate]);
    expect(result.content.trust).toBe('candidate');
    expect(result.evidence).toContainEqual(expect.objectContaining({ check: 'duplicate', passed: false }));
  });

  it('rejects a forged content hash and near-duplicate surface variation', async () => {
    const forged = { ...candidate, body: `${candidate.body} 请完成。` };
    const forgedResult = await validateGeneratedContent(forged, async () => ({ passed: true, output: 'a\n', durationMs: 12 }));
    expect(forgedResult.evidence).toContainEqual(expect.objectContaining({ check: 'schema', passed: false }));

    const nearBase = { ...candidate, id: 'content-3', body: '求满足条件的最短连续区间!', contentHash: '' };
    const near = { ...nearBase, contentHash: computeGeneratedContentHash(nearBase) };
    const result = await validateGeneratedContent(near, async () => ({ passed: true, output: 'a\n', durationMs: 12 }), [candidate]);
    expect(result.evidence).toContainEqual(expect.objectContaining({ check: 'duplicate', passed: false }));
  });
});

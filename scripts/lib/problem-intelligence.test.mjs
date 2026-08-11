import { describe, expect, it } from 'vitest';
import { buildProblemIntelligenceReport, classifyProblem } from './problem-intelligence.mjs';

const completeProblem = {
  id: 'od-array',
  title: '数组中的二分查找',
  completeness: 'complete',
  sections: { description: '在有序数组中查找目标值', input: '输入数组', output: '输出位置', examples: [] },
  solutions: { python: 'print(1)', java: 'class Main {}' },
};

describe('classifyProblem', () => {
  it('uses an explicit Golden annotation and preserves its review status', () => {
    expect(classifyProblem(completeProblem, {
      id: 'od-array', skills: ['array', 'binary-search'], reviewStatus: 'verified', skillReviewStatus: 'verified',
    })).toMatchObject({
      skills: ['array', 'binary-search'],
      classification: { source: 'verified', confidence: 1 },
      quality: { practiceReady: true, reviewStatus: 'verified', solutionCoverage: 2, issues: [] },
    });
  });

  it('labels keyword classification as inferred instead of verified', () => {
    const result = classifyProblem(completeProblem);
    expect(result.skills).toEqual(expect.arrayContaining(['array', 'binary-search']));
    expect(result.classification.source).toBe('inferred');
    expect(result.classification.confidence).toBeLessThan(1);
    expect(result.quality.reviewStatus).toBe('unreviewed');
  });

  it('keeps index-only content searchable but not practice ready', () => {
    const result = classifyProblem({
      ...completeProblem,
      completeness: 'index-only',
      sections: { description: '', examples: [] },
      solutions: {},
    });
    expect(result.quality).toMatchObject({ practiceReady: false, reviewStatus: 'needs-content', solutionCoverage: 0 });
    expect(result.quality.issues).toEqual(expect.arrayContaining(['incomplete-statement', 'missing-solution']));
  });

  it('keeps readable, solution, public-sample, hidden-test and verification readiness separate', () => {
    const result = classifyProblem(completeProblem, {
      id: 'od-array', skills: ['array'], reviewStatus: 'candidate',
      contentReviewStatus: 'verified', publicSampleCount: 2, hiddenTestCount: 3,
      solutionReviewStatus: 'verified', skillReviewStatus: 'inferred',
    });
    expect(result.quality).toMatchObject({
      readable: true, solutionPresent: true, publicSampleJudgeable: true,
      hiddenJudgeable: true, solutionVerified: true, contentVerified: true,
      judgeReady: true, verified: true, publicSampleCount: 2, hiddenTestCount: 3,
    });
  });

  it('does not call a complete problem judge-ready when its tests are unreviewed', () => {
    const result = classifyProblem(completeProblem);
    expect(result.quality).toMatchObject({
      readable: true, solutionPresent: true, publicSampleJudgeable: false,
      hiddenJudgeable: false, judgeReady: false, verified: false,
    });
  });

  it('reports readiness dimensions and a deterministic verification backlog', () => {
    const ready = { id: 'ready', skills: ['array'], classification: { source: 'candidate' }, quality: {
      practiceReady: true, reviewStatus: 'candidate', readable: true, solutionPresent: true,
      publicSampleJudgeable: true, hiddenJudgeable: true, solutionVerified: true, verified: true,
    } };
    const missing = { id: 'missing', skills: ['array'], classification: { source: 'inferred' }, quality: {
      practiceReady: true, reviewStatus: 'unreviewed', readable: true, solutionPresent: true,
      publicSampleJudgeable: false, hiddenJudgeable: false, solutionVerified: false, verified: false,
    } };
    const report = buildProblemIntelligenceReport([missing, ready]);
    expect(report.readiness).toEqual({ readable: 2, solutionPresent: 2, publicSampleJudgeable: 1, hiddenJudgeable: 1, verified: 1 });
    expect(report.verificationBacklog).toEqual([
      { id: 'missing', missing: ['public-samples', 'hidden-tests', 'solution-verification', 'human-verification'] },
    ]);
  });
});

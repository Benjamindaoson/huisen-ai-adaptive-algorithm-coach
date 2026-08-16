import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { evaluateMentorBenchmarkV2, migrateMentorBenchmarkV1, validateMentorBenchmarkV2 } from './mentor-benchmark-v2.mjs';

function sha256(sourceCode) {
  return createHash('sha256').update(sourceCode).digest('hex');
}

function caseFixture(overrides = {}) {
  const sourceCode = overrides.sourceCode ?? 'console.log(values[values.length]);';
  return {
    id: overrides.id ?? 'case-1',
    language: overrides.language ?? 'javascript',
    learnerBand: overrides.learnerBand ?? 'beginner',
    attempt: { id: overrides.attemptId ?? 'attempt-1', sourceCode, sourceHash: sha256(sourceCode) },
    execution: { verdict: overrides.verdict ?? 'wrong-answer', refs: overrides.refs ?? ['run:1', 'code:line:1'] },
    provenance: overrides.provenance ?? { origin: 'synthetic-mutation', sourceUrl: 'local://seed/case-1', license: 'CC0-1.0' },
    adjudication: overrides.adjudication ?? { status: 'teacher-adjudicated', reviewerId: 'teacher-1', completedAt: '2026-08-12T00:00:00.000Z' },
    expected: overrides.expected ?? { errorFamily: 'boundary', misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary' },
    prohibitedFragments: overrides.prohibitedFragments ?? ['values.length - 1'],
  };
}

function benchmark(cases) {
  return {
    version: 2,
    name: 'unit-v2',
    thresholds: {
      lineLocalizationAccuracy: 0.8,
      misconceptionAccuracy: 0.8,
      evidenceSufficiency: 0.8,
      minimalHintEffectiveness: 0.8,
      answerLeakageRate: 0,
      falseConclusionRate: 0,
    },
    releaseGate: {
      minimumEligibleRealCases: 100,
      requiredCoverage: {
        languages: ['javascript'],
        learnerBands: ['beginner'],
        errorFamilies: ['boundary'],
        verdicts: ['wrong-answer'],
      },
    },
    cases,
  };
}

function prediction(caseId, overrides = {}) {
  return {
    caseId,
    misconception: 'off-by-one',
    lines: [1],
    hintIntent: 'predict-boundary',
    hint: 'Trace the last valid index before changing the loop.',
    conclusion: { confidence: 'high', evidenceRefs: ['run:1'] },
    ...overrides,
  };
}

describe('mentor benchmark v2', () => {
  it('rejects fixtures without explicit immutable provenance and completed adjudication fields', () => {
    const invalid = caseFixture({ provenance: { origin: 'public-dataset', sourceUrl: '', license: '' } });
    expect(() => validateMentorBenchmarkV2(benchmark([invalid]))).toThrow(/provenance/i);

    const hashMismatch = caseFixture({ attemptId: 'attempt-2' });
    hashMismatch.attempt.sourceHash = 'a'.repeat(64);
    expect(() => validateMentorBenchmarkV2(benchmark([hashMismatch]))).toThrow(/source hash/i);
  });

  it('reports all six metrics and language, error, learner, and verdict slices', () => {
    const fixture = caseFixture();
    const report = evaluateMentorBenchmarkV2(benchmark([fixture]), [prediction(fixture.id)]);

    expect(report.metrics).toEqual({
      lineLocalizationAccuracy: 1,
      misconceptionAccuracy: 1,
      evidenceSufficiency: 1,
      minimalHintEffectiveness: 1,
      answerLeakageRate: 0,
      falseConclusionRate: 0,
    });
    expect(report.segments.language.javascript.fixtureCount).toBe(1);
    expect(report.segments.errorFamily.boundary.fixtureCount).toBe(1);
    expect(report.segments.learnerBand.beginner.fixtureCount).toBe(1);
    expect(report.segments.verdict['wrong-answer'].fixtureCount).toBe(1);
  });

  it('counts an unsupported confident diagnosis as insufficient evidence and a false conclusion', () => {
    const fixture = caseFixture();
    const report = evaluateMentorBenchmarkV2(benchmark([fixture]), [prediction(fixture.id, {
      conclusion: { confidence: 'high', evidenceRefs: ['run:missing'] },
    })]);

    expect(report.metrics.evidenceSufficiency).toBe(0);
    expect(report.metrics.falseConclusionRate).toBe(1);
  });

  it('never counts synthetic cases as eligible real evidence and keeps the release gate closed below 100', () => {
    const synthetic = caseFixture();
    const publicCase = caseFixture({
      id: 'public-1',
      attemptId: 'attempt-public-1',
      provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/codenet/p1', license: 'Apache-2.0' },
    });
    const report = evaluateMentorBenchmarkV2(benchmark([synthetic, publicCase]), [prediction(synthetic.id), prediction(publicCase.id)]);

    expect(report.eligibleRealCaseCount).toBe(1);
    expect(report.releaseGate.passed).toBe(false);
    expect(report.releaseGate.failures).toContain('eligible-real-cases: 1/100');
  });

  it('does not count teacher-adjudicated public cases whose license is not approved for benchmark use', () => {
    const restricted = caseFixture({
      id: 'restricted-1',
      attemptId: 'attempt-restricted-1',
      provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/restricted/p1', license: 'All-Rights-Reserved' },
    });
    const report = evaluateMentorBenchmarkV2(benchmark([restricted]), [prediction(restricted.id)]);

    expect(report.eligibleRealCaseCount).toBe(0);
    expect(report.rows[0]).toMatchObject({ licenseEligible: false });
    expect(report.releaseGate.failures).toContain('provenance:unapproved-license:restricted-1');
  });

  it('migrates v1 seed fixtures as synthetic rather than pretending they are real submissions', () => {
    const migrated = migrateMentorBenchmarkV1({
      version: 1, name: 'legacy', thresholds: { lineAccuracy: 0.8, misconceptionAccuracy: 0.7, unsupportedHighConfidenceRate: 0.02, minimalHintUsefulness: 0.4, answerLeakageRate: 0 },
      cases: [{ id: 'legacy-1', language: 'javascript', sourceCode: 'console.log(1)', evidence: { outcome: 'wrong-answer', refs: ['run:1'] }, expected: { misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary' }, prohibitedFragments: [] }],
    });

    expect(migrated.cases[0]).toMatchObject({ provenance: { origin: 'synthetic-mutation' }, adjudication: { status: 'teacher-adjudicated' } });
  });

  it('keeps the gate red instead of crashing when a newly adjudicated case has no prediction yet', () => {
    const seed = caseFixture();
    const newlyAdjudicated = caseFixture({ id: 'new-gold', attemptId: 'attempt-new-gold', provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/gold', license: 'MIT' } });
    const report = evaluateMentorBenchmarkV2(benchmark([seed, newlyAdjudicated]), [prediction(seed.id)]);

    expect(report.teacherAdjudicatedCaseCount).toBe(2);
    expect(report.missingPredictionCaseIds).toEqual(['new-gold']);
    expect(report.releaseGate.failures).toContain('prediction:missing:new-gold');
  });
});

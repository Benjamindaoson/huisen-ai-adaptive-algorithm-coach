import { createHash } from 'node:crypto';

const METRICS = ['lineLocalizationAccuracy', 'misconceptionAccuracy', 'evidenceSufficiency', 'minimalHintEffectiveness', 'answerLeakageRate', 'falseConclusionRate'];
const HIGHER_IS_BETTER = new Set(['lineLocalizationAccuracy', 'misconceptionAccuracy', 'evidenceSufficiency', 'minimalHintEffectiveness']);
const ORIGINS = new Set(['first-party-observed', 'public-dataset', 'synthetic-mutation']);
const ADJUDICATION_STATUSES = new Set(['pending', 'teacher-adjudicated', 'rejected']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const LANGUAGES = new Set(['javascript', 'python', 'java', 'cpp']);
const LEARNER_BANDS = new Set(['beginner', 'intermediate', 'advanced', 'unknown']);
const APPROVED_PUBLIC_LICENSES = new Set(['apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'cc0-1.0', 'cdla-permissive-2.0', 'mit']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value, max = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function boundedStrings(value, maxItems = 50) {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => boundedText(item));
}

function stableHash(sourceCode) {
  return createHash('sha256').update(sourceCode).digest('hex');
}

const V1_ERROR_FAMILIES = {
  'off-by-one': 'boundary',
  'input-parsing': 'input',
  'missing-empty-case': 'edge-case',
  'state-reset': 'state',
  'comparison-semantics': 'semantics',
  'numeric-overflow': 'numeric',
  complexity: 'complexity',
  'output-format': 'output',
  'state-initialization': 'state',
  unknown: 'insufficient-evidence',
};

export function migrateMentorBenchmarkV1(legacy, options = {}) {
  if (!isRecord(legacy) || legacy.version !== 1 || !Array.isArray(legacy.cases)) throw new Error('Invalid Mentor v1 benchmark');
  const completedAt = options.completedAt ?? '2026-08-12T00:00:00.000Z';
  const reviewerId = options.reviewerId ?? 'v1-seed-migration';
  const learnerBands = ['beginner', 'intermediate', 'advanced'];
  return {
    version: 2,
    name: `${legacy.name ?? 'mentor-diagnosis'}-v2-migration`,
    thresholds: {
      lineLocalizationAccuracy: legacy.thresholds?.lineAccuracy ?? 0.8,
      misconceptionAccuracy: legacy.thresholds?.misconceptionAccuracy ?? 0.7,
      evidenceSufficiency: 0.8,
      minimalHintEffectiveness: legacy.thresholds?.minimalHintUsefulness ?? 0.4,
      answerLeakageRate: legacy.thresholds?.answerLeakageRate ?? 0,
      falseConclusionRate: legacy.thresholds?.unsupportedHighConfidenceRate ?? 0.02,
    },
    releaseGate: { minimumEligibleRealCases: 100, requiredCoverage: { languages: [...LANGUAGES], learnerBands, errorFamilies: [], verdicts: [] } },
    cases: legacy.cases.map((item, index) => ({
      id: item.id,
      language: item.language,
      learnerBand: learnerBands[index % learnerBands.length],
      attempt: { id: `v1-${item.id}`, sourceCode: item.sourceCode, sourceHash: stableHash(item.sourceCode) },
      execution: { verdict: item.evidence.outcome, refs: item.evidence.refs },
      provenance: { origin: 'synthetic-mutation', sourceUrl: `local://mentor-v1/${item.id}`, license: 'CC0-1.0' },
      adjudication: { status: 'teacher-adjudicated', reviewerId, completedAt },
      expected: { errorFamily: V1_ERROR_FAMILIES[item.expected.misconception] ?? 'legacy', ...item.expected },
      prohibitedFragments: item.prohibitedFragments ?? [],
    })),
  };
}

function validTimestamp(value) {
  return boundedText(value, 100) && !Number.isNaN(Date.parse(value));
}

function validateExpected(expected, caseId) {
  if (!isRecord(expected) || !boundedText(expected.errorFamily, 100) || !boundedText(expected.misconception, 100) || !boundedText(expected.hintIntent, 100) ||
    !Array.isArray(expected.lines) || expected.lines.length > 20 || expected.lines.some((line) => !Number.isInteger(line) || line < 1 || line > 50_000)) {
    throw new Error(`Invalid Mentor benchmark expected labels: ${caseId}`);
  }
}

export function validateMentorCaseV2(item) {
  if (!isRecord(item) || !boundedText(item.id, 200) || !LANGUAGES.has(item.language) || !LEARNER_BANDS.has(item.learnerBand) || !isRecord(item.attempt) ||
    !boundedText(item.attempt.id, 200) || !boundedText(item.attempt.sourceCode, 50_000) || !/^[a-f0-9]{64}$/i.test(item.attempt.sourceHash ?? '') ||
    !isRecord(item.execution) || !boundedText(item.execution.verdict, 100) || !boundedStrings(item.execution.refs, 50) || item.execution.refs.length === 0) {
    throw new Error(`Invalid Mentor benchmark case: ${item?.id ?? 'unknown'}`);
  }
  if (stableHash(item.attempt.sourceCode) !== item.attempt.sourceHash) throw new Error(`Invalid Mentor source hash: ${item.id}`);
  if (!isRecord(item.provenance) || !ORIGINS.has(item.provenance.origin) || !boundedText(item.provenance.sourceUrl, 2_000) || !boundedText(item.provenance.license, 200)) {
    throw new Error(`Invalid Mentor provenance: ${item.id}`);
  }
  if (!isRecord(item.adjudication) || !ADJUDICATION_STATUSES.has(item.adjudication.status)) throw new Error(`Invalid Mentor adjudication: ${item.id}`);
  if (item.adjudication.status === 'teacher-adjudicated' && (!boundedText(item.adjudication.reviewerId, 200) || !validTimestamp(item.adjudication.completedAt))) {
    throw new Error(`Incomplete Mentor adjudication: ${item.id}`);
  }
  if (item.expected !== undefined) validateExpected(item.expected, item.id);
  if (item.adjudication.status === 'teacher-adjudicated' && item.expected === undefined) throw new Error(`Teacher-adjudicated case requires gold labels: ${item.id}`);
  if (!boundedStrings(item.prohibitedFragments ?? [], 20)) throw new Error(`Invalid Mentor prohibited fragments: ${item.id}`);
  return item;
}

function validateRequiredCoverage(value) {
  if (!isRecord(value) || !boundedStrings(value.languages, 20) || !boundedStrings(value.learnerBands, 20) || !boundedStrings(value.errorFamilies, 100) || !boundedStrings(value.verdicts, 100)) {
    throw new Error('Invalid Mentor release coverage');
  }
}

export function validateMentorBenchmarkV2(input) {
  if (!isRecord(input) || input.version !== 2 || !boundedText(input.name, 200) || !isRecord(input.thresholds) || !isRecord(input.releaseGate) || !Array.isArray(input.cases) || input.cases.length === 0 || input.cases.length > 10_000) {
    throw new Error('Invalid Mentor benchmark v2');
  }
  for (const metric of METRICS) {
    if (typeof input.thresholds[metric] !== 'number' || input.thresholds[metric] < 0 || input.thresholds[metric] > 1) throw new Error(`Invalid Mentor benchmark threshold: ${metric}`);
  }
  if (!Number.isInteger(input.releaseGate.minimumEligibleRealCases) || input.releaseGate.minimumEligibleRealCases < 1) throw new Error('Invalid Mentor real-case gate');
  validateRequiredCoverage(input.releaseGate.requiredCoverage);
  const ids = new Set();
  for (const item of input.cases) {
    validateMentorCaseV2(item);
    if (ids.has(item.id)) throw new Error(`Duplicate Mentor benchmark case: ${item.id}`);
    ids.add(item.id);
  }
  return input;
}

export function validateMentorProvenanceManifest(input) {
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.cases)) throw new Error('Invalid Mentor provenance manifest');
  const ids = new Set();
  for (const item of input.cases) {
    validateMentorCaseV2(item);
    if (ids.has(item.id)) throw new Error(`Duplicate Mentor provenance case: ${item.id}`);
    ids.add(item.id);
  }
  return input;
}

function validatePredictions(cases, predictions) {
  if (!Array.isArray(predictions) || predictions.length > cases.length) throw new Error('Mentor benchmark predictions must not exceed scored fixture count');
  const ids = new Set(cases.map((item) => item.id));
  const seen = new Set();
  for (const prediction of predictions) {
    if (!isRecord(prediction) || !ids.has(prediction.caseId) || seen.has(prediction.caseId) || !boundedText(prediction.misconception, 100) ||
      !Array.isArray(prediction.lines) || prediction.lines.length > 20 || prediction.lines.some((line) => !Number.isInteger(line) || line < 1) ||
      !boundedText(prediction.hintIntent, 100) || !boundedText(prediction.hint, 2_000) || !isRecord(prediction.conclusion) || !CONFIDENCE.has(prediction.conclusion.confidence) || !boundedStrings(prediction.conclusion.evidenceRefs, 50)) {
      throw new Error(`Invalid Mentor benchmark prediction: ${prediction?.caseId ?? 'unknown'}`);
    }
    seen.add(prediction.caseId);
  }
}

function overlaps(left, right) {
  return left.some((value) => right.includes(value));
}

function rate(numerator, denominator) {
  return Number((denominator === 0 ? 0 : numerator / denominator).toFixed(4));
}

function metricSummary(rows) {
  const count = rows.length;
  return {
    fixtureCount: count,
    metrics: {
      lineLocalizationAccuracy: rate(rows.filter((row) => row.lineCorrect).length, count),
      misconceptionAccuracy: rate(rows.filter((row) => row.misconceptionCorrect).length, count),
      evidenceSufficiency: rate(rows.filter((row) => row.evidenceSufficient).length, count),
      minimalHintEffectiveness: rate(rows.filter((row) => row.minimalHintEffective).length, count),
      answerLeakageRate: rate(rows.filter((row) => row.answerLeakage).length, count),
      falseConclusionRate: rate(rows.filter((row) => row.falseConclusion).length, count),
    },
  };
}

function slice(rows, field) {
  return Object.fromEntries([...new Set(rows.map((row) => row[field]))].sort().map((value) => {
    const group = rows.filter((row) => row[field] === value);
    return [value, { ...metricSummary(group), eligibleRealCaseCount: group.filter((row) => row.eligibleReal).length }];
  }));
}

function hasEligibleLicense(item) {
  return item.provenance.origin === 'first-party-observed' || APPROVED_PUBLIC_LICENSES.has(item.provenance.license.trim().toLocaleLowerCase('en-US'));
}

function isEligibleReal(item) {
  return item.provenance.origin !== 'synthetic-mutation' && item.adjudication.status === 'teacher-adjudicated' && hasEligibleLicense(item);
}

function coverageFailures(benchmark, eligibleRows) {
  const required = benchmark.releaseGate.requiredCoverage;
  const values = {
    languages: eligibleRows.map((row) => row.language),
    learnerBands: eligibleRows.map((row) => row.learnerBand),
    errorFamilies: eligibleRows.map((row) => row.errorFamily),
    verdicts: eligibleRows.map((row) => row.verdict),
  };
  return Object.entries(required).flatMap(([dimension, requiredValues]) => requiredValues
    .filter((value) => !values[dimension].includes(value))
    .map((value) => `${dimension}:${value}`));
}

export function evaluateMentorBenchmarkV2(rawBenchmark, predictions) {
  const benchmark = validateMentorBenchmarkV2(rawBenchmark);
  const scoredCases = benchmark.cases.filter((item) => item.adjudication.status === 'teacher-adjudicated' && item.expected !== undefined);
  validatePredictions(scoredCases, predictions);
  const predictionByCase = new Map(predictions.map((prediction) => [prediction.caseId, prediction]));
  const missingPredictionCaseIds = scoredCases.filter((fixture) => !predictionByCase.has(fixture.id)).map((fixture) => fixture.id);
  const rows = scoredCases.filter((fixture) => predictionByCase.has(fixture.id)).map((fixture) => {
    const prediction = predictionByCase.get(fixture.id);
    const evidenceSufficient = overlaps(fixture.execution.refs, prediction.conclusion.evidenceRefs);
    const misconceptionCorrect = prediction.misconception === fixture.expected.misconception;
    const lineCorrect = fixture.expected.lines.length === 0 ? prediction.lines.length === 0 : overlaps(fixture.expected.lines, prediction.lines);
    const answerLeakage = fixture.prohibitedFragments.some((fragment) => prediction.hint.toLocaleLowerCase('en-US').includes(fragment.toLocaleLowerCase('en-US')));
    const conclusionClaimsCause = prediction.conclusion.confidence !== 'low';
    return {
      caseId: fixture.id,
      language: fixture.language,
      learnerBand: fixture.learnerBand,
      errorFamily: fixture.expected.errorFamily,
      verdict: fixture.execution.verdict,
      licenseEligible: hasEligibleLicense(fixture),
      eligibleReal: isEligibleReal(fixture),
      lineCorrect,
      misconceptionCorrect,
      evidenceSufficient,
      minimalHintEffective: prediction.hintIntent === fixture.expected.hintIntent,
      answerLeakage,
      falseConclusion: conclusionClaimsCause && (!evidenceSufficient || !misconceptionCorrect),
    };
  });
  const summary = metricSummary(rows);
  const thresholdStatus = Object.fromEntries(METRICS.map((metric) => [metric, HIGHER_IS_BETTER.has(metric)
    ? summary.metrics[metric] >= benchmark.thresholds[metric]
    : summary.metrics[metric] <= benchmark.thresholds[metric]]));
  const eligibleRows = rows.filter((row) => row.eligibleReal);
  const eligibleRealCaseCount = eligibleRows.length;
  const failures = [
    ...METRICS.filter((metric) => !thresholdStatus[metric]).map((metric) => `metric:${metric}`),
    ...(eligibleRealCaseCount < benchmark.releaseGate.minimumEligibleRealCases ? [`eligible-real-cases: ${eligibleRealCaseCount}/${benchmark.releaseGate.minimumEligibleRealCases}`] : []),
    ...coverageFailures(benchmark, eligibleRows).map((failure) => `coverage:${failure}`),
    ...rows.filter((row) => !row.licenseEligible && benchmark.cases.find((item) => item.id === row.caseId)?.provenance.origin !== 'synthetic-mutation')
      .map((row) => `provenance:unapproved-license:${row.caseId}`),
    ...missingPredictionCaseIds.map((caseId) => `prediction:missing:${caseId}`),
  ];
  return {
    version: 2,
    benchmark: benchmark.name,
    ...summary,
    thresholds: benchmark.thresholds,
    thresholdStatus,
    eligibleRealCaseCount,
    teacherAdjudicatedCaseCount: scoredCases.length,
    missingPredictionCaseIds,
    segments: {
      language: slice(rows, 'language'),
      errorFamily: slice(rows, 'errorFamily'),
      learnerBand: slice(rows, 'learnerBand'),
      verdict: slice(rows, 'verdict'),
    },
    releaseGate: {
      minimumEligibleRealCases: benchmark.releaseGate.minimumEligibleRealCases,
      passed: failures.length === 0,
      failures,
    },
    rows,
  };
}

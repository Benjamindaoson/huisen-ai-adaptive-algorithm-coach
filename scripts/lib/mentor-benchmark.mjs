const METRICS = ['lineAccuracy', 'misconceptionAccuracy', 'unsupportedHighConfidenceRate', 'minimalHintUsefulness', 'answerLeakageRate'];
const LANGUAGES = new Set(['javascript', 'python', 'java', 'cpp']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedText(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function boundedStrings(value, maxItems = 20) {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => boundedText(item, 500));
}

export function validateMentorBenchmark(input) {
  if (!isRecord(input) || input.version !== 1 || !boundedText(input.name, 200) || !isRecord(input.thresholds) || !Array.isArray(input.cases) || input.cases.length === 0 || input.cases.length > 2_000) {
    throw new Error('Invalid Mentor benchmark');
  }
  for (const metric of METRICS) {
    if (typeof input.thresholds[metric] !== 'number' || input.thresholds[metric] < 0 || input.thresholds[metric] > 1) throw new Error(`Invalid Mentor benchmark threshold: ${metric}`);
  }
  const ids = new Set();
  for (const item of input.cases) {
    if (isRecord(item) && boundedText(item.id, 200) && ids.has(item.id)) throw new Error(`Duplicate Mentor benchmark case: ${item.id}`);
    if (!isRecord(item) || !boundedText(item.id, 200) || !LANGUAGES.has(item.language) || !boundedText(item.sourceCode, 50_000) ||
      !isRecord(item.evidence) || !boundedText(item.evidence.outcome, 100) || !boundedStrings(item.evidence.refs) ||
      !isRecord(item.expected) || !boundedText(item.expected.misconception, 100) || !boundedText(item.expected.hintIntent, 100) ||
      !Array.isArray(item.expected.lines) || item.expected.lines.length > 20 || item.expected.lines.some((line) => !Number.isInteger(line) || line < 1 || line > 50_000) ||
      !boundedStrings(item.prohibitedFragments ?? [], 20)) {
      throw new Error(`Invalid Mentor benchmark case: ${item?.id ?? 'unknown'}`);
    }
    ids.add(item.id);
  }
  return input;
}

function validatePredictions(cases, predictions) {
  if (!Array.isArray(predictions) || predictions.length !== cases.length) throw new Error('Mentor benchmark predictions must match fixture count');
  const caseIds = new Set(cases.map((item) => item.id));
  const seen = new Set();
  for (const prediction of predictions) {
    if (!isRecord(prediction) || !caseIds.has(prediction.caseId) || seen.has(prediction.caseId) || !boundedText(prediction.misconception, 100) ||
      !Array.isArray(prediction.lines) || prediction.lines.length > 20 || prediction.lines.some((line) => !Number.isInteger(line) || line < 1) ||
      !CONFIDENCE.has(prediction.confidence) || !boundedStrings(prediction.evidenceRefs) || !boundedText(prediction.hintIntent, 100) || !boundedText(prediction.hint, 2_000)) {
      throw new Error(`Invalid Mentor benchmark prediction: ${prediction?.caseId ?? 'unknown'}`);
    }
    seen.add(prediction.caseId);
  }
}

function overlaps(left, right) {
  return left.some((value) => right.includes(value));
}

function roundRate(value, total) {
  return Number((total === 0 ? 0 : value / total).toFixed(4));
}

export function evaluateMentorBenchmark(rawBenchmark, predictions) {
  const benchmark = validateMentorBenchmark(rawBenchmark);
  validatePredictions(benchmark.cases, predictions);
  const byCase = new Map(predictions.map((prediction) => [prediction.caseId, prediction]));
  const rows = benchmark.cases.map((fixture) => {
    const prediction = byCase.get(fixture.id);
    const lineCorrect = fixture.expected.lines.length === 0 ? prediction.lines.length === 0 : overlaps(fixture.expected.lines, prediction.lines);
    const misconceptionCorrect = prediction.misconception === fixture.expected.misconception;
    const unsupportedHighConfidence = prediction.confidence === 'high' && !overlaps(fixture.evidence.refs, prediction.evidenceRefs);
    const minimalHintUseful = prediction.hintIntent === fixture.expected.hintIntent;
    const normalizedHint = prediction.hint.toLocaleLowerCase('zh-Hans-CN');
    const answerLeakage = fixture.prohibitedFragments.some((fragment) => normalizedHint.includes(fragment.toLocaleLowerCase('zh-Hans-CN')));
    return { caseId: fixture.id, lineCorrect, misconceptionCorrect, unsupportedHighConfidence, minimalHintUseful, answerLeakage };
  });
  const count = rows.length;
  const metrics = {
    lineAccuracy: roundRate(rows.filter((row) => row.lineCorrect).length, count),
    misconceptionAccuracy: roundRate(rows.filter((row) => row.misconceptionCorrect).length, count),
    unsupportedHighConfidenceRate: roundRate(rows.filter((row) => row.unsupportedHighConfidence).length, count),
    minimalHintUsefulness: roundRate(rows.filter((row) => row.minimalHintUseful).length, count),
    answerLeakageRate: roundRate(rows.filter((row) => row.answerLeakage).length, count),
  };
  const thresholdStatus = {
    lineAccuracy: metrics.lineAccuracy >= benchmark.thresholds.lineAccuracy,
    misconceptionAccuracy: metrics.misconceptionAccuracy >= benchmark.thresholds.misconceptionAccuracy,
    unsupportedHighConfidenceRate: metrics.unsupportedHighConfidenceRate <= benchmark.thresholds.unsupportedHighConfidenceRate,
    minimalHintUsefulness: metrics.minimalHintUsefulness >= benchmark.thresholds.minimalHintUsefulness,
    answerLeakageRate: metrics.answerLeakageRate <= benchmark.thresholds.answerLeakageRate,
  };
  return { version: 1, benchmark: benchmark.name, fixtureCount: count, metrics, thresholds: benchmark.thresholds, thresholdStatus, rows };
}

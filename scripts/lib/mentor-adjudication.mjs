const LANGUAGES = new Set(['javascript', 'python', 'java', 'cpp']);
const LEARNER_BANDS = new Set(['beginner', 'intermediate', 'advanced']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const ID = /^[a-zA-Z0-9._:-]{1,200}$/;
const HASH = /^[a-f0-9]{64}$/i;

function record(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value, max = 2_000) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function strings(value, maxItems = 50) {
  return Array.isArray(value) && value.length > 0 && value.length <= maxItems && value.every((item) => text(item, 500));
}

function validateExpected(expected, caseId) {
  if (!record(expected) || !text(expected.errorFamily, 100) || !text(expected.misconception, 100) || !text(expected.hintIntent, 100) ||
    !Array.isArray(expected.lines) || expected.lines.length > 20 || expected.lines.some((line) => !Number.isInteger(line) || line < 1 || line > 50_000)) {
    throw new Error(`Invalid teacher gold labels: ${caseId}`);
  }
}

export function validateTeacherAdjudicationManifest(input) {
  if (!record(input) || input.version !== 1 || !Array.isArray(input.records) || input.records.length > 10_000) throw new Error('Invalid teacher adjudication manifest');
  const ids = new Set();
  for (const item of input.records) {
    if (!record(item) || !ID.test(item.caseId ?? '') || !HASH.test(item.sourceHash ?? '') || !record(item.reviewer) || !ID.test(item.reviewer.id ?? '') ||
      item.reviewer.role !== 'teacher' || item.reviewer.attested !== true) throw new Error(`Teacher role attestation required: ${item?.caseId ?? 'unknown'}`);
    if (ids.has(item.caseId)) throw new Error(`Duplicate teacher adjudication: ${item.caseId}`);
    ids.add(item.caseId);
    if (Number.isNaN(Date.parse(item.completedAt)) || !LEARNER_BANDS.has(item.learnerBand)) throw new Error(`Invalid teacher adjudication metadata: ${item.caseId}`);
    if (!strings(item.reviewedEvidenceRefs)) throw new Error(`Reviewed evidence required: ${item.caseId}`);
    validateExpected(item.expected, item.caseId);
    if (!Array.isArray(item.prohibitedFragments) || item.prohibitedFragments.length > 20 || item.prohibitedFragments.some((fragment) => !text(fragment, 500))) {
      throw new Error(`Invalid prohibited fragments: ${item.caseId}`);
    }
  }
  return input;
}

export function applyTeacherAdjudications(rawManifest, rawAdjudications) {
  const adjudications = validateTeacherAdjudicationManifest(rawAdjudications);
  if (!record(rawManifest) || rawManifest.version !== 1 || !Array.isArray(rawManifest.cases)) throw new Error('Invalid Mentor provenance manifest');
  const cases = structuredClone(rawManifest.cases);
  const byId = new Map(cases.map((item) => [item.id, item]));
  for (const item of adjudications.records) {
    const target = byId.get(item.caseId);
    if (!target) throw new Error(`Unknown Mentor case: ${item.caseId}`);
    if (target.attempt?.sourceHash !== item.sourceHash) throw new Error(`Teacher adjudication source hash mismatch: ${item.caseId}`);
    if (target.adjudication?.status !== 'pending') throw new Error(`Mentor case is not pending: ${item.caseId}`);
    const evidence = new Set(target.execution?.refs ?? []);
    if (!item.reviewedEvidenceRefs.some((ref) => evidence.has(ref))) throw new Error(`Teacher adjudication evidence is not bound to the case: ${item.caseId}`);
    target.learnerBand = item.learnerBand;
    target.adjudication = { status: 'teacher-adjudicated', reviewerId: item.reviewer.id, completedAt: item.completedAt };
    target.expected = structuredClone(item.expected);
    target.prohibitedFragments = [...item.prohibitedFragments];
  }
  return { version: 1, cases };
}

function hasDiagnosticEvidence(item) {
  return (item.execution?.refs ?? []).some((ref) => /^(judge:|compiler:|runtime:|failed-case:|test:|problem:)/i.test(ref));
}

export function buildTeacherReviewQueue(manifest, requiredCoverage) {
  if (!record(manifest) || manifest.version !== 1 || !Array.isArray(manifest.cases)) throw new Error('Invalid Mentor provenance manifest');
  const pending = manifest.cases.filter((item) => item.adjudication?.status === 'pending');
  const values = (field) => new Set(pending.map((item) => item[field]));
  return {
    version: 1,
    generatedFrom: 'mentor-provenance-v1',
    items: pending.map((item) => ({
      caseId: item.id,
      sourceHash: item.attempt.sourceHash,
      language: item.language,
      learnerBand: item.learnerBand,
      verdict: item.execution.verdict,
      evidenceRefs: [...item.execution.refs],
      readiness: hasDiagnosticEvidence(item) ? 'ready' : 'evidence-incomplete',
      missingEvidence: hasDiagnosticEvidence(item) ? [] : ['problem-or-failed-case-evidence'],
    })),
    coverage: {
      missingLanguages: (requiredCoverage.languages ?? []).filter((value) => !values('language').has(value)),
      missingLearnerBands: (requiredCoverage.learnerBands ?? []).filter((value) => !values('learnerBand').has(value)),
      missingVerdicts: (requiredCoverage.verdicts ?? []).filter((value) => !new Set(pending.map((item) => item.execution.verdict)).has(value)),
    },
  };
}

function validatePrediction(item, allowedCaseIds) {
  if (!record(item) || !allowedCaseIds.has(item.caseId) || !text(item.misconception, 100) || !Array.isArray(item.lines) || item.lines.length > 20 ||
    item.lines.some((line) => !Number.isInteger(line) || line < 1) || !text(item.hintIntent, 100) || !text(item.hint, 2_000) ||
    !record(item.conclusion) || !CONFIDENCE.has(item.conclusion.confidence) || !Array.isArray(item.conclusion.evidenceRefs)) {
    throw new Error(`Unknown case or invalid Mentor prediction: ${item?.caseId ?? 'unknown'}`);
  }
}

export function mergeMentorPredictions(basePredictions, addedPredictions, allowedCaseIds) {
  if (!Array.isArray(basePredictions) || !Array.isArray(addedPredictions) || !(allowedCaseIds instanceof Set)) throw new Error('Invalid Mentor prediction manifests');
  const merged = [...basePredictions, ...addedPredictions];
  const seen = new Set();
  for (const item of merged) {
    validatePrediction(item, allowedCaseIds);
    if (seen.has(item.caseId)) throw new Error(`Duplicate Mentor prediction: ${item.caseId}`);
    seen.add(item.caseId);
  }
  return structuredClone(merged);
}

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type QualityEvidenceEnvelope = {
  attempt: { id: string; sourceHash: string; createdAt: string; sourceCode?: string };
  run: { outcome: string; evidenceRefs: string[]; stderr?: string };
  toolCalls: Array<{ name: string; argumentsHash: string; resultHash: string }>;
  currentEditor: { sourceHash: string };
  diff: { stale: boolean; summary: string; hunks: string[] };
};

export type QualityCandidate = { hash: string; mentorVersion: string; text: string; evidenceRefs: string[] };
export type QualityComparison = {
  id: string;
  datasetVersion: string;
  caseId: string;
  evidence: QualityEvidenceEnvelope;
  candidates: [QualityCandidate, QualityCandidate];
};

export type QualityRubric = { localization: boolean; cause: boolean; evidence: boolean; minimalHint: boolean; leakage: boolean };
export type TeacherQualityReview = {
  id: string;
  comparisonId: string;
  reviewerId: string;
  preferredHash: string;
  rubric: QualityRubric;
  evidenceRefs: string[];
  notes: string;
  reviewedAt: string;
  datasetVersion: string;
  caseId: string;
  attemptId: string;
  candidateHashes: [string, string];
};

export type ModelQualityJudgment = {
  id: string;
  comparisonId: string;
  modelId: string;
  preferredHash: string;
  humanPreferredHash?: string;
  heldOut: boolean;
  judgedAt: string;
};

type StoredQualityReview = Omit<TeacherQualityReview, 'datasetVersion' | 'caseId' | 'attemptId' | 'candidateHashes'>;
type StoreFile = {
  version: 1;
  comparisons: QualityComparison[];
  teacherReviews: TeacherQualityReview[];
  modelJudgments: ModelQualityJudgment[];
};

export type QualityReviewStore = {
  mode: 'memory' | 'file-local';
  putComparison(comparison: QualityComparison): Promise<QualityComparison>;
  listComparisons(): Promise<QualityComparison[]>;
  listTeacherReviews(): Promise<TeacherQualityReview[]>;
  submitTeacherReview(review: StoredQualityReview): Promise<TeacherQualityReview>;
  submitModelJudgment(judgment: ModelQualityJudgment): Promise<ModelQualityJudgment>;
  listAdjudicationQueue(): Promise<Array<{ comparisonId: string; reviewerIds: string[]; candidateHashes: [string, string] }>>;
  getCalibration(modelId: string, minimumCases?: number, minimumAgreement?: number): Promise<{ modelId: string; heldOutCases: number; agreement: number; authoritative: boolean }>;
  listCalibrations(minimumCases?: number, minimumAgreement?: number): Promise<Array<{ modelId: string; heldOutCases: number; agreement: number; authoritative: boolean }>>;
};

const ID = /^[a-zA-Z0-9._:-]{1,200}$/;
const HASH = /^[a-f0-9]{64}$/i;

function emptyState(): StoreFile {
  return { version: 1, comparisons: [], teacherReviews: [], modelJudgments: [] };
}

function validText(value: unknown, max = 2_000): value is string {
  return typeof value === 'string' && value.length <= max;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateStrings(value: unknown, maxItems = 50): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => !validText(item, 500))) throw new Error('Invalid quality evidence references');
}

export function validateQualityComparison(value: unknown): QualityComparison {
  const item = value as QualityComparison;
  if (!item || typeof item !== 'object' || !ID.test(item.id ?? '') || !ID.test(item.caseId ?? '') || !validText(item.datasetVersion, 200) ||
    !item.evidence || !ID.test(item.evidence.attempt?.id ?? '') || !HASH.test(item.evidence.attempt?.sourceHash ?? '') || !validTimestamp(item.evidence.attempt?.createdAt) ||
    !validText(item.evidence.attempt.sourceCode ?? '', 50_000) || !validText(item.evidence.run?.outcome, 100) || !HASH.test(item.evidence.currentEditor?.sourceHash ?? '') ||
    typeof item.evidence.diff?.stale !== 'boolean' || !validText(item.evidence.diff?.summary, 500) || !Array.isArray(item.candidates) || item.candidates.length !== 2) {
    throw new Error('Invalid quality comparison');
  }
  validateStrings(item.evidence.run.evidenceRefs);
  validateStrings(item.evidence.diff.hunks, 20);
  if (!Array.isArray(item.evidence.toolCalls) || item.evidence.toolCalls.length > 50 || item.evidence.toolCalls.some((tool) => !ID.test(tool.name) || !HASH.test(tool.argumentsHash) || !HASH.test(tool.resultHash))) {
    throw new Error('Invalid quality tool evidence');
  }
  for (const candidate of item.candidates) {
    if (!HASH.test(candidate.hash) || !validText(candidate.mentorVersion, 200) || !validText(candidate.text, 10_000)) throw new Error('Invalid quality candidate');
    validateStrings(candidate.evidenceRefs);
  }
  if (item.candidates[0].hash === item.candidates[1].hash) throw new Error('Invalid duplicate quality candidates');
  return structuredClone(item);
}

function safeState(value: unknown): StoreFile {
  const raw = value as Partial<StoreFile> | null;
  if (!raw || raw.version !== 1 || !Array.isArray(raw.comparisons) || !Array.isArray(raw.teacherReviews) || !Array.isArray(raw.modelJudgments)) return emptyState();
  try {
    return {
      version: 1,
      comparisons: raw.comparisons.map(validateQualityComparison),
      teacherReviews: structuredClone(raw.teacherReviews),
      modelJudgments: structuredClone(raw.modelJudgments),
    };
  } catch { return emptyState(); }
}

function completeTeacherReview(comparison: QualityComparison, input: StoredQualityReview): TeacherQualityReview {
  if (!ID.test(input.id) || !ID.test(input.reviewerId) || input.comparisonId !== comparison.id || !validTimestamp(input.reviewedAt) || !validText(input.notes, 2_000)) {
    throw new Error('Invalid teacher quality review');
  }
  const candidateHashes = comparison.candidates.map((candidate) => candidate.hash) as [string, string];
  if (!candidateHashes.includes(input.preferredHash)) throw new Error('Invalid preferred quality candidate');
  const rubric = input.rubric;
  if (!rubric || ['localization', 'cause', 'evidence', 'minimalHint', 'leakage'].some((key) => typeof rubric[key as keyof QualityRubric] !== 'boolean')) {
    throw new Error('Invalid teacher quality rubric');
  }
  validateStrings(input.evidenceRefs);
  if (input.evidenceRefs.length === 0) throw new Error('Invalid teacher quality evidence');
  return { ...structuredClone(input), datasetVersion: comparison.datasetVersion, caseId: comparison.caseId, attemptId: comparison.evidence.attempt.id, candidateHashes };
}

function calibrationFor(state: StoreFile, modelId: string, minimumCases = 20, minimumAgreement = 0.8) {
  const heldOut = state.modelJudgments.filter((item) => item.modelId === modelId && item.heldOut && item.humanPreferredHash);
  const agreement = heldOut.length ? Number((heldOut.filter((item) => item.preferredHash === item.humanPreferredHash).length / heldOut.length).toFixed(4)) : 0;
  return { modelId, heldOutCases: heldOut.length, agreement, authoritative: heldOut.length >= minimumCases && agreement >= minimumAgreement };
}

export function createQualityReviewStore(options: { filePath?: string } = {}): QualityReviewStore {
  let state = emptyState();
  let loaded: Promise<void> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  function ensureLoaded(): Promise<void> {
    loaded ??= (async () => {
      if (!options.filePath) return;
      try { state = safeState(JSON.parse(await readFile(options.filePath, 'utf8'))); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    })();
    return loaded;
  }

  async function persist(): Promise<void> {
    if (!options.filePath) return;
    await mkdir(dirname(options.filePath), { recursive: true });
    const temporary = `${options.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    try { await rename(temporary, options.filePath); }
    catch (error) {
      if (!['EEXIST', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
      await rm(options.filePath, { force: true });
      await rename(temporary, options.filePath);
    }
  }

  function mutate<T>(operation: () => T): Promise<T> {
    const run = queue.catch(() => undefined).then(async () => { await ensureLoaded(); const result = operation(); await persist(); return result; });
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function read<T>(operation: () => T): Promise<T> {
    await ensureLoaded(); await queue.catch(() => undefined); return operation();
  }

  return {
    mode: options.filePath ? 'file-local' : 'memory',
    putComparison: (raw) => mutate(() => {
      const comparison = validateQualityComparison(raw);
      const existing = state.comparisons.find((item) => item.id === comparison.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(comparison)) throw new Error('Invalid quality comparison replay');
      if (!existing) state.comparisons.push(comparison);
      return structuredClone(existing ?? comparison);
    }),
    listComparisons: () => read(() => structuredClone(state.comparisons)),
    listTeacherReviews: () => read(() => structuredClone(state.teacherReviews)),
    submitTeacherReview: (input) => mutate(() => {
      const comparison = state.comparisons.find((item) => item.id === input.comparisonId);
      if (!comparison) throw new Error('Invalid quality comparison reference');
      const review = completeTeacherReview(comparison, input);
      const existing = state.teacherReviews.find((item) => item.id === review.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(review)) throw new Error('Invalid quality review replay');
      if (!existing) state.teacherReviews.push(review);
      return structuredClone(existing ?? review);
    }),
    submitModelJudgment: (input) => mutate(() => {
      const comparison = state.comparisons.find((item) => item.id === input.comparisonId);
      if (!comparison || !ID.test(input.id) || !ID.test(input.modelId) || !comparison.candidates.some((candidate) => candidate.hash === input.preferredHash) ||
        (input.humanPreferredHash !== undefined && !comparison.candidates.some((candidate) => candidate.hash === input.humanPreferredHash)) || typeof input.heldOut !== 'boolean' || !validTimestamp(input.judgedAt)) {
        throw new Error('Invalid model quality judgment');
      }
      const existing = state.modelJudgments.find((item) => item.id === input.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(input)) throw new Error('Invalid model judgment replay');
      if (!existing) state.modelJudgments.push(structuredClone(input));
      return structuredClone(existing ?? input);
    }),
    listAdjudicationQueue: () => read(() => {
      const grouped = new Map<string, TeacherQualityReview[]>();
      for (const review of state.teacherReviews) grouped.set(review.comparisonId, [...(grouped.get(review.comparisonId) ?? []), review]);
      return [...grouped.entries()].flatMap(([comparisonId, reviews]) => {
        const reviewerIds = [...new Set(reviews.map((review) => review.reviewerId))].sort();
        if (reviewerIds.length < 2 || new Set(reviews.map((review) => review.preferredHash)).size < 2) return [];
        return [{ comparisonId, reviewerIds, candidateHashes: reviews[0].candidateHashes }];
      });
    }),
    getCalibration: (modelId, minimumCases = 20, minimumAgreement = 0.8) => read(() => calibrationFor(state, modelId, minimumCases, minimumAgreement)),
    listCalibrations: (minimumCases = 20, minimumAgreement = 0.8) => read(() => [...new Set(state.modelJudgments.map((item) => item.modelId))]
      .sort().map((modelId) => calibrationFor(state, modelId, minimumCases, minimumAgreement))),
  };
}

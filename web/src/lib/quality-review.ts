export type EvidenceEnvelope = {
  attempt: { id: string; sourceHash: string; sourceCode?: string; createdAt: string };
  run: { outcome: string; stderr?: string; evidenceRefs?: string[]; failedCase?: { input: string; expected: string; actual: string } };
  toolCalls: Array<{ name: string; argumentsHash: string; resultHash: string }>;
  conclusions?: Array<{ label: string; confidence: 'low' | 'medium' | 'high'; evidenceRefs: string[] }>;
  currentEditor: { sourceHash: string; sourceCode?: string };
  diff: { stale: boolean; summary: string; hunks: string[] };
};

export type QualityCandidate = { hash: string; mentorVersion: string; text: string; evidenceRefs: string[] };
export type QualityComparison = {
  id: string;
  datasetVersion: string;
  caseId: string;
  evidence: EvidenceEnvelope;
  candidates: [QualityCandidate, QualityCandidate];
};

export type BlindComparison = Omit<QualityComparison, 'candidates'> & {
  candidates: Array<{ blindId: 'A' | 'B'; hash: string; text: string; evidenceRefs: string[] }>;
};

export type TeacherRubric = { localization: boolean; cause: boolean; evidence: boolean; minimalHint: boolean; leakage: boolean };
export type TeacherReviewInput = { reviewerId: string; preferredHash: string; rubric: TeacherRubric; notes: string; reviewedAt: string };
export type TeacherReview = TeacherReviewInput & {
  id?: string;
  evidenceRefs?: string[];
  comparisonId: string;
  caseId: string;
  datasetVersion: string;
  attemptId: string;
  candidateHashes: [string, string];
};

export type QualityReviewState = { version: 1; teacherReviews: TeacherReview[] };
export const QUALITY_REVIEW_STORAGE_KEY = 'od-quality-review-v1';

export const QUALITY_DEMO_COMPARISON: QualityComparison = {
  id: 'synthetic-preview-hardcoded-output', datasetVersion: 'mentor-v2-preview', caseId: 'synthetic-preview-1',
  evidence: {
    attempt: { id: 'attempt-preview-1', sourceHash: 'sha256:submitted-preview', sourceCode: 'print(1)', createdAt: '2026-08-12T00:00:00.000Z' },
    run: { outcome: 'wrong-answer', stderr: '', failedCase: { input: '2\n', expected: '2\n', actual: '1\n' } },
    toolCalls: [{ name: 'run-sample', argumentsHash: 'sha256:preview-args', resultHash: 'sha256:preview-result' }],
    conclusions: [{ label: 'hardcoded-output', confidence: 'high', evidenceRefs: ['run.failedCase.actual', 'attempt.sourceCode'] }],
    currentEditor: { sourceHash: 'sha256:current-preview', sourceCode: 'print(input())' },
    diff: { stale: true, summary: '提交后修改了 1 行', hunks: ['- print(1)', '+ print(input())'] },
  },
  candidates: [
    { hash: 'sha256:preview-a', mentorVersion: 'evidence-mentor', text: '先别改代码。输入是 2 时，预测这行程序会输出什么？再对照实际结果 1，找出程序中哪个值没有随输入变化。', evidenceRefs: ['run.failedCase.actual', 'attempt.sourceCode'] },
    { hash: 'sha256:preview-b', mentorVersion: 'direct-answer-model', text: '你把输出写死了，改成 print(input()) 就能通过。', evidenceRefs: [] },
  ],
};

function stableFlip(value: string): boolean {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2 === 1;
}

export function createBlindComparison(comparison: QualityComparison, reviewSlotId: string): BlindComparison {
  const ordered = stableFlip(`${comparison.id}:${reviewSlotId}`) ? [...comparison.candidates].reverse() : [...comparison.candidates];
  return {
    id: comparison.id,
    datasetVersion: comparison.datasetVersion,
    caseId: comparison.caseId,
    evidence: comparison.evidence,
    candidates: ordered.map((candidate, index) => ({
      blindId: (index === 0 ? 'A' : 'B') as 'A' | 'B',
      hash: candidate.hash,
      text: candidate.text,
      evidenceRefs: candidate.evidenceRefs,
    })),
  };
}

export function submitTeacherReview(comparison: QualityComparison, input: TeacherReviewInput): TeacherReview {
  if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(input.reviewerId) || Number.isNaN(Date.parse(input.reviewedAt))) throw new Error('Invalid reviewer identity or timestamp');
  const candidateHashes = comparison.candidates.map((candidate) => candidate.hash) as [string, string];
  if (!candidateHashes.includes(input.preferredHash)) throw new Error('Preferred candidate is not part of this comparison');
  const rubricKeys: Array<keyof TeacherRubric> = ['localization', 'cause', 'evidence', 'minimalHint', 'leakage'];
  if (rubricKeys.some((key) => typeof input.rubric[key] !== 'boolean') || input.notes.length > 2000) throw new Error('Incomplete teacher rubric');
  return {
    ...input,
    comparisonId: comparison.id,
    caseId: comparison.caseId,
    datasetVersion: comparison.datasetVersion,
    attemptId: comparison.evidence.attempt.id,
    candidateHashes,
  };
}

export function buildAdjudicationQueue(reviews: TeacherReview[]): Array<{ comparisonId: string; reviewerIds: string[]; candidateHashes: [string, string] }> {
  const grouped = new Map<string, TeacherReview[]>();
  for (const review of reviews) grouped.set(review.comparisonId, [...(grouped.get(review.comparisonId) ?? []), review]);
  return [...grouped.entries()].flatMap(([comparisonId, group]) => {
    const uniqueReviewers = new Set(group.map((review) => review.reviewerId));
    const preferences = new Set(group.map((review) => review.preferredHash));
    if (uniqueReviewers.size < 2 || preferences.size < 2) return [];
    return [{
      comparisonId,
      reviewerIds: [...uniqueReviewers].sort(),
      candidateHashes: group[0].candidateHashes,
    }];
  });
}

export function calibrateModelJudge(pairs: Array<{ humanHash: string; modelHash: string }>, minimumCases = 20, minimumAgreement = 0.8): {
  cases: number;
  agreement: number;
  authoritative: boolean;
  reason: string;
} {
  const matches = pairs.filter((pair) => pair.humanHash === pair.modelHash).length;
  const agreement = pairs.length ? matches / pairs.length : 0;
  const enoughCases = pairs.length >= minimumCases;
  const enoughAgreement = agreement >= minimumAgreement;
  return {
    cases: pairs.length,
    agreement,
    authoritative: enoughCases && enoughAgreement,
    reason: !enoughCases ? `至少需要 ${minimumCases} 个教师留出样本` : !enoughAgreement ? `一致率必须达到 ${Math.round(minimumAgreement * 100)}%` : '模型评审已通过校准，可作为回归门禁输入，但仍不能覆盖教师裁决。',
  };
}

export function loadQualityReviewState(storage: Pick<Storage, 'getItem'>): QualityReviewState {
  try {
    return parseQualityReviewState(JSON.parse(storage.getItem(QUALITY_REVIEW_STORAGE_KEY) ?? 'null'));
  } catch {
    return { version: 1, teacherReviews: [] };
  }
}

export function parseQualityReviewState(value: unknown): QualityReviewState {
  const parsed = value as QualityReviewState | null;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.teacherReviews)) throw new Error('Invalid quality review state');
  for (const review of parsed.teacherReviews) {
    if (!review || typeof review !== 'object' || !review.comparisonId || !review.reviewerId || !review.preferredHash || !Array.isArray(review.candidateHashes)) throw new Error('Invalid quality review state');
  }
  return parsed;
}

export function saveQualityReviewState(storage: Pick<Storage, 'setItem'>, state: QualityReviewState): void {
  storage.setItem(QUALITY_REVIEW_STORAGE_KEY, JSON.stringify(state));
}

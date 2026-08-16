import { OD_SKILLS, type SkillId } from './skills';

export type ContentTrust = 'candidate' | 'auto-validated' | 'human-verified';
export type GeneratedContentKind = 'analogy' | 'counterexample' | 'test' | 'transfer-problem';
export type GeneratedTest = { input: string; expectedOutput: string };
export type HumanReview = {
  reviewerId: string;
  decision: 'approve' | 'reject';
  reviewedAt: string;
  contentHash?: string;
};

export type GeneratedContentCandidate = {
  id: string;
  version: number;
  kind: GeneratedContentKind;
  title: string;
  body: string;
  generator: { provider: string; model: string; promptHash: string };
  contentHash: string;
  sourceEvidence: string[];
  targetSkillIds: SkillId[];
  language: 'java' | 'python' | 'javascript' | 'cpp';
  trust: ContentTrust;
  constraints: { timeLimitMs: number; memoryLimitMb: number };
  solution: string;
  tests: GeneratedTest[];
  answerLeakage: boolean;
  validationEvidence?: ValidationEvidence[];
  review?: HumanReview & { contentHash: string };
};

export type ValidationEvidence = { check: 'schema' | 'skill-reference' | 'constraints' | 'solution-execution' | 'test-consistency' | 'answer-leakage' | 'duplicate'; passed: boolean; detail: string };
export type ExecutionResult = { passed: boolean; output: string; durationMs: number };
export type ContentRunner = (solution: string, test: GeneratedTest, constraints: GeneratedContentCandidate['constraints']) => Promise<ExecutionResult>;

type ValidatedContent = GeneratedContentCandidate & { validatedSnapshot: string };

function hashText(value: string): string {
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `fnv128:${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}${value.length.toString(16).padStart(8, '0')}`;
}

function canonicalPayload(content: Omit<GeneratedContentCandidate, 'contentHash'> | GeneratedContentCandidate): string {
  return JSON.stringify({ id: content.id, version: content.version, kind: content.kind, title: content.title.trim(), body: content.body.trim(), generator: content.generator, sourceEvidence: content.sourceEvidence, targetSkillIds: content.targetSkillIds, language: content.language, constraints: content.constraints, solution: content.solution, tests: content.tests, answerLeakage: content.answerLeakage });
}

export function computeGeneratedContentHash(content: Omit<GeneratedContentCandidate, 'contentHash'> | GeneratedContentCandidate): string {
  return hashText(canonicalPayload(content));
}

function canonicalSnapshot(content: GeneratedContentCandidate): string {
  return JSON.stringify({ contentHash: content.contentHash, canonical: canonicalPayload(content) });
}

function normalizedText(content: Pick<GeneratedContentCandidate, 'title' | 'body'>): string {
  return `${content.title}\n${content.body}`.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function isNearDuplicate(left: GeneratedContentCandidate, right: GeneratedContentCandidate): boolean {
  const a = normalizedText(left);
  const b = normalizedText(right);
  if (a === b) return true;
  const grams = (text: string) => new Set(Array.from({ length: Math.max(0, text.length - 2) }, (_, index) => text.slice(index, index + 3)));
  const ga = grams(a);
  const gb = grams(b);
  if (!ga.size || !gb.size) return false;
  const intersection = [...ga].filter((gram) => gb.has(gram)).length;
  return intersection / Math.min(ga.size, gb.size) >= 0.85;
}

export async function validateGeneratedContent(content: GeneratedContentCandidate, run: ContentRunner, existing: readonly GeneratedContentCandidate[] = []): Promise<{
  content: GeneratedContentCandidate;
  publishable: boolean;
  evidence: ValidationEvidence[];
}> {
  const knownSkills = new Set(OD_SKILLS.map((skill) => skill.id));
  const evidence: ValidationEvidence[] = [
    { check: 'schema', passed: Boolean(content.id && content.version > 0 && content.title.trim() && content.body.trim() && content.generator.promptHash && content.contentHash === computeGeneratedContentHash(content) && content.sourceEvidence.length && ['java', 'python', 'javascript', 'cpp'].includes(content.language)), detail: 'Required provenance fields and canonical content hash.' },
    { check: 'skill-reference', passed: content.targetSkillIds.length > 0 && content.targetSkillIds.every((skill) => knownSkills.has(skill)), detail: 'Target skills exist in the reviewed taxonomy.' },
    { check: 'constraints', passed: Number.isFinite(content.constraints.timeLimitMs) && content.constraints.timeLimitMs > 0 && content.constraints.timeLimitMs <= 10_000 && Number.isFinite(content.constraints.memoryLimitMb) && content.constraints.memoryLimitMb > 0 && content.constraints.memoryLimitMb <= 1024, detail: 'Execution resources are finite and bounded.' },
    { check: 'answer-leakage', passed: content.answerLeakage === false, detail: 'Learner-facing content does not expose the reference solution.' },
    { check: 'duplicate', passed: !existing.some((item) => item.id !== content.id && isNearDuplicate(item, content)), detail: 'No exact or high-similarity duplicate exists in the supplied trusted corpus.' },
  ];

  let executionsPassed = content.tests.length > 0 && content.solution.trim().length > 0;
  let testsConsistent = content.tests.length > 0;
  for (const test of content.tests) {
    try {
      const result = await run(content.solution, test, content.constraints);
      const expected = test.expectedOutput.replace(/\r\n/g, '\n').trimEnd();
      const actual = result.output.replace(/\r\n/g, '\n').trimEnd();
      executionsPassed &&= result.passed && result.durationMs <= content.constraints.timeLimitMs;
      testsConsistent &&= result.passed && actual === expected;
    } catch {
      executionsPassed = false;
      testsConsistent = false;
    }
  }
  evidence.push({ check: 'solution-execution', passed: executionsPassed, detail: executionsPassed ? 'Reviewed solution executed within bounds.' : 'Reviewed solution failed or exceeded bounds.' });
  evidence.push({ check: 'test-consistency', passed: testsConsistent, detail: testsConsistent ? 'All observed outputs match expected outputs.' : 'At least one output contradicts its test.' });
  const passed = evidence.every((item) => item.passed);
  const next = { ...content, trust: passed ? 'auto-validated' as const : 'candidate' as const, validationEvidence: evidence, ...(passed ? { validatedSnapshot: canonicalSnapshot(content) } : {}) };
  return { content: next, publishable: false, evidence };
}

export function promoteContent(content: GeneratedContentCandidate, review: HumanReview): GeneratedContentCandidate {
  if (content.trust !== 'auto-validated') throw new Error('Content must pass automated validation before human review');
  if (!('validatedSnapshot' in content) || (content as ValidatedContent).validatedSnapshot !== canonicalSnapshot(content)) throw new Error('Content changed after automated validation');
  if (!review.reviewerId.trim() || review.decision !== 'approve' || Number.isNaN(Date.parse(review.reviewedAt))) throw new Error('Invalid approving review');
  return { ...content, trust: 'human-verified', review: { ...review, contentHash: content.contentHash } };
}

export function isEligibleForTrustedLearning(content: GeneratedContentCandidate): boolean {
  return content.trust === 'human-verified' && content.review?.decision === 'approve' && content.review.contentHash === computeGeneratedContentHash(content);
}

export type ExpansionEvidence = { realAdjudicatedCases: number; transferLift: number; delayedRetention: number; humanVerifiedContent: number };
const EXPANSION_THRESHOLDS: ExpansionEvidence = { realAdjudicatedCases: 100, transferLift: 0.1, delayedRetention: 0.6, humanVerifiedContent: 20 };

export function evaluateExpansionGate(evidence: ExpansionEvidence): {
  open: boolean;
  missing: Array<{ metric: keyof ExpansionEvidence; actual: number; required: number }>;
} {
  const metrics = Object.keys(EXPANSION_THRESHOLDS) as Array<keyof ExpansionEvidence>;
  const missing = metrics.filter((metric) => !Number.isFinite(evidence[metric]) || evidence[metric] < EXPANSION_THRESHOLDS[metric])
    .map((metric) => ({ metric, actual: evidence[metric], required: EXPANSION_THRESHOLDS[metric] }));
  return { open: missing.length === 0, missing };
}

import type { LearningEvent } from './learner-memory';
import type { PedagogicalEvent } from './pedagogical-events';

export type EvidenceStatus = 'not-collected' | 'insufficient' | 'measurable';
export type EvidenceMetric = {
  numerator: number;
  denominator: number;
  rate?: number;
  minimum: number;
  status: EvidenceStatus;
  evidenceRefs: string[];
  nextEligibleAt?: string;
};

export type LearningEffectEvidence = {
  generatedAt: string;
  teacherAdjudication: EvidenceMetric;
  independentTransfer: EvidenceMetric;
  sevenDayRetraining: EvidenceMetric;
  canClaimLearningEffect: boolean;
};

type Input = {
  teacherEvidence: { eligibleCount: number; minimum: number; caseRefs: string[] };
  learningEvents: readonly LearningEvent[];
  pedagogicalEvents: readonly PedagogicalEvent[];
  now: Date;
  transferMinimum?: number;
  sevenDayMinimum?: number;
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function status(sampleSize: number, minimum: number): EvidenceStatus {
  return sampleSize === 0 ? 'not-collected' : sampleSize < minimum ? 'insufficient' : 'measurable';
}

function metric(numerator: number, denominator: number, minimum: number, evidenceRefs: string[], nextEligibleAt?: string): EvidenceMetric {
  return {
    numerator,
    denominator,
    ...(denominator > 0 ? { rate: numerator / denominator } : {}),
    minimum,
    status: status(denominator, minimum),
    evidenceRefs: [...new Set(evidenceRefs)],
    ...(nextEligibleAt ? { nextEligibleAt } : {}),
  };
}

export function buildLearningEffectEvidence(input: Input): LearningEffectEvidence {
  const teacherMinimum = Math.max(1, input.teacherEvidence.minimum);
  const teacher = metric(
    Math.max(0, input.teacherEvidence.eligibleCount),
    Math.max(0, input.teacherEvidence.eligibleCount),
    teacherMinimum,
    input.teacherEvidence.caseRefs,
  );

  const transferMinimum = input.transferMinimum ?? 10;
  const starts = input.learningEvents.filter((event) => event.kind === 'lesson-transfer-started');
  const transferRefs: string[] = [];
  let transferPasses = 0;
  for (const start of starts) {
    transferRefs.push(`event:${start.id}`);
    const pass = input.learningEvents.find((event) => event.kind === 'lesson-transfer-passed'
      && event.problemId === start.problemId
      && event.data.lessonId === start.data.lessonId
      && event.data.assisted === false
      && Date.parse(event.createdAt) >= Date.parse(start.createdAt));
    if (pass) {
      transferPasses += 1;
      transferRefs.push(`event:${pass.id}`);
    }
  }
  const independentTransfer = metric(transferPasses, starts.length, transferMinimum, transferRefs);

  const sevenDayMinimum = input.sevenDayMinimum ?? 10;
  const nowMs = input.now.getTime();
  const transfers = input.pedagogicalEvents.filter((event) => event.kind === 'transfer-recorded');
  const eligibleTransfers = transfers.filter((event) => Date.parse(event.createdAt) + SEVEN_DAYS_MS <= nowMs);
  const pendingDates = transfers
    .map((event) => Date.parse(event.createdAt) + SEVEN_DAYS_MS)
    .filter((timestamp) => timestamp > nowMs)
    .sort((left, right) => left - right);
  const delayedRefs: string[] = [];
  let delayedPasses = 0;
  for (const transfer of eligibleTransfers) {
    delayedRefs.push(`pedagogical:${transfer.id}`);
    const boundary = Date.parse(transfer.createdAt) + SEVEN_DAYS_MS;
    const transferSkills = new Set(transfer.skillIds ?? []);
    const review = input.pedagogicalEvents.find((event) => event.kind === 'review-recorded'
      && Date.parse(event.createdAt) >= boundary
      && (event.problemId === transfer.problemId || (event.skillIds ?? []).some((skillId) => transferSkills.has(skillId))));
    if (review) {
      delayedRefs.push(`pedagogical:${review.id}`);
      if (review.data.outcome === 'passed') delayedPasses += 1;
    }
  }
  const sevenDayRetraining = metric(
    delayedPasses,
    eligibleTransfers.length,
    sevenDayMinimum,
    delayedRefs,
    eligibleTransfers.length === 0 && pendingDates[0] ? new Date(pendingDates[0]).toISOString() : undefined,
  );

  const canClaimLearningEffect = [teacher, independentTransfer, sevenDayRetraining].every((item) => item.status === 'measurable');
  return { generatedAt: input.now.toISOString(), teacherAdjudication: teacher, independentTransfer, sevenDayRetraining, canClaimLearningEffect };
}

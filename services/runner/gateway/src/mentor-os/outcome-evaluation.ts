import { createHash } from 'node:crypto';

export function assignMentorExperiment(learnerId: string, experiment: { id: string; version: number; arms: string[] }) {
  if (!learnerId || !experiment.id || !Number.isInteger(experiment.version) || experiment.version < 1 || experiment.arms.length < 2) throw new Error('Invalid Mentor experiment');
  const digest = createHash('sha256').update(`${experiment.id}:${experiment.version}:${learnerId}`).digest();
  const arm = experiment.arms[digest.readUInt32BE(0) % experiment.arms.length];
  return { experimentId: experiment.id, version: experiment.version, learnerId, arm, assignmentHash: digest.toString('hex') };
}

type Intervention = { runId: string; learnerId: string; skillIds: string[]; exposedAt: string };
type Attempt = { id: string; at: string; skillIds: string[]; outcome: 'passed' | 'failed'; independent: boolean; surface: 'same' | 'different'; delayed?: boolean };
export function joinMentorOutcome(intervention: Intervention, attempts: Attempt[]) {
  const after = Date.parse(intervention.exposedAt);
  const eligible = attempts.filter((attempt) => attempt.independent && Date.parse(attempt.at) > after && attempt.skillIds.some((id) => intervention.skillIds.includes(id))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const attempt = eligible[0];
  if (!attempt) return null;
  return { runId: intervention.runId, attemptId: attempt.id, outcome: attempt.outcome, kind: attempt.delayed ? 'delayed-review' as const : attempt.surface === 'different' ? 'transfer' as const : 'next-independent' as const, evidenceRefs: [`mentor-run:${intervention.runId}`, `attempt:${attempt.id}`] };
}

export function evaluateMentorOutcomeGate(metrics: { observed: number; nextIndependentRate: number; transferRate: number; retentionRate: number; leakageRate: number; wrongConclusionRate: number }, config: { minimumObserved: number }) {
  const finite = Object.values(metrics).every(Number.isFinite) && Number.isFinite(config.minimumObserved);
  const failures: string[] = [];
  if (!finite || metrics.observed < config.minimumObserved) failures.push(`longitudinal-observations: ${metrics.observed}/${config.minimumObserved}`);
  if (!finite || metrics.nextIndependentRate < 0.6) failures.push('next-independent-rate');
  if (!finite || metrics.transferRate < 0.5) failures.push('transfer-rate');
  if (!finite || metrics.retentionRate < 0.6) failures.push('retention-rate');
  if (!finite || metrics.leakageRate > 0.01) failures.push('answer-leakage-rate');
  if (!finite || metrics.wrongConclusionRate > 0.02) failures.push('wrong-conclusion-rate');
  return { open: failures.length === 0, failures, observed: finite && metrics.observed >= config.minimumObserved };
}

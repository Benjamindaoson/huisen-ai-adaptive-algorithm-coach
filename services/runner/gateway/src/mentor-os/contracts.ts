export const MENTOR_STOP_REASONS = ['completed', 'awaiting-learner', 'awaiting-approval', 'insufficient-evidence', 'policy-denied', 'budget-exhausted', 'unavailable'] as const;
export type MentorStopReason = typeof MENTOR_STOP_REASONS[number];
export type MentorRouteKind = 'today' | 'learn' | 'practice' | 'review' | 'exam-ai' | 'insights';
export type MentorContextKind = 'goal' | 'route' | 'attempt' | 'pedagogical-event' | 'learner-twin' | 'trusted-reference' | 'history';
export type MentorContextContribution = { version: 1; id: string; kind: MentorContextKind; priority: number; evidenceRefs: string[]; data: Record<string, string | number | boolean | string[]> };
export type MentorLifecycleType = 'run-started' | 'context-compiled' | 'hypothesis' | 'missing-evidence' | 'tool-started' | 'tool-completed' | 'approval-requested' | 'approval-resolved' | 'verified' | 'stopped' | 'policy-denied';

const id = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,200}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function validateMentorOSStart(value: unknown) {
  if (!record(value) || value.version !== 1 || !id(value.learnerId) || !id(value.idempotencyKey) || typeof value.goal !== 'string' || !value.goal.trim() || value.goal.length > 1000
    || !record(value.route) || !['today', 'learn', 'practice', 'review', 'exam-ai', 'insights'].includes(String(value.route.kind)) || !id(value.route.ref)) throw new Error('Invalid Mentor OS start request');
  return value as { version: 1; learnerId: string; goal: string; route: { kind: MentorRouteKind; ref: string }; idempotencyKey: string };
}

export function validateMentorContextContribution(value: unknown): MentorContextContribution {
  if (!record(value) || value.version !== 1 || !id(value.id) || !['goal', 'route', 'attempt', 'pedagogical-event', 'learner-twin', 'trusted-reference', 'history'].includes(String(value.kind))
    || !Number.isFinite(value.priority) || Number(value.priority) < 0 || Number(value.priority) > 100 || !Array.isArray(value.evidenceRefs) || !value.evidenceRefs.length
    || value.evidenceRefs.some((ref) => typeof ref !== 'string' || !ref || ref.length > 300 || /^hidden:/i.test(ref)) || !record(value.data)) throw new Error('Forbidden or invalid Mentor context contribution');
  const forbidden = ['rawKeystrokes', 'hiddenExpectedOutput', 'hiddenTests', 'transcript', 'stdin', 'stdout', 'sourceCode'];
  if (Object.keys(value.data).some((key) => forbidden.includes(key)) || Object.values(value.data).some((item) => typeof item === 'object' && !Array.isArray(item))) throw new Error('Forbidden raw Mentor context field');
  return value as MentorContextContribution;
}

export function validateMentorOSCommand(value: unknown) {
  if (!record(value) || value.version !== 1 || !id(value.runId) || !id(value.idempotencyKey) || !['contribute-context', 'act', 'propose-edit', 'approve', 'resume', 'stop'].includes(String(value.kind))
    || !Number.isInteger(value.expectedSequence) || Number(value.expectedSequence) < 1 || (value.kind === 'stop' && !MENTOR_STOP_REASONS.includes(value.stopReason as MentorStopReason))) throw new Error('Invalid Mentor OS command');
  return value;
}

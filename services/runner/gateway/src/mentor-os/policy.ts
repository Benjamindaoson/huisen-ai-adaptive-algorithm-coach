import type { MentorStopReason } from './contracts.js';

type Input = {
  assessment: 'learning' | 'ai-collaboration' | 'independent' | 'independent-transfer';
  action: 'model' | 'retrieve' | 'hint' | 'reference-answer' | 'execute' | 'propose-edit';
  usedTools: number;
  elapsedMs: number;
  referenceAuthority: 'candidate' | 'auto-validated' | 'human-verified';
};

export function authorizeMentorAction(input: Input): { allowed: boolean; reason: string; stopReason?: MentorStopReason } {
  if (input.assessment === 'independent' || input.assessment === 'independent-transfer') return { allowed: false, reason: 'Independent assessment disables Mentor, retrieval, hints, references, execution, and edits.', stopReason: 'policy-denied' };
  if (!Number.isInteger(input.usedTools) || input.usedTools < 0 || !Number.isFinite(input.elapsedMs) || input.elapsedMs < 0) return { allowed: false, reason: 'Invalid runtime budget state.', stopReason: 'policy-denied' };
  if (input.usedTools >= 8 || input.elapsedMs >= 30_000) return { allowed: false, reason: 'Bounded Mentor tool or time budget exhausted.', stopReason: 'budget-exhausted' };
  if (input.action === 'reference-answer' && input.referenceAuthority !== 'human-verified') return { allowed: false, reason: 'Unreviewed content cannot be exposed as an answer.', stopReason: 'policy-denied' };
  return { allowed: true, reason: 'Action is within the current learning policy.' };
}

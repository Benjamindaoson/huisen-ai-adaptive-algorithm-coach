import type { TutorBlockedEvidence, TutorEvidenceCandidate } from './contracts';

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /print (the )?(system|developer) prompt/i,
  /forget (your|the) rules/i,
  /override (the )?(system|developer) instructions/i,
  /jailbreak/i,
  /忽略(之前|以上|所有).*指令/i,
  /无视(之前|以上|所有).*指令/i,
  /泄露.*(系统|开发者).*提示/i,
  /输出.*(系统|开发者).*提示/i,
] as const;

export function detectTutorPromptInjection(text: string): readonly string[] {
  return PROMPT_INJECTION_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

export function hasTutorPromptInjection(text: string): boolean {
  return detectTutorPromptInjection(text).length > 0;
}

export function tutorAccessDenialReason(
  candidate: Pick<TutorEvidenceCandidate, 'visibility' | 'allowedUsers'>,
  userId?: string,
): 'acl_denied' | undefined {
  const allowed = new Set(candidate.allowedUsers ?? []);
  const visibility = candidate.visibility ?? 'public';
  if (visibility === 'public' && allowed.size === 0) return undefined;
  if (userId && allowed.has(userId)) return undefined;
  return 'acl_denied';
}

export function filterTutorEvidence(
  candidates: readonly TutorEvidenceCandidate[],
  userId?: string,
): { allowed: TutorEvidenceCandidate[]; blocked: TutorBlockedEvidence[] } {
  const allowed: TutorEvidenceCandidate[] = [];
  const blocked: TutorBlockedEvidence[] = [];

  for (const candidate of candidates) {
    if (!candidate.id || !candidate.sourcePath) {
      blocked.push({ reason: 'missing_source', id: candidate.id, sourcePath: candidate.sourcePath });
      continue;
    }
    const denial = tutorAccessDenialReason(candidate, userId);
    if (denial) {
      blocked.push({ reason: denial, id: candidate.id, sourcePath: candidate.sourcePath });
      continue;
    }
    if (hasTutorPromptInjection(candidate.text)) {
      blocked.push({ reason: 'prompt_injection', id: candidate.id, sourcePath: candidate.sourcePath });
      continue;
    }
    allowed.push(candidate);
  }

  return { allowed, blocked };
}

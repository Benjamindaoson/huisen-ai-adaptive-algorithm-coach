import type { TutorCandidate, TutorCitation } from '../../contracts/tutor-runtime';

export type TutorGateDecision=Readonly<{
  action:'accept'|'clarify_or_refuse';
  reason:string;
  confidence:number;
}>;

export function gateTutorEvidence(candidates:readonly TutorCandidate[], minConfidence=0.58):TutorGateDecision {
  const confidence=Math.max(0,...candidates.map(c=>c.score));
  if(candidates.length===0) return {action:'clarify_or_refuse',reason:'no_evidence',confidence:0};
  if(confidence<minConfidence) return {action:'clarify_or_refuse',reason:'weak_evidence',confidence};
  return {action:'accept',reason:'sufficient_evidence',confidence};
}

export function citationsFrom(candidates:readonly TutorCandidate[]):TutorCitation[] {
  return candidates.map(c=>({
    sourcePath:c.sourcePath,
    sourceType:c.sourceType,
    title:c.title,
    startLine:c.startLine,
    endLine:c.endLine,
    score:c.score,
    excerpt:c.text.length>420 ? c.text.slice(0,417)+'...' : c.text
  }));
}

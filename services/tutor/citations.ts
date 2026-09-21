import type { TutorCitation, TutorEvidenceCandidate } from './contracts';

function excerpt(text: string, limit = 320): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1)}…`;
}

export function buildTutorCitation(candidate: TutorEvidenceCandidate): TutorCitation {
  return {
    sourcePath: candidate.sourcePath,
    sourceFile: candidate.sourcePath,
    sourceType: candidate.sourceType,
    title: candidate.title ?? '',
    startLine: candidate.startLine,
    endLine: candidate.endLine,
    score: candidate.score,
    excerpt: excerpt(candidate.text),
  };
}

export function buildTutorCitations(candidates: readonly TutorEvidenceCandidate[]): TutorCitation[] {
  return candidates.map(buildTutorCitation);
}

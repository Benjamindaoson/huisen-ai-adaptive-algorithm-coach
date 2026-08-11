export type EvidenceVerification = 'verified' | 'candidate' | 'unverified';
export type LearningEvidenceItem = {
  ref: string;
  kind: 'problem' | 'solution' | 'skill' | 'learner-event';
  title: string;
  text: string;
  skillIds: string[];
  verification: EvidenceVerification;
};

export type RetrievedEvidence = LearningEvidenceItem & { score: number; excerpt: string };

function tokens(value: string): Set<string> {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('zh-Hans-CN');
  const result = new Set(normalized.match(/[a-z0-9_-]+/g) ?? []);
  const chinese = [...normalized.replace(/[^\p{Script=Han}]/gu, '')];
  for (const character of chinese) result.add(character);
  for (let index = 0; index < chinese.length - 1; index += 1) result.add(`${chinese[index]}${chinese[index + 1]}`);
  return result;
}

function overlap(left: Set<string>, right: Set<string>): number {
  if (!left.size || !right.size) return 0;
  let matches = 0;
  for (const token of left) if (right.has(token)) matches += 1;
  return matches / Math.max(1, Math.sqrt(left.size * right.size));
}

function excerpt(value: string, characters: number): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= characters ? compact : `${compact.slice(0, characters)}…`;
}

export function retrieveLearningEvidence(
  query: { text: string; skillIds: string[] },
  items: LearningEvidenceItem[],
  options: { limit?: number; excerptCharacters?: number } = {},
): RetrievedEvidence[] {
  const queryTokens = tokens(query.text);
  const querySkills = new Set(query.skillIds);
  const limit = Math.min(10, Math.max(1, options.limit ?? 5));
  const excerptCharacters = Math.min(500, Math.max(12, options.excerptCharacters ?? 180));
  return items.map((item) => {
    const lexical = overlap(queryTokens, tokens(`${item.title} ${item.text}`));
    const skillMatches = item.skillIds.filter((skill) => querySkills.has(skill)).length;
    const skill = querySkills.size ? skillMatches / querySkills.size : 0;
    const trust = item.verification === 'verified' ? 0.18 : item.verification === 'candidate' ? 0.06 : 0;
    return { ...item, score: Math.round((lexical * 0.62 + skill * 0.3 + trust) * 1_000) / 1_000, excerpt: excerpt(item.text, excerptCharacters) };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.ref.localeCompare(right.ref))
    .slice(0, limit);
}

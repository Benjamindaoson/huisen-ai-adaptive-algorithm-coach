import { readFile } from 'node:fs/promises';

export type MentorDocumentKind = 'problem' | 'solution' | 'skill' | 'misconception' | 'learner-event';
export type MentorIndexDocument = {
  ref: string;
  kind: MentorDocumentKind;
  title: string;
  text: string;
  skillIds: string[];
  verification: 'verified' | 'candidate' | 'unverified';
  authoritative: boolean;
  metadata: Record<string, unknown>;
};
export type MentorRetrievalIndex = { version: 1; problemCount: number; documentCount: number; documents: MentorIndexDocument[] };
export type MentorRetrievalResult = MentorIndexDocument & { score: number; excerpt: string; reasons: string[] };
export type CorpusRetriever = { size: number; search(query: { text: string; skillIds: string[]; misconceptionIds: string[]; limit?: number }): MentorRetrievalResult[] };

function tokenize(value: string): string[] {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('zh-Hans-CN');
  const result: string[] = [...(normalized.match(/[a-z0-9_-]+/g) ?? [])];
  const chinese = [...normalized.replace(/[^\p{Script=Han}]/gu, '')];
  result.push(...chinese);
  for (let index = 0; index < chinese.length - 1; index += 1) result.push(`${chinese[index]}${chinese[index + 1]}`);
  return result.slice(0, 8_000);
}

function frequencies(tokens: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1);
  return result;
}

function excerpt(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= 220 ? compact : `${compact.slice(0, 217)}…`;
}

export function createCorpusRetriever(index: MentorRetrievalIndex): CorpusRetriever {
  if (index.version !== 1 || !Array.isArray(index.documents)) throw new Error('Invalid Mentor retrieval index');
  const prepared = index.documents.map((document) => {
    const tokens = tokenize(`${document.title} ${document.text}`);
    return { document, tokens, tf: frequencies(tokens) };
  });
  const documentFrequency = new Map<string, number>();
  for (const item of prepared) for (const token of new Set(item.tokens)) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  const averageLength = prepared.reduce((sum, item) => sum + item.tokens.length, 0) / Math.max(1, prepared.length);

  return {
    size: prepared.length,
    search(query) {
      const queryTokens = [...new Set(tokenize(query.text))];
      const querySkills = new Set(query.skillIds);
      const queryMisconceptions = new Set(query.misconceptionIds);
      const limit = Math.max(1, Math.min(20, query.limit ?? 8));
      const total = Math.max(1, prepared.length);
      return prepared.map(({ document, tokens, tf }) => {
        let lexical = 0;
        for (const token of queryTokens) {
          const count = tf.get(token) ?? 0;
          if (!count) continue;
          const df = documentFrequency.get(token) ?? 0;
          const idf = Math.log(1 + ((total - df + 0.5) / (df + 0.5)));
          const denominator = count + 1.2 * (0.25 + 0.75 * tokens.length / Math.max(1, averageLength));
          lexical += idf * ((count * 2.2) / denominator);
        }
        const reasons: string[] = [];
        const skillMatches = document.skillIds.filter((skill) => querySkills.has(skill)).length;
        const misconception = String(document.metadata.misconceptionId ?? '');
        if (lexical > 0) reasons.push('lexical-match');
        if (skillMatches) reasons.push('skill-match');
        if (misconception && queryMisconceptions.has(misconception)) reasons.push('misconception-match');
        if (document.verification === 'verified') reasons.push('verified-evidence');
        const trust = document.verification === 'verified' ? 0.9 : document.verification === 'candidate' ? 0.2 : 0;
        const score = lexical + Math.min(1.5, skillMatches * 0.75) + (reasons.includes('misconception-match') ? 2 : 0) + trust;
        return { ...document, score: Math.round(score * 1_000) / 1_000, excerpt: excerpt(document.text), reasons };
      })
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score || Number(right.authoritative) - Number(left.authoritative) || left.ref.localeCompare(right.ref))
        .slice(0, limit);
    },
  };
}

export async function loadCorpusRetriever(filePath: string): Promise<CorpusRetriever> {
  return createCorpusRetriever(JSON.parse(await readFile(filePath, 'utf8')) as MentorRetrievalIndex);
}

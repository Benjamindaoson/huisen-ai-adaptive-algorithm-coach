import type {
  TutorCodeSymbol,
  TutorCourseDocument,
  TutorErrorRecipe,
  TutorEvidenceCandidate,
  TutorFaqRecord,
  TutorRoute,
} from './contracts';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'before', 'does', 'for', 'how', 'in', 'is', 'it',
  'of', 'or', 'should', 'the', 'to', 'what', 'when', 'where', 'why',
]);

const LEARNING_TERMS = ['learning path', 'study', 'roadmap', 'next', '学习路径', '下一步', '先学'] as const;

function tokens(value: string): string[] {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('zh-Hans-CN');
  const english = normalized.match(/[a-z0-9_-]+/g) ?? [];
  const chinese = normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  return [...english, ...chinese].filter((token) => !STOPWORDS.has(token));
}

function overlapScore(query: string, haystack: string): number {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;
  const lowered = haystack.toLocaleLowerCase('zh-Hans-CN');
  const hits = queryTokens.filter((token) => lowered.includes(token)).length;
  return hits ? Math.min(1, 0.35 + hits / queryTokens.length) : 0;
}

function sourceAccess<T extends { visibility?: 'public' | 'private' | 'restricted'; allowedUsers?: readonly string[] }>(item: T) {
  return { visibility: item.visibility, allowedUsers: item.allowedUsers };
}

export function searchCourseDocuments(
  query: string,
  documents: readonly TutorCourseDocument[],
  route: Extract<TutorRoute, 'course' | 'learning_path'> = 'course',
  limit = 5,
): TutorEvidenceCandidate[] {
  return documents
    .map((document) => {
      const haystack = `${document.title ?? ''} ${document.text} ${(document.tags ?? []).join(' ')}`;
      let score = overlapScore(query, haystack);
      if (route === 'learning_path' && LEARNING_TERMS.some((term) => haystack.toLocaleLowerCase().includes(term))) {
        score = Math.max(score, 0.72);
      }
      const id = document.id ?? `${document.sourcePath}:${document.startLine ?? 0}-${document.endLine ?? 0}`;
      return {
        id,
        text: document.text,
        sourcePath: document.sourcePath,
        sourceType: document.sourceType ?? 'course_note',
        modality: 'text' as const,
        score,
        retrievalStrategy: 'course' as const,
        title: document.title,
        startLine: document.startLine,
        endLine: document.endLine,
        ...sourceAccess(document),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

export function searchCodeSymbols(
  query: string,
  symbols: readonly TutorCodeSymbol[],
  limit = 5,
): TutorEvidenceCandidate[] {
  const lowered = query.toLocaleLowerCase('en-US');
  const queryTokens = tokens(query);
  return symbols
    .map((symbol) => {
      const haystack = `${symbol.symbolName} ${symbol.sourcePath} ${symbol.text}`.toLocaleLowerCase('en-US');
      const exact = lowered.includes(symbol.symbolName.toLocaleLowerCase('en-US'));
      const tokenHits = queryTokens.filter((token) => haystack.includes(token)).length;
      const score = exact ? 1 : tokenHits ? Math.min(0.9, 0.5 + tokenHits / Math.max(2, queryTokens.length * 2)) : 0;
      return {
        id: `${symbol.sourcePath}:${symbol.startLine}-${symbol.endLine}:${symbol.symbolName}`,
        text: symbol.text,
        sourcePath: symbol.sourcePath,
        sourceType: 'project_code',
        modality: 'code' as const,
        score,
        retrievalStrategy: 'code' as const,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        metadata: { symbolName: symbol.symbolName, symbolType: symbol.symbolType },
        ...sourceAccess(symbol),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit);
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  let intersection = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) intersection += 1;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

export function matchFaq(
  query: string,
  records: readonly TutorFaqRecord[],
  threshold = 0.58,
): TutorEvidenceCandidate | undefined {
  const normalized = query.trim().toLocaleLowerCase('zh-Hans-CN');
  let best: { record: TutorFaqRecord; score: number } | undefined;

  for (const record of records) {
    const question = record.question.trim().toLocaleLowerCase('zh-Hans-CN');
    if (!question) continue;
    const score = question.includes(normalized) || normalized.includes(question)
      ? 1
      : tokenSimilarity(normalized, question);
    if (!best || score > best.score) best = { record, score };
  }

  if (!best || best.score < threshold) return undefined;
  const sourcePath = best.record.sourcePath ?? 'faq';
  return {
    id: `${sourcePath}:faq:${best.record.question}`,
    text: best.record.answer,
    sourcePath,
    sourceType: 'faq',
    modality: 'text',
    score: best.score,
    retrievalStrategy: 'faq',
    metadata: { question: best.record.question },
    ...sourceAccess(best.record),
  };
}

export function matchErrorRecipe(
  query: string,
  recipes: readonly TutorErrorRecipe[],
): TutorEvidenceCandidate | undefined {
  const lowered = query.toLocaleLowerCase('zh-Hans-CN');
  const recipe = recipes.find((item) => item.errorPattern && lowered.includes(item.errorPattern.toLocaleLowerCase('zh-Hans-CN')));
  if (!recipe) return undefined;
  const sourcePath = recipe.sourcePath ?? 'errors';
  return {
    id: `${sourcePath}:error:${recipe.errorPattern}`,
    text: [
      recipe.errorPattern,
      recipe.symptom ?? '',
      recipe.cause,
      recipe.fixSteps.join(' '),
      recipe.verifyCommand ?? '',
    ].filter(Boolean).join(' '),
    sourcePath,
    sourceType: 'error_recipe',
    modality: 'text',
    score: 1,
    retrievalStrategy: 'error',
    metadata: {
      errorPattern: recipe.errorPattern,
      cause: recipe.cause,
      fixSteps: [...recipe.fixSteps],
      verifyCommand: recipe.verifyCommand,
    },
    ...sourceAccess(recipe),
  };
}

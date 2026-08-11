import type { SkillId } from './skills';

export type ProblemLanguage = 'java' | 'python' | 'javascript' | 'cpp';

export type ProblemClassification = { source: 'verified' | 'candidate' | 'inferred'; confidence: number };
export type ProblemQuality = {
  practiceReady: boolean;
  reviewStatus: 'verified' | 'candidate' | 'unreviewed' | 'needs-content';
  solutionCoverage: number;
  issues: string[];
};

export type CatalogProblem = {
  id: string;
  title: string;
  collection: string;
  score: number | null;
  tags: string[];
  languages: ProblemLanguage[];
  completeness: 'complete' | 'index-only';
  sourcePaths: string[];
  duplicateCount: number;
  skills?: SkillId[];
  classification?: ProblemClassification;
  quality?: ProblemQuality;
  excerpt: string;
  searchText: string;
};

export type ProblemRecord = {
  id: string;
  title: string;
  sourcePaths: string[];
  sourceKinds: string[];
  score: number | null;
  collection: string;
  sections: {
    description?: string;
    input?: string;
    output?: string;
    examples: string[];
    solution?: string;
    complexity?: string;
  };
  solutions: Partial<Record<ProblemLanguage, string>>;
  tags: string[];
  completeness: 'complete' | 'index-only';
  skills?: SkillId[];
  classification?: ProblemClassification;
  quality?: ProblemQuality;
};

export type Catalog = { version: number; problems: CatalogProblem[] };

export async function loadCatalog(): Promise<Catalog> {
  const response = await fetch('/index.json');
  if (!response.ok) throw new Error('题库索引暂时无法加载');
  const catalog = await response.json() as Catalog;
  if (!catalog || !Array.isArray(catalog.problems)) throw new Error('题库索引格式无效');
  return catalog;
}

export async function loadProblem(id: string): Promise<ProblemRecord> {
  const response = await fetch(`/problems/${encodeURIComponent(id)}.json`);
  if (!response.ok) throw new Error('题目正文暂时无法加载');
  return response.json() as Promise<ProblemRecord>;
}

export async function loadProblemAlias(id: string): Promise<string | null> {
  const response = await fetch('/aliases.json');
  if (!response.ok) return null;
  const aliases = await response.json() as Record<string, string>;
  return typeof aliases[id] === 'string' ? aliases[id] : null;
}

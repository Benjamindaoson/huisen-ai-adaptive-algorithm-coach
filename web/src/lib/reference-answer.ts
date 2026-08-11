import type { ProblemLanguage, ProblemRecord } from './catalog';
import type { PracticeAttempt } from './practice';

export type ReferenceSection = { id: 'thinking' | 'complexity' | 'code'; title: string; content: string; kind: 'text' | 'code' };

const languageLabels: Record<ProblemLanguage, string> = { java: 'Java', python: 'Python', javascript: 'JavaScript', cpp: 'C++' };

export function canOpenReference(attempts: PracticeAttempt[], problemId: string, language: ProblemLanguage): boolean {
  return attempts.some((attempt) => attempt.problemId === problemId && attempt.language === language && attempt.mode === 'sample-submit');
}

export function referenceSections(problem: ProblemRecord, language: ProblemLanguage): ReferenceSection[] {
  const sections: ReferenceSection[] = [];
  if (problem.sections.solution?.trim()) sections.push({ id: 'thinking', title: '解题思路', content: problem.sections.solution.trim(), kind: 'text' });
  if (problem.sections.complexity?.trim()) sections.push({ id: 'complexity', title: '复杂度分析', content: problem.sections.complexity.trim(), kind: 'text' });
  const code = problem.solutions[language]?.trim();
  if (code) sections.push({ id: 'code', title: `${languageLabels[language]} 参考代码`, content: code, kind: 'code' });
  return sections;
}

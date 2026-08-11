import type { CatalogProblem } from './catalog';
import { inferProblemSkills } from './skills';

export function selectExamProblems(catalog: CatalogProblem[], count: number): CatalogProblem[] {
  const remaining = catalog.filter((problem) => problem.completeness === 'complete' && problem.languages.length > 0);
  const selected: CatalogProblem[] = [];
  const coveredSkills = new Set<string>();

  while (selected.length < count && remaining.length) {
    const diverseIndex = remaining.findIndex((problem) => inferProblemSkills(problem).some((skill) => !coveredSkills.has(skill)));
    const [next] = remaining.splice(diverseIndex < 0 ? 0 : diverseIndex, 1);
    selected.push(next);
    inferProblemSkills(next).forEach((skill) => coveredSkills.add(skill));
  }

  return selected;
}

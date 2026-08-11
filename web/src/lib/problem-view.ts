import type { ProblemRecord } from './catalog';

export type ProblemView = 'description' | 'solution';
type SectionKey = 'description' | 'input' | 'output' | 'examples' | 'solution' | 'complexity';
type ViewSection = [SectionKey, string, string];

const viewDefinitions: Record<ProblemView, readonly [SectionKey, string][]> = {
  description: [
    ['description', '题目描述'],
    ['input', '输入说明'],
    ['output', '输出说明'],
    ['examples', '示例'],
  ],
  solution: [
    ['solution', '解题思路'],
    ['complexity', '复杂度'],
  ],
};

export function getProblemViewSections(view: ProblemView, sections: ProblemRecord['sections']): ViewSection[] {
  return viewDefinitions[view].flatMap(([key, title]) => {
    const content = key === 'examples' ? sections.examples.join('\n\n') : sections[key] ?? '';
    return content.trim() ? [[key, title, content] as ViewSection] : [];
  });
}

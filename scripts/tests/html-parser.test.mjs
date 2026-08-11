import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { parseHtmlProblem } from '../lib/html-parser.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/problem.html', import.meta.url));

test('parseHtmlProblem extracts headings, sections and language code blocks', async () => {
  const problem = await parseHtmlProblem(fixturePath, { collection: 'ABCD卷', title: 'IPv4地址转换成整数', score: 100 });

  expect(problem.sections.description).toContain('虚拟 IPv4');
  expect(problem.sections.input).toContain('输入一行');
  expect(problem.sections.output).toContain('invalid IP');
  expect(problem.sections.solution).toContain('逐段验证');
  expect(problem.solutions.python).toContain("print('ok')");
  expect(problem.solutions.python).toMatch(/def solve\(\):\n\s+print\('ok'\)/);
  expect(problem.solutions.python).not.toContain('123456789101112131415');
  expect(problem.score).toBe(100);
});

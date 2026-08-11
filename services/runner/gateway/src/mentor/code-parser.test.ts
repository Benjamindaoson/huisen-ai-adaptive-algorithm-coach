import { describe, expect, it } from 'vitest';
import { parseSource } from './code-parser.js';

const programs = {
  javascript: 'function sum(xs) { let total = 0; for (const x of xs) { if (x > 0) total += x; } return total; }',
  python: 'def sum_positive(xs):\n    total = 0\n    for x in xs:\n        if x > 0:\n            total += x\n    return total\n',
  java: 'class Main { static int sum(int[] xs) { int total=0; for (int x: xs) { if (x>0) total+=x; } return total; } }',
  cpp: '#include <vector>\nint sum(std::vector<int> xs) { int total=0; for (int x: xs) { if (x>0) total+=x; } return total; }',
} as const;

describe('parseSource', () => {
  for (const [language, sourceCode] of Object.entries(programs)) {
    it(`returns bounded structural evidence for ${language}`, async () => {
      const result = await parseSource({ language: language as keyof typeof programs, sourceCode });
      expect(result.parser).toMatch(/^tree-sitter:/);
      expect(result.degraded).toBe(false);
      expect(result.nodes.some((node) => node.kind === 'function')).toBe(true);
      expect(result.nodes.some((node) => node.kind === 'loop')).toBe(true);
      expect(result.nodes.some((node) => node.kind === 'branch')).toBe(true);
      const functionNode = result.nodes.find((node) => node.kind === 'function');
      expect(functionNode?.symbolName).toMatch(/^sum/);
      expect(result.nodes.find((node) => node.kind === 'loop')?.scopeId).toBe(functionNode?.id);
      expect(result.nodes.every((node) => node.range.startLine >= 1 && node.range.endLine >= node.range.startLine)).toBe(true);
      expect(result.nodes.length).toBeLessThanOrEqual(160);
    });
  }

  it('reports parser degradation instead of inventing AST certainty', async () => {
    const result = await parseSource({ language: 'python', sourceCode: 'def broken(:\n  pass' });
    expect(result.degraded).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].evidenceRef).toMatch(/^ast:error:/);
  });
});

import { describe, expect, it } from 'vitest';
import { parseSource } from './code-parser.js';
import { analyzeProgram } from './code-intelligence.js';
import { analyzeSemantics } from './semantic-analysis.js';

const fixtures = {
  javascript: `function helper(x) { return x + 1; }\nfunction main() { let n = 1; if (n > 0) return helper(n); return 0; }\nmain();`,
  python: `def helper(x):\n    return x + 1\ndef main():\n    n = 1\n    if n > 0:\n        return helper(n)\n    return 0\nmain()`,
  java: `class Main { static int helper(int x){ return x + 1; } public static void main(String[] a){ int n = 1; if(n > 0) System.out.println(helper(n)); } }`,
  cpp: `#include <iostream>\nint helper(int x){ return x + 1; }\nint main(){ int n = 1; if(n > 0) std::cout << helper(n); return 0; }`,
} as const;

describe('interprocedural semantic analysis', () => {
  for (const [language, sourceCode] of Object.entries(fixtures)) {
    it(`builds named function and direct call evidence for ${language}`, async () => {
      const parsed = await parseSource({ language: language as keyof typeof fixtures, sourceCode });
      const report = analyzeProgram({ parsed, sourceCode });
      const semantic = analyzeSemantics({ parsed, report, sourceCode });
      expect(semantic.precision).toBe('structural-interprocedural');
      expect(semantic.functions.map((item) => item.name)).toEqual(expect.arrayContaining(['helper', 'main']));
      expect(semantic.callGraph.some((edge) => edge.callee === 'helper')).toBe(true);
      expect(Object.keys(semantic.dominators).length).toBeGreaterThan(0);
      expect(semantic.reachingDefinitions.some((item) => item.symbol === 'n' && item.definitionLines.length > 0)).toBe(true);
    });
  }

  it('keeps a possible missing definition as an unverified path risk', async () => {
    const sourceCode = `function main(flag) {\n  if (flag) value = 1;\n  return value;\n}`;
    const parsed = await parseSource({ language: 'javascript', sourceCode });
    const semantic = analyzeSemantics({ parsed, report: analyzeProgram({ parsed, sourceCode }), sourceCode });
    expect(semantic.pathRisks).toContainEqual(expect.objectContaining({ kind: 'possibly-uninitialized', status: 'unverified' }));
  });
});

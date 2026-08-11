import { describe, expect, it, vi } from 'vitest';
import { parseSource } from './code-parser.js';
import { analyzeProgram, instrumentSource, planCounterexamples, planRuntimeProbes, verifyHypothesis } from './code-intelligence.js';

describe('semantic code intelligence', () => {
  it('derives bounded control-flow, def-use and probe evidence from parsed syntax', async () => {
    const sourceCode = 'function solve(xs) { let total = 0; for (const x of xs) { if (x > 0) total += x; } return total; }';
    const parsed = await parseSource({ language: 'javascript', sourceCode });
    const report = analyzeProgram({ parsed, sourceCode });
    expect(report.controlFlow.nodes.some((node) => node.kind === 'branch')).toBe(true);
    expect(report.controlFlow.edges.some((edge) => edge.label === 'repeat')).toBe(true);
    expect(report.symbols.find((symbol) => symbol.name === 'total')).toMatchObject({ definitions: [1] });
    expect(report.symbols.find((symbol) => symbol.name === 'total')?.uses.length).toBeGreaterThan(0);
    expect(report.hypotheses.every((item) => item.status === 'unverified')).toBe(true);
    expect(planRuntimeProbes(report).every((probe) => probe.line >= 1)).toBe(true);
  });

  it('creates small candidate inputs derived from public input shape', () => {
    const candidates = planCounterexamples({ inputDescription: '第一行 n，第二行 n 个整数', publicInputs: ['4\n1 2 3 4'] });
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(new Set(candidates.map((item) => item.input)).size).toBe(candidates.length);
    expect(candidates.every((item) => item.input.length <= 2_000 && item.authority === 'candidate')).toBe(true);
  });

  it('supports a hypothesis only after trusted differential execution diverges', async () => {
    const execute = vi.fn(async (input: string) => ({ kind: 'success' as const, stdout: input.includes('0') ? 'wrong\n' : 'ok\n' }));
    const result = await verifyHypothesis({
      hypothesis: { id: 'hyp:boundary', message: 'zero boundary fails', evidenceRefs: ['ast:line:3'] },
      candidates: [{ id: 'case:zero', input: '1\n0', rationale: 'zero boundary', authority: 'candidate' }],
      expectedFor: async () => ({ output: 'ok', evidenceRef: 'trusted:test:zero', authority: 'human-reviewed' }),
      executeSubmission: execute,
    });
    expect(result).toMatchObject({ status: 'supported', candidateRef: 'case:zero', expected: 'ok', actual: 'wrong' });
    expect(result.evidenceRefs).toEqual(expect.arrayContaining(['trusted:test:zero', 'execution:case:zero']));
  });

  it('keeps a hypothesis unverified when no trusted expectation exists', async () => {
    const result = await verifyHypothesis({
      hypothesis: { id: 'hyp:x', message: 'possible issue', evidenceRefs: [] },
      candidates: [{ id: 'case:x', input: '1', rationale: 'small case', authority: 'candidate' }],
      expectedFor: async () => null,
      executeSubmission: async () => ({ kind: 'success', stdout: '1' }),
    });
    expect(result.status).toBe('unverified');
    expect(result.missingEvidence).toContain('trusted expected output');
  });

  it.each([
    ['javascript', 'let x = 1;\nconsole.log(x);', '__mentorTrace'],
    ['python', 'x = 1\nprint(x)', '__mentorTrace'],
    ['java', 'class Main { public static void main(String[] a) { int x = 1; System.out.println(x); } }', '__mentorTrace'],
    ['cpp', '#include <iostream>\nint main(){ int x = 1; std::cout << x; }', '__mentorTrace'],
  ] as const)('instruments %s source without replacing the learner submission', async (language, sourceCode, marker) => {
    const result = instrumentSource({
      language,
      sourceCode,
      probes: [{ id: 'probe:1', line: 1, purpose: 'observe-state', evidenceRef: 'ast:1', expressions: [] }],
    });
    expect(result.originalSource).toBe(sourceCode);
    expect(result.instrumentedSource).toContain(marker);
    expect(result.instrumentedSource).not.toBe(sourceCode);
    expect(result.traceRefs).toEqual(['probe:1']);
    const parsed = await parseSource({ language, sourceCode: result.instrumentedSource });
    expect(parsed.degraded).toBe(false);
  });
});

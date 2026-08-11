import { describe, expect, it } from 'vitest';
import { instrumentSource, type RuntimeProbe } from './code-intelligence.js';
import { parseRuntimeTrace } from './runtime-trace.js';

const probe: RuntimeProbe = { id: 'probe:1', line: 3, purpose: 'observe-branch-state', evidenceRef: 'ast:branch', expressions: ['i', 'sum'] };

describe('runtime state tracing', () => {
  it.each([
    ['javascript', `let i = 1;\nlet sum = 2;\nif (i) console.log(sum);`],
    ['python', `i = 1\nsum = 2\nif i:\n    print(sum)`],
    ['java', `class Main { public static void main(String[] a) {\nint i = 1;\nint sum = 2;\nif (i > 0) System.out.println(sum);\n} }`],
    ['cpp', `#include <iostream>\nint main(){\nint i = 1, sum = 2;\nif(i > 0) std::cout << sum;\n}`],
  ] as const)('instruments %s with state expressions while preserving original source', (language, sourceCode) => {
    const result = instrumentSource({ language, sourceCode, probes: [probe] });
    expect(result.originalSource).toBe(sourceCode);
    expect(result.instrumentedSource).toContain('__mentorTrace:');
    expect(result.instrumentedSource).toContain('probe:1');
    expect(result.instrumentedSource).toMatch(/i/);
    expect(result.instrumentedSource).toMatch(/sum/);
  });

  it('parses only valid bounded Mentor JSON traces', () => {
    const valid = '__mentorTrace:{"version":1,"probeId":"probe:1","line":3,"state":{"i":"1","sum":"2"}}';
    const stderr = `ordinary error\n__mentorTrace:not-json\n${valid}\n${valid}`;
    expect(parseRuntimeTrace(stderr, { maxEvents: 1 })).toEqual([{ version: 1, probeId: 'probe:1', line: 3, state: { i: '1', sum: '2' }, evidenceRef: 'runtime:probe:1:3' }]);
  });

  it('rejects oversized or malformed state payloads', () => {
    const huge = `__mentorTrace:${JSON.stringify({ version: 1, probeId: 'p', line: 1, state: { x: 'x'.repeat(5_000) } })}`;
    expect(parseRuntimeTrace(huge)).toEqual([]);
    expect(parseRuntimeTrace('__mentorTrace:{"version":2,"probeId":"p","line":1,"state":{}}')).toEqual([]);
  });
});

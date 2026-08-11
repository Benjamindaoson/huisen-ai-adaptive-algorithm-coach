import { instrumentSource, type RuntimeProbe } from '../src/mentor/code-intelligence.js';
import { parseRuntimeTrace } from '../src/mentor/runtime-trace.js';
import type { AllowedLanguage } from '../src/validation.js';

const gateway = process.env.RUNNER_VERIFY_URL ?? 'http://127.0.0.1:8787';
const cases: Array<{ language: AllowedLanguage; sourceCode: string; probe: RuntimeProbe }> = [
  { language: 'javascript', sourceCode: 'let i = 1;\nlet sum = 2;\nif (i > 0) console.log(sum);', probe: { id: 'probe:js', line: 3, purpose: 'state', evidenceRef: 'js:branch', expressions: ['i', 'sum'] } },
  { language: 'python', sourceCode: 'i = 1\nsum = 2\nif i > 0:\n    print(sum)', probe: { id: 'probe:py', line: 3, purpose: 'state', evidenceRef: 'py:branch', expressions: ['i', 'sum'] } },
  { language: 'java', sourceCode: 'public class Main {\n  public static void main(String[] args) {\n    int i = 1;\n    int sum = 2;\n    if (i > 0) System.out.println(sum);\n  }\n}', probe: { id: 'probe:java', line: 5, purpose: 'state', evidenceRef: 'java:branch', expressions: ['i', 'sum'] } },
  { language: 'cpp', sourceCode: '#include <iostream>\nint main(){\n  int i = 1;\n  int sum = 2;\n  if(i > 0) std::cout << sum << std::endl;\n}', probe: { id: 'probe:cpp', line: 5, purpose: 'state', evidenceRef: 'cpp:branch', expressions: ['i', 'sum'] } },
];

const results = [];
for (const item of cases) {
  const instrumented = instrumentSource({ language: item.language, sourceCode: item.sourceCode, probes: [item.probe] });
  const response = await fetch(`${gateway}/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language: item.language, sourceCode: instrumented.instrumentedSource, stdin: '' }) });
  const execution = await response.json() as { kind: string; stdout: string; stderr: string };
  const traces = parseRuntimeTrace(execution.stderr ?? '');
  if (execution.kind !== 'success' || traces.length !== 1 || traces[0].state.i !== '1' || traces[0].state.sum !== '2') {
    throw new Error(`${item.language} trace verification failed: ${JSON.stringify({ execution, traces })}`);
  }
  results.push({ language: item.language, kind: execution.kind, state: traces[0].state });
}
process.stdout.write(`${JSON.stringify(results)}\n`);

export type SampleTestCase = {
  id: string;
  name: string;
  stdin: string;
  expectedOutput: string;
};

const CURATED_PUBLIC_SAMPLES: Record<string, SampleTestCase[]> = {
  'od-71a5033ee94c': [
    { id: 'curated-1', name: '校验样例 1', stdin: '6\n1 -1 -6 7 -17 7\n2', expectedOutput: '14' },
    { id: 'curated-2', name: '校验样例 2', stdin: '1\n5\n1', expectedOutput: '5' },
  ],
  'od-b53d53c3e9d3': [
    { id: 'curated-1', name: '校验样例 1', stdin: '128#0#255#255', expectedOutput: '2147549183' },
    { id: 'curated-2', name: '校验样例 2', stdin: '129#0#0#1', expectedOutput: 'invalid IP' },
  ],
  'od-f5d47011b9f8': [
    { id: 'curated-1', name: '校验样例 1', stdin: '3 1 1 2\n3 1 2 3\n2', expectedOutput: '4' },
    { id: 'curated-2', name: '校验样例 2', stdin: '2 1 2\n2 3 4\n3', expectedOutput: '14' },
  ],
  'od-5e34daac53f3': [
    { id: 'curated-1', name: '校验样例 1', stdin: '4\n1 4\n2 5\n7 9\n14 18', expectedOutput: '1 5\n7 9\n14 18' },
    { id: 'curated-2', name: '校验样例 2', stdin: '2\n1 4\n4 5', expectedOutput: '1 5' },
  ],
};

const INPUT_MARKER = /^(?:输入|input)\s*[：:]?\s*(.*)$/i;
const OUTPUT_MARKER = /^(?:输出|output)\s*[：:]?\s*(.*)$/i;
const EXPLANATION_MARKER = /^(?:说明|解释|备注|explanation|note)\s*[：:]?/i;
const EXAMPLE_MARKER = /^(?:示例|样例|example)\s*\d*/i;

function normalizedLines(examples: string[]): string[] {
  return examples
    .flatMap((example) => example.replace(/\r\n?/g, '\n').split('\n'))
    .map((line) => line.trim());
}

function nearestExampleName(lines: string[], inputIndex: number, fallback: string): string {
  for (let index = inputIndex - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (EXAMPLE_MARKER.test(line)) return line;
    if (INPUT_MARKER.test(line) || OUTPUT_MARKER.test(line)) break;
  }
  return fallback;
}

export function sampleTestCasesFromExamples(examples: string[]): SampleTestCase[] {
  const lines = normalizedLines(examples);
  const cases: SampleTestCase[] = [];

  for (let inputIndex = 0; inputIndex < lines.length; inputIndex += 1) {
    const inputMatch = lines[inputIndex].match(INPUT_MARKER);
    if (!inputMatch) continue;

    const inputValues = inputMatch[1] ? [inputMatch[1].trim()] : [];
    let outputIndex = -1;
    for (let index = inputIndex + 1; index < lines.length; index += 1) {
      if (INPUT_MARKER.test(lines[index]) || EXPLANATION_MARKER.test(lines[index])) break;
      const outputMatch = lines[index].match(OUTPUT_MARKER);
      if (outputMatch) {
        outputIndex = index;
        break;
      }
      if (lines[index] && !EXAMPLE_MARKER.test(lines[index])) inputValues.push(lines[index]);
    }
    if (outputIndex < 0) continue;

    const outputMatch = lines[outputIndex].match(OUTPUT_MARKER);
    const outputValues = outputMatch?.[1] ? [outputMatch[1].trim()] : [];
    for (let index = outputIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (INPUT_MARKER.test(line) || EXPLANATION_MARKER.test(line) || EXAMPLE_MARKER.test(line)) break;
      if (line) outputValues.push(line);
    }

    const stdin = inputValues.filter(Boolean).join('\n');
    const expectedOutput = outputValues.filter(Boolean).join('\n');
    if (!stdin || !expectedOutput) continue;

    const number = cases.length + 1;
    cases.push({
      id: `sample-${number}`,
      name: nearestExampleName(lines, inputIndex, `示例 ${number}`),
      stdin,
      expectedOutput,
    });
  }

  return cases;
}

function isSequentialPlaceholder(value: string): boolean {
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.length <= 40 && lines.every((line, index) => line === String(index + 1));
}

function looksLikeNarrative(value: string): boolean {
  return /(?:第[一二三四五六七八九十\d]+(?:行|个元素)|(?:表示|含义)|输入解释|输出解释|说明|分析)/.test(value);
}

export function credibleSampleTestCasesFromExamples(examples: string[]): SampleTestCase[] {
  return sampleTestCasesFromExamples(examples).filter((testCase) => {
    if (looksLikeNarrative(testCase.stdin) || looksLikeNarrative(testCase.expectedOutput)) return false;
    if (isSequentialPlaceholder(testCase.stdin) && isSequentialPlaceholder(testCase.expectedOutput)) return false;
    return true;
  });
}

export function publicSampleCasesForProblem(problem: { id: string; sections: { examples: string[] } }): SampleTestCase[] {
  return CURATED_PUBLIC_SAMPLES[problem.id] ?? credibleSampleTestCasesFromExamples(problem.sections.examples);
}

export function reviewedPublicSampleCasesForProblem(problem: { id: string }): SampleTestCase[] {
  return CURATED_PUBLIC_SAMPLES[problem.id] ?? [];
}

export function sampleStdinFromExamples(examples: string[]): string {
  return sampleTestCasesFromExamples(examples)[0]?.stdin ?? '';
}

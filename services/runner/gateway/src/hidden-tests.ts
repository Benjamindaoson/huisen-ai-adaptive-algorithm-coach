import type { HiddenTestCase } from './submissions.js';

// Server-only starter pack. Do not import this module from the web application.
const TESTS: Record<string, HiddenTestCase[]> = {
  'od-71a5033ee94c': [
    { stdin: '6\n10 -5 -2 4 0 3\n3', expectedOutput: '17' },
    { stdin: '4\n1 2 -10 5\n2', expectedOutput: '8' },
  ],
  'od-b53d53c3e9d3': [
    { stdin: '1#0#0#0', expectedOutput: '16777216' },
    { stdin: '01#0#0#0', expectedOutput: 'invalid IP' },
  ],
  'od-f5d47011b9f8': [
    { stdin: '2 1 5\n3 2 3 4\n4', expectedOutput: '19' },
    { stdin: '1 10\n2 1 2\n2', expectedOutput: '23' },
  ],
  'od-5e34daac53f3': [
    { stdin: '3\n1 10\n2 3\n4 5', expectedOutput: '1 10' },
    { stdin: '3\n7 9\n1 2\n2 4', expectedOutput: '1 4\n7 9' },
  ],
};

export function lookupHiddenTests(problemId: string): HiddenTestCase[] | undefined {
  return TESTS[problemId]?.map((test) => ({ ...test }));
}

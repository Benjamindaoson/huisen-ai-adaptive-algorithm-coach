import { readFile } from 'node:fs/promises';
import type { CounterexampleCandidate, ExpectedObservation } from './code-intelligence.js';

export type TrustedExpectationIndex = {
  version: 1;
  problems: Record<string, Array<{ id: string; input: string; expectedOutput: string }>>;
};
export type TrustedExpectationResolver = (request: { problemId: string; candidate: CounterexampleCandidate }) => Promise<ExpectedObservation | null>;

function normalized(value: string): string {
  return value.replace(/\r\n?/g, '\n').trimEnd();
}

export function createTrustedExpectationResolver(index: TrustedExpectationIndex): TrustedExpectationResolver {
  if (index.version !== 1 || !index.problems || typeof index.problems !== 'object') throw new Error('Invalid trusted expectation index');
  return async ({ problemId, candidate }) => {
    const match = (index.problems[problemId] ?? []).find((item) => normalized(item.input) === normalized(candidate.input));
    if (!match) return null;
    return { output: match.expectedOutput, evidenceRef: `verified-public-case:${problemId}:${match.id}`, authority: 'human-reviewed' };
  };
}

export async function loadTrustedExpectationResolver(filePath: string): Promise<TrustedExpectationResolver> {
  return createTrustedExpectationResolver(JSON.parse(await readFile(filePath, 'utf8')) as TrustedExpectationIndex);
}

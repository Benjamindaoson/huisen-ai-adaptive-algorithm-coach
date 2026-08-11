import { createHash } from 'node:crypto';
import type { AllowedLanguage } from '../validation.js';
import type { CounterexampleCandidate, ExecutionObservation, ExpectedObservation } from './code-intelligence.js';

export type ReferenceSolution = { problemId: string; language: AllowedLanguage; sourceCode: string; contentDigest: string };
export type ReferenceSolutionRepository = { getSolutions(problemId: string): Promise<ReferenceSolution[]> };
export type ReferenceConsensusOracle = {
  resolve(request: { problemId: string; candidate: CounterexampleCandidate }): Promise<ExpectedObservation | null>;
};

function normalized(value: string): string {
  return value.replace(/\r\n?/g, '\n').trimEnd();
}

export function createReferenceConsensusOracle(options: {
  repository: ReferenceSolutionRepository;
  execute(request: { language: AllowedLanguage; sourceCode: string; candidateInput: string }): Promise<ExecutionObservation>;
  maxSolutions?: number;
}): ReferenceConsensusOracle {
  const cache = new Map<string, Promise<ExpectedObservation | null>>();
  return {
    async resolve({ problemId, candidate }) {
      const solutions = (await options.repository.getSolutions(problemId))
        .filter((item, index, all) => all.findIndex((other) => other.language === item.language) === index)
        .slice(0, options.maxSolutions ?? 4);
      const digest = createHash('sha256')
        .update(problemId).update('\0').update(normalized(candidate.input)).update('\0')
        .update(solutions.map((item) => `${item.language}:${item.contentDigest}`).join('|'))
        .digest('hex').slice(0, 20);
      const cacheKey = `${problemId}:${digest}`;
      let pending = cache.get(cacheKey);
      if (!pending) {
        pending = (async () => {
          const observations = await Promise.all(solutions.map(async (solution) => ({
            language: solution.language,
            observation: await options.execute({ language: solution.language, sourceCode: solution.sourceCode, candidateInput: candidate.input }),
          })));
          const successful = observations.filter((item) => item.observation.kind === 'success');
          if (successful.length < 2) return null;
          const outputs = [...new Set(successful.map((item) => normalized(item.observation.stdout)))];
          if (outputs.length !== 1) return null;
          return {
            output: outputs[0], authority: 'reference-consensus' as const,
            evidenceRef: `reference-consensus:${problemId}:${digest}`,
            provenance: {
              digest,
              attemptedLanguages: observations.map((item) => item.language),
              successfulLanguages: successful.map((item) => item.language),
            },
          };
        })();
        cache.set(cacheKey, pending);
      }
      return pending;
    },
  };
}

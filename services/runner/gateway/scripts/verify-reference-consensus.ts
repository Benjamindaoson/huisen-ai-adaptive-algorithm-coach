import { fileURLToPath } from 'node:url';
import { createReferenceConsensusOracle } from '../src/mentor/reference-consensus-oracle.js';
import { createCorpusReferenceSolutionRepository } from '../src/mentor/reference-solution-repository.js';

const gateway = process.env.RUNNER_VERIFY_URL ?? 'http://127.0.0.1:8787';
const problemId = process.env.CONSENSUS_PROBLEM_ID ?? 'od-71a5033ee94c';
const candidate = { id: 'integration:singleton', input: '1\n5\n1', rationale: 'reviewed singleton boundary', authority: 'candidate' as const };
const repository = createCorpusReferenceSolutionRepository(fileURLToPath(new URL('../../../../content/problems', import.meta.url)));
const oracle = createReferenceConsensusOracle({
  repository,
  execute: async ({ language, sourceCode, candidateInput }) => {
    const response = await fetch(`${gateway}/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ language, sourceCode, stdin: candidateInput }) });
    return await response.json() as { kind: 'success' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable'; stdout: string; stderr?: string };
  },
});
const result = await oracle.resolve({ problemId, candidate });
if (!result || result.authority !== 'reference-consensus' || result.output.trim() !== '5' || (result.provenance?.successfulLanguages.length ?? 0) < 2) throw new Error(`Reference consensus unavailable: ${JSON.stringify(result)}`);
process.stdout.write(`${JSON.stringify({ authority: result.authority, output: result.output.trim(), provenance: result.provenance, evidenceRef: result.evidenceRef })}\n`);

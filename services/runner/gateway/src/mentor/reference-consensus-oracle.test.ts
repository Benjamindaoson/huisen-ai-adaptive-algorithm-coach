import { describe, expect, it } from 'vitest';
import { createReferenceConsensusOracle, type ReferenceSolutionRepository } from './reference-consensus-oracle.js';

const repository: ReferenceSolutionRepository = {
  async getSolutions(problemId) {
    return [
      { problemId, language: 'javascript', sourceCode: 'console.log(6)', contentDigest: 'js-1' },
      { problemId, language: 'python', sourceCode: 'print(6)', contentDigest: 'py-1' },
      { problemId, language: 'java', sourceCode: 'class Main {}', contentDigest: 'java-1' },
    ];
  },
};

describe('reference consensus oracle', () => {
  it('admits two independent agreeing executions without calling them human reviewed', async () => {
    const oracle = createReferenceConsensusOracle({ repository, execute: async ({ language }) => ({
      kind: language === 'java' ? 'compile-error' : 'success', stdout: language === 'javascript' ? '6\n' : '6',
    }) });
    const result = await oracle.resolve({ problemId: 'od-a', candidate: { id: 'c1', input: '3\n1 2 3', rationale: 'boundary', authority: 'candidate' } });
    expect(result).toMatchObject({ output: '6', authority: 'reference-consensus' });
    expect(result?.provenance).toMatchObject({ successfulLanguages: ['javascript', 'python'], attemptedLanguages: ['javascript', 'python', 'java'] });
    expect(result?.evidenceRef).toMatch(/^reference-consensus:od-a:/);
    expect(JSON.stringify(result)).not.toContain('console.log');
  });

  it('rejects disagreement even when two executions succeed', async () => {
    const oracle = createReferenceConsensusOracle({ repository, execute: async ({ language }) => ({ kind: 'success', stdout: language === 'javascript' ? '6' : '7' }) });
    expect(await oracle.resolve({ problemId: 'od-a', candidate: { id: 'c1', input: 'x', rationale: 'boundary', authority: 'candidate' } })).toBeNull();
  });

  it('rejects a single successful implementation', async () => {
    const oracle = createReferenceConsensusOracle({ repository, execute: async ({ language }) => ({ kind: language === 'javascript' ? 'success' : 'compile-error', stdout: '6' }) });
    expect(await oracle.resolve({ problemId: 'od-a', candidate: { id: 'c1', input: 'x', rationale: 'boundary', authority: 'candidate' } })).toBeNull();
  });

  it('caches the same problem, input, and solution digest', async () => {
    let executions = 0;
    const oracle = createReferenceConsensusOracle({ repository, execute: async () => { executions += 1; return { kind: 'success', stdout: '6' }; } });
    const request = { problemId: 'od-a', candidate: { id: 'c1', input: 'x', rationale: 'boundary', authority: 'candidate' as const } };
    await oracle.resolve(request); await oracle.resolve(request);
    expect(executions).toBe(3);
  });
});

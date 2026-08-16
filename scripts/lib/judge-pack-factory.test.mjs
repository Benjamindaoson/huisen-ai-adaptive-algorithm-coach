import { describe, expect, it, vi } from 'vitest';
import { deduplicateCases, generateDifferentialCases, runFourLanguageSmoke, scoreMutations } from './judge-pack-factory.mjs';

const success = (stdout) => ({ kind: 'success', stdout, stderr: '', timeMs: 1 });

describe('judge-pack factory', () => {
  it('executes independent references, retains only consensus cases and removes duplicates', async () => {
    const execute = vi.fn(async ({ sourceCode, stdin }) => sourceCode.includes('bad') && stdin === '2' ? success('999') : success(`${Number(stdin) * 2}\n`));
    const result = await generateDifferentialCases({
      seeds: ['1', '1', '2'],
      references: [
        { id: 'oracle-a', language: 'python', sourceCode: 'good-a' },
        { id: 'oracle-b', language: 'cpp', sourceCode: 'bad-b' },
      ],
      execute,
    });
    expect(result.accepted).toEqual([{ stdin: '1', expectedOutput: '2', oracleIds: ['oracle-a', 'oracle-b'] }]);
    expect(result.disagreements).toEqual([{ stdinHash: expect.stringMatching(/^[a-f0-9]{64}$/), oracleOutputs: ['4', '999'] }]);
    expect(execute).toHaveBeenCalledTimes(4);
  });

  it('kills wrong mutants against the consensus suite and reports an exact score', async () => {
    const cases = [{ stdin: '1', expectedOutput: '2' }, { stdin: '2', expectedOutput: '4' }];
    const execute = vi.fn(async ({ sourceCode, stdin }) => sourceCode === 'survivor' ? success(`${Number(stdin) * 2}`) : success(`${Number(stdin) + 1}`));
    expect(await scoreMutations({ language: 'python', mutants: [{ id: 'killed', sourceCode: 'wrong' }, { id: 'survivor', sourceCode: 'survivor' }], cases, execute }))
      .toEqual({ killed: 1, total: 2, score: 0.5, survivors: ['survivor'] });
  });

  it('requires all four reference languages to pass every smoke case', async () => {
    const solutions = Object.fromEntries(['python', 'javascript', 'java', 'cpp'].map((language) => [language, `${language}-solution`]));
    const execute = vi.fn(async ({ language, stdin }) => language === 'java' && stdin === '2' ? { kind: 'runtime-error', stdout: '', stderr: 'boom' } : success(`${Number(stdin) * 2}`));
    const result = await runFourLanguageSmoke({ solutions, cases: [{ stdin: '1', expectedOutput: '2' }, { stdin: '2', expectedOutput: '4' }], execute });
    expect(result).toEqual({ python: 'passed', javascript: 'passed', java: 'failed', cpp: 'passed' });
  });

  it('deduplicates normalized input/output pairs without exposing them in identities', () => {
    const result = deduplicateCases([{ stdin: 'x\r\n', expectedOutput: 'y\n' }, { stdin: 'x\n', expectedOutput: 'y' }]);
    expect(result.cases).toHaveLength(1);
    expect(result.duplicates).toEqual([{ inputHash: expect.stringMatching(/^[a-f0-9]{64}$/), expectedHash: expect.stringMatching(/^[a-f0-9]{64}$/) }]);
    expect(JSON.stringify(result.duplicates)).not.toContain('"stdin"');
    expect(JSON.stringify(result.duplicates)).not.toContain('"expectedOutput"');
  });
});

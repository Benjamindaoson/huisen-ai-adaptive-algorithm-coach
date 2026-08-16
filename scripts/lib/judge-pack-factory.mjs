import { createHash } from 'node:crypto';

const LANGUAGES = ['python', 'javascript', 'java', 'cpp'];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const normalize = (value) => String(value ?? '').replace(/\r\n?/g, '\n').split('\n').map((line) => line.replace(/[\t ]+$/g, '')).join('\n').replace(/\n+$/g, '');

export function deduplicateCases(inputCases) {
  const seen = new Set(); const cases = []; const duplicates = [];
  for (const candidate of inputCases) {
    const stdin = normalize(candidate.stdin); const expectedOutput = normalize(candidate.expectedOutput);
    const identity = { inputHash: sha256(stdin), expectedHash: sha256(expectedOutput) };
    const key = `${identity.inputHash}:${identity.expectedHash}`;
    if (seen.has(key)) duplicates.push(identity);
    else { seen.add(key); cases.push({ ...candidate, stdin, expectedOutput }); }
  }
  return { cases, duplicates };
}

export async function generateDifferentialCases({ seeds, references, execute }) {
  if (!Array.isArray(references) || references.length < 2) throw new Error('At least two independent references are required');
  const uniqueSeeds = [...new Map(seeds.map((stdin) => [normalize(stdin), normalize(stdin)])).values()];
  const accepted = []; const disagreements = [];
  for (const stdin of uniqueSeeds) {
    const results = [];
    for (const reference of references) results.push(await execute({ language: reference.language, sourceCode: reference.sourceCode, stdin }));
    const outputs = results.map((result) => result.kind === 'success' ? normalize(result.stdout) : `__${result.kind}__`);
    if (results.every((result) => result.kind === 'success') && new Set(outputs).size === 1) accepted.push({ stdin, expectedOutput: outputs[0], oracleIds: references.map((item) => item.id) });
    else disagreements.push({ stdinHash: sha256(stdin), oracleOutputs: outputs });
  }
  return { accepted, disagreements };
}

export async function scoreMutations({ language, mutants, cases, execute }) {
  const survivors = [];
  for (const mutant of mutants) {
    let killed = false;
    for (const testCase of cases) {
      const result = await execute({ language, sourceCode: mutant.sourceCode, stdin: testCase.stdin });
      if (result.kind !== 'success' || normalize(result.stdout) !== normalize(testCase.expectedOutput)) { killed = true; break; }
    }
    if (!killed) survivors.push(mutant.id);
  }
  const killed = mutants.length - survivors.length;
  return { killed, total: mutants.length, score: mutants.length ? Number((killed / mutants.length).toFixed(4)) : 0, survivors };
}

export async function runFourLanguageSmoke({ solutions, cases, execute }) {
  const status = {};
  for (const language of LANGUAGES) {
    const sourceCode = solutions[language];
    let passed = typeof sourceCode === 'string' && sourceCode.trim().length > 0;
    for (const testCase of passed ? cases : []) {
      const result = await execute({ language, sourceCode, stdin: testCase.stdin });
      if (result.kind !== 'success' || normalize(result.stdout) !== normalize(testCase.expectedOutput)) { passed = false; break; }
    }
    status[language] = passed ? 'passed' : 'failed';
  }
  return status;
}

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

function runNode(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('node', args, { cwd: root, stdio: 'ignore' });
    child.once('error', reject);
    child.once('exit', (code) => resolveRun(code));
  });
}

describe('mentor quality v2 command', () => {
  it('writes a machine-readable report and exits non-zero while the real-case release gate is red', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mentor-gate-'));
    try {
      const sourceCode = 'console.log(values[values.length]);';
      const benchmarkPath = join(directory, 'benchmark.json');
      const outputPath = join(directory, 'report.json');
      const provenancePath = join(directory, 'provenance.json');
      await writeFile(provenancePath, JSON.stringify({ version: 1, cases: [{
        id: 'public-pending-1', language: 'python', learnerBand: 'unknown',
        attempt: { id: 'public-a1', sourceCode: 'print(1)', sourceHash: createHash('sha256').update('print(1)').digest('hex') },
        execution: { verdict: 'wrong-answer', refs: ['metadata:1'] },
        provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/data', license: 'CDLA-Permissive-2.0' },
        adjudication: { status: 'pending' }, prohibitedFragments: [],
      }] }), 'utf8');
      await writeFile(benchmarkPath, JSON.stringify({
        version: 2,
        name: 'gate-test',
        thresholds: { lineLocalizationAccuracy: 0, misconceptionAccuracy: 0, evidenceSufficiency: 0, minimalHintEffectiveness: 0, answerLeakageRate: 1, falseConclusionRate: 1 },
        releaseGate: { minimumEligibleRealCases: 100, requiredCoverage: { languages: ['javascript'], learnerBands: ['beginner'], errorFamilies: ['boundary'], verdicts: ['wrong-answer'] } },
        cases: [{
          id: 'synthetic-1', language: 'javascript', learnerBand: 'beginner',
          attempt: { id: 'attempt-1', sourceCode, sourceHash: createHash('sha256').update(sourceCode).digest('hex') },
          execution: { verdict: 'wrong-answer', refs: ['run:1'] },
          provenance: { origin: 'synthetic-mutation', sourceUrl: 'local://seed/1', license: 'CC0-1.0' },
          adjudication: { status: 'teacher-adjudicated', reviewerId: 'teacher-1', completedAt: '2026-08-12T00:00:00.000Z' },
          expected: { errorFamily: 'boundary', misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary' }, prohibitedFragments: [],
        }],
        baselinePredictions: [{ caseId: 'synthetic-1', misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary', hint: 'Trace the index.', conclusion: { confidence: 'high', evidenceRefs: ['run:1'] } }],
      }), 'utf8');

      const result = await runNode(['scripts/check-mentor-quality-v2.mjs', '--benchmark', benchmarkPath, '--provenance', provenancePath, '--output', outputPath]);
      const report = JSON.parse(await readFile(outputPath, 'utf8'));

      expect(result).toBe(1);
      expect(report.releaseGate).toMatchObject({ passed: false, failures: expect.arrayContaining(['eligible-real-cases: 0/100']) });
      expect(report.publicDataset).toMatchObject({ imported: 1, pendingAdjudication: 1, eligible: 0 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('counts a real case only after separate hash-bound teacher gold and Mentor prediction artifacts exist', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mentor-gate-reviewed-'));
    try {
      const sourceCode = 'print(1)';
      const sourceHash = createHash('sha256').update(sourceCode).digest('hex');
      const benchmarkPath = join(directory, 'benchmark.json');
      const provenancePath = join(directory, 'provenance.json');
      const adjudicationsPath = join(directory, 'adjudications.json');
      const predictionsPath = join(directory, 'predictions.json');
      const outputPath = join(directory, 'report.json');
      await writeFile(benchmarkPath, JSON.stringify({
        version: 2, name: 'reviewed-gate-test',
        thresholds: { lineLocalizationAccuracy: 0, misconceptionAccuracy: 0, evidenceSufficiency: 0, minimalHintEffectiveness: 0, answerLeakageRate: 1, falseConclusionRate: 1 },
        releaseGate: { minimumEligibleRealCases: 1, requiredCoverage: { languages: ['python'], learnerBands: ['beginner'], errorFamilies: ['output'], verdicts: ['wrong-answer'] } },
        cases: [{
          id: 'synthetic-seed', language: 'python', learnerBand: 'beginner', attempt: { id: 'seed-attempt', sourceCode: 'print(0)', sourceHash: createHash('sha256').update('print(0)').digest('hex') },
          execution: { verdict: 'wrong-answer', refs: ['run:seed'] }, provenance: { origin: 'synthetic-mutation', sourceUrl: 'local://seed', license: 'CC0-1.0' },
          adjudication: { status: 'teacher-adjudicated', reviewerId: 'seed', completedAt: '2026-08-12T00:00:00.000Z' },
          expected: { errorFamily: 'output', misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output' }, prohibitedFragments: [],
        }],
        baselinePredictions: [{ caseId: 'synthetic-seed', misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output', hint: 'Predict.', conclusion: { confidence: 'low', evidenceRefs: ['run:seed'] } }],
      }), 'utf8');
      await writeFile(provenancePath, JSON.stringify({ version: 1, cases: [{
        id: 'public-reviewed-1', language: 'python', learnerBand: 'unknown', attempt: { id: 'public-a1', sourceCode, sourceHash },
        execution: { verdict: 'wrong-answer', refs: ['judge:failed-case:1'] }, provenance: { origin: 'public-dataset', sourceUrl: 'https://example.test/data', license: 'MIT' },
        adjudication: { status: 'pending' }, prohibitedFragments: [],
      }] }), 'utf8');
      await writeFile(adjudicationsPath, JSON.stringify({ version: 1, records: [{
        caseId: 'public-reviewed-1', sourceHash, reviewer: { id: 'teacher-1', role: 'teacher', attested: true }, completedAt: '2026-08-12T08:00:00.000Z', learnerBand: 'beginner',
        reviewedEvidenceRefs: ['judge:failed-case:1'], expected: { errorFamily: 'output', misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output' }, prohibitedFragments: [],
      }] }), 'utf8');
      await writeFile(predictionsPath, JSON.stringify({ version: 1, predictions: [{
        caseId: 'public-reviewed-1', misconception: 'hardcoded-output', lines: [1], hintIntent: 'predict-output', hint: 'Predict the output first.', conclusion: { confidence: 'high', evidenceRefs: ['judge:failed-case:1'] },
      }] }), 'utf8');

      const result = await runNode(['scripts/check-mentor-quality-v2.mjs', '--benchmark', benchmarkPath, '--provenance', provenancePath, '--adjudications', adjudicationsPath, '--predictions', predictionsPath, '--output', outputPath]);
      const report = JSON.parse(await readFile(outputPath, 'utf8'));

      expect(result).toBe(0);
      expect(report).toMatchObject({ eligibleRealCaseCount: 1, teacherAdjudicatedCaseCount: 2, releaseGate: { passed: true } });
      expect(report.publicDataset).toMatchObject({ imported: 1, pendingAdjudication: 0, eligible: 1 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

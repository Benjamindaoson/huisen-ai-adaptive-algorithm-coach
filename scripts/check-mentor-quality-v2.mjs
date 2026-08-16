import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateMentorBenchmarkV2, validateMentorProvenanceManifest } from './lib/mentor-benchmark-v2.mjs';
import { applyTeacherAdjudications, mergeMentorPredictions, validateTeacherAdjudicationManifest } from './lib/mentor-adjudication.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('Usage: node scripts/check-mentor-quality-v2.mjs [--benchmark <path>] [--provenance <path>] [--adjudications <path>] [--predictions <path>] [--output <path>]');
    options[key.slice(2)] = value;
  }
  return options;
}

const options = readArgs(process.argv.slice(2));
const benchmarkPath = resolve(options.benchmark ?? 'quality/mentor-diagnosis-v2.json');
const outputPath = resolve(options.output ?? 'docs/quality/mentor-diagnosis-v2-report.json');
const provenancePath = resolve(options.provenance ?? 'quality/provenance/mentor-cases.json');
const adjudicationsPath = resolve(options.adjudications ?? 'quality/mentor-adjudications-v1.json');
const predictionsPath = resolve(options.predictions ?? 'quality/mentor-predictions-v2.json');
const benchmark = JSON.parse(await readFile(benchmarkPath, 'utf8'));
if (!Array.isArray(benchmark.baselinePredictions)) throw new Error('Mentor v2 benchmark requires baselinePredictions');
let provenance = { version: 1, cases: [] };
try {
  provenance = validateMentorProvenanceManifest(JSON.parse(await readFile(provenancePath, 'utf8')));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
let adjudications = { version: 1, records: [] };
try {
  adjudications = validateTeacherAdjudicationManifest(JSON.parse(await readFile(adjudicationsPath, 'utf8')));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const adjudicatedProvenance = applyTeacherAdjudications(provenance, adjudications);
let addedPredictions = [];
try {
  const manifest = JSON.parse(await readFile(predictionsPath, 'utf8'));
  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.predictions)) throw new Error('Invalid Mentor prediction manifest');
  addedPredictions = manifest.predictions;
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const combined = { ...benchmark, cases: [...benchmark.cases, ...adjudicatedProvenance.cases] };
const predictions = mergeMentorPredictions(benchmark.baselinePredictions, addedPredictions, new Set(combined.cases.map((item) => item.id)));
const publicCases = adjudicatedProvenance.cases.filter((item) => item.provenance.origin === 'public-dataset');
const report = {
  ...evaluateMentorBenchmarkV2(combined, predictions),
  publicDataset: {
    imported: publicCases.length,
    pendingAdjudication: publicCases.filter((item) => item.adjudication.status === 'pending').length,
    eligible: publicCases.filter((item) => item.adjudication.status === 'teacher-adjudicated').length,
  },
  adjudication: { imported: adjudications.records.length, predictionCount: addedPredictions.length },
  generatedFrom: [benchmarkPath, ...(provenance.cases.length ? [provenancePath] : []), ...(adjudications.records.length ? [adjudicationsPath] : []), ...(addedPredictions.length ? [predictionsPath] : [])],
  caveat: 'Synthetic regression fixtures are never counted as real evidence. This report stays release-gate red until 100 eligible, teacher-adjudicated public or first-party cases cover every required segment.',
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Mentor v2: ${report.fixtureCount} scored, ${report.eligibleRealCaseCount}/${report.releaseGate.minimumEligibleRealCases} eligible real, gate ${report.releaseGate.passed ? 'green' : 'red'}`);
if (!report.releaseGate.passed) process.exitCode = 1;

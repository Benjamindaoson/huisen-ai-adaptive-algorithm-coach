import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateMentorBenchmark } from './lib/mentor-benchmark.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const benchmarkPath = resolve(root, 'quality/mentor-diagnosis-v1.json');
const predictionPath = resolve(root, 'quality/mentor-predictions-v1.json');
const outputPath = resolve(root, 'docs/quality/mentor-diagnosis-report.json');

const benchmark = JSON.parse(await readFile(benchmarkPath, 'utf8'));
const predictions = JSON.parse(await readFile(predictionPath, 'utf8'));
const report = {
  ...evaluateMentorBenchmark(benchmark, predictions),
  generatedFrom: ['quality/mentor-diagnosis-v1.json', 'quality/mentor-predictions-v1.json'],
  maturity: benchmark.cases.length >= 100 ? 'release-gate' : 'seed-baseline',
  caveat: 'Seed fixtures verify the evaluation pipeline; they are not evidence of live-model effectiveness on real learners.',
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Mentor benchmark: ${report.fixtureCount} fixtures, misconception ${(report.metrics.misconceptionAccuracy * 100).toFixed(1)}%, line ${(report.metrics.lineAccuracy * 100).toFixed(1)}%, maturity ${report.maturity}`);

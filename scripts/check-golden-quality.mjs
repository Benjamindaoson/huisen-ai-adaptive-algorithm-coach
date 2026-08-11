import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildGoldenQuality } from './lib/golden-quality.mjs';

const reviewedIds = new Set(['od-71a5033ee94c', 'od-b53d53c3e9d3', 'od-f5d47011b9f8', 'od-5e34daac53f3']);
const contentRoot = join(process.cwd(), 'content');
const catalog = JSON.parse(await readFile(join(contentRoot, 'index.json'), 'utf8')).problems;
const records = new Map();
for (const id of reviewedIds) {
  records.set(id, JSON.parse(await readFile(join(contentRoot, 'problems', `${id}.json`), 'utf8')));
}
const result = buildGoldenQuality(catalog, records, reviewedIds, 100);
await writeFile(join(contentRoot, 'golden-100.json'), `${JSON.stringify({ version: 1, problems: result.annotations }, null, 2)}\n`, 'utf8');
const reportDirectory = join(process.cwd(), 'docs', 'quality');
await mkdir(reportDirectory, { recursive: true });
await writeFile(join(reportDirectory, 'golden-100-report.json'), `${JSON.stringify(result.report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result.report, null, 2));
if (!result.report.pass) process.exitCode = 1;

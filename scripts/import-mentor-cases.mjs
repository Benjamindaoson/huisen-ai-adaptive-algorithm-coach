import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMentorProvenanceManifest } from './lib/mentor-benchmark-v2.mjs';

const LANGUAGE_MAP = new Map([
  ['javascript', 'javascript'], ['javascript (node.js)', 'javascript'], ['python', 'python'], ['python3', 'python'],
  ['java', 'java'], ['c++', 'cpp'], ['cpp', 'cpp'], ['c++17', 'cpp'],
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isLocalPath(value) {
  return typeof value === 'string' && value.length > 0 && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; } else if (character === '"') quoted = false; else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(value); value = ''; }
    else if (character === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = ''; }
    else value += character;
  }
  if (value.length > 0 || row.length > 0) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  const [header, ...body] = rows;
  if (!header || header.length === 0) return [];
  return body.filter((cells) => cells.some((cell) => cell.length > 0)).map((cells) => Object.fromEntries(header.map((column, index) => [column.trim(), (cells[index] ?? '').trim()])));
}

function normalizeLanguage(value) {
  return LANGUAGE_MAP.get(value.trim().toLocaleLowerCase('en-US'));
}

function normalizeVerdict(value) {
  const normalized = value.trim().toLocaleLowerCase('en-US').replace(/[_\s]+/g, '-');
  const map = new Map([
    ['accepted', 'accepted'], ['wrong-answer', 'wrong-answer'], ['runtime-error', 'runtime-error'], ['compile-error', 'compile-error'], ['time-limit-exceeded', 'timeout'], ['timeout', 'timeout'],
  ]);
  return map.get(normalized) ?? 'other';
}

function safeSegment(value, label) {
  if (!/^[a-zA-Z0-9_.+-]+$/.test(value ?? '')) throw new Error(`Invalid local CodeNet ${label}`);
  return value;
}

async function csvFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && extname(entry.name).toLocaleLowerCase('en-US') === '.csv').map((entry) => join(directory, entry.name));
}

async function readManifest(outputPath) {
  try {
    const existing = JSON.parse(await readFile(outputPath, 'utf8'));
    return validateMentorProvenanceManifest(existing);
  } catch (error) {
    if (error?.code === 'ENOENT') return { version: 1, cases: [] };
    throw error;
  }
}

export async function importMentorCases(options) {
  const { metadataDir, sourceRoot, outputPath, sourceUrl, license } = options ?? {};
  if (![metadataDir, sourceRoot, outputPath].every(isLocalPath)) throw new Error('Mentor case importer accepts local metadata, source, and output paths only');
  if (typeof sourceUrl !== 'string' || !/^https?:\/\//i.test(sourceUrl) || typeof license !== 'string' || license.trim().length === 0) throw new Error('Mentor case importer requires source URL and license provenance');
  const resolvedMetadataDir = resolve(metadataDir);
  const resolvedSourceRoot = resolve(sourceRoot);
  const resolvedOutputPath = resolve(outputPath);
  if (!isAbsolute(resolvedMetadataDir) || !isAbsolute(resolvedSourceRoot) || !isAbsolute(resolvedOutputPath)) throw new Error('Mentor case importer requires local paths');
  const manifest = await readManifest(resolvedOutputPath);
  const hashes = new Set(manifest.cases.map((item) => item.attempt.sourceHash));
  let imported = 0;
  let duplicates = 0;
  let skippedMissingSource = 0;
  for (const filePath of await csvFiles(resolvedMetadataDir)) {
    const records = parseCsv(await readFile(filePath, 'utf8'));
    for (const record of records) {
      const submissionId = safeSegment(record.submission_id, 'submission id');
      const problemId = safeSegment(record.problem_id, 'problem id');
      const originalLanguage = safeSegment(record.language, 'language');
      const extension = safeSegment(record.filename_ext || 'txt', 'extension');
      const language = normalizeLanguage(originalLanguage);
      if (!language) continue;
      const sourcePath = join(resolvedSourceRoot, problemId, originalLanguage, `${submissionId}.${extension}`);
      let sourceCode;
      try { sourceCode = await readFile(sourcePath, 'utf8'); } catch (error) { if (error?.code === 'ENOENT') { skippedMissingSource += 1; continue; } throw error; }
      const sourceHash = sha256(sourceCode);
      if (hashes.has(sourceHash)) { duplicates += 1; continue; }
      hashes.add(sourceHash);
      const lineNumber = records.indexOf(record) + 2;
      manifest.cases.push({
        id: `codenet-${problemId}-${submissionId}`,
        language,
        learnerBand: 'unknown',
        attempt: { id: `codenet-${submissionId}`, sourceCode, sourceHash },
        execution: { verdict: normalizeVerdict(record.status), refs: [`metadata:${filePath}:${lineNumber}`] },
        provenance: { origin: 'public-dataset', sourceUrl, license },
        adjudication: { status: 'pending' },
        prohibitedFragments: [],
      });
      imported += 1;
    }
  }
  validateMentorProvenanceManifest(manifest);
  await mkdir(dirname(resolvedOutputPath), { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { imported, duplicates, skippedMissingSource, totalCases: manifest.cases.length, outputPath: resolvedOutputPath };
}

export function readArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error('Usage: node scripts/import-mentor-cases.mjs --metadata-dir <local-dir> --source-root <local-dir> --output <local-file> --source-url <https-url> --license <license>');
    result[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  if (result.output !== undefined) {
    result.outputPath = result.output;
    delete result.output;
  }
  return result;
}

const invokedDirectly = resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const result = await importMentorCases(readArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result));
}

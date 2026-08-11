import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import mammoth from 'mammoth';
import { parseDocumentText } from './document-parser.mjs';
import { parseHtmlProblem } from './html-parser.mjs';
import { createBodyHash, createProblemId, deriveMetadata } from './metadata.mjs';
import { buildProblemIntelligenceReport, classifyProblem } from './problem-intelligence.mjs';

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

async function parseDocumentProblem(filePath, metadata) {
  const { value } = await mammoth.extractRawText({ path: filePath });
  const record = parseDocumentText(value, metadata);
  record.legacyId = createProblemId({
    title: metadata.title,
    sections: { description: value.replace(/\s+/g, ' ').trim(), examples: [] },
    solutions: {},
  });
  return record;
}

function addVariantTags(records) {
  const titleCounts = new Map();
  for (const record of records) titleCounts.set(record.title, (titleCounts.get(record.title) ?? 0) + 1);
  for (const record of records) {
    if (titleCounts.get(record.title) > 1) record.tags.push('variant-candidate');
  }
}

function makeIndexEntry(record, duplicateCount) {
  const searchText = [
    record.title,
    record.collection,
    ...record.tags,
    ...(record.skills ?? []),
    ...Object.values(record.sections).filter((value) => typeof value === 'string'),
    ...record.sections.examples,
    ...Object.values(record.solutions),
  ].join('\n');

  return {
    id: record.id,
    title: record.title,
    collection: record.collection,
    score: record.score,
    tags: record.tags,
    languages: Object.keys(record.solutions).sort(),
    completeness: record.completeness,
    sourcePaths: record.sourcePaths,
    duplicateCount,
    skills: record.skills,
    classification: record.classification,
    quality: record.quality,
    excerpt: (record.sections.description ?? '').slice(0, 240),
    searchText,
  };
}

export async function buildCorpus({ archiveRoot, contentRoot, goldenAnnotations = [] }) {
  const files = await listFiles(archiveRoot);
  const resolvedContentRoot = resolve(contentRoot);
  const problemsDirectory = resolve(contentRoot, 'problems');

  if (
    basename(problemsDirectory) !== 'problems' ||
    dirname(problemsDirectory) !== resolvedContentRoot
  ) {
    throw new Error('Refusing to clear an unexpected generated problems directory.');
  }

  await rm(problemsDirectory, { recursive: true, force: true });
  await mkdir(problemsDirectory, { recursive: true });
  const parsed = [];

  for (const filePath of files.sort()) {
    const extension = extname(filePath).toLowerCase();
    if (!['.html', '.htm', '.docx'].includes(extension)) continue;
    const sourcePath = relative(archiveRoot, filePath).replaceAll('\\', '/');
    const metadata = deriveMetadata(sourcePath);
    const record = extension === '.docx'
      ? await parseDocumentProblem(filePath, metadata)
      : await parseHtmlProblem(filePath, metadata);
    if (extension !== '.docx') {
      const legacyRecord = await parseHtmlProblem(filePath, metadata, { stripLineNumberArtifacts: false });
      record.legacyId = createProblemId(legacyRecord);
    }
    record.sourcePaths = [sourcePath];
    parsed.push(record);
  }

  const duplicateGroups = new Map();
  for (const record of parsed) {
    const bodyHash = createBodyHash(record);
    const group = duplicateGroups.get(bodyHash) ?? [];
    group.push(record);
    duplicateGroups.set(bodyHash, group);
  }

  const canonicalRecords = [];
  const duplicateCounts = new Map();
  const legacyIds = new Map();
  for (const group of duplicateGroups.values()) {
    const sortedGroup = [...group].sort((left, right) => {
      if (left.completeness !== right.completeness) return left.completeness === 'complete' ? -1 : 1;
      return left.sourcePaths[0].localeCompare(right.sourcePaths[0], 'zh-Hans-CN');
    });
    const canonical = sortedGroup[0];
    canonical.sourcePaths = sortedGroup.flatMap((record) => record.sourcePaths).sort();
    canonical.sourceKinds = [...new Set(sortedGroup.flatMap((record) => record.sourceKinds))].sort();
    canonical.id = createProblemId(canonical);
    canonicalRecords.push(canonical);
    duplicateCounts.set(canonical.id, group.length - 1);
    legacyIds.set(canonical.id, group.map((record) => record.legacyId).filter(Boolean));
  }

  addVariantTags(canonicalRecords);
  canonicalRecords.sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'));
  const annotationById = new Map(goldenAnnotations.filter((item) => item?.id).map((item) => [item.id, item]));
  const annotationByTitle = new Map(goldenAnnotations.filter((item) => !item?.id && item?.title).map((item) => [item.title, item]));
  for (const record of canonicalRecords) {
    Object.assign(record, classifyProblem(record, annotationById.get(record.id) ?? annotationByTitle.get(record.title)));
  }
  const aliases = {};
  for (const record of canonicalRecords) {
    const { legacyId: unusedLegacyId, ...serializableRecord } = record;
    await writeFile(join(problemsDirectory, `${record.id}.json`), `${JSON.stringify(serializableRecord, null, 2)}\n`, 'utf8');
    for (const legacyId of legacyIds.get(record.id) ?? []) {
      if (legacyId !== record.id) aliases[legacyId] = record.id;
    }
  }

  const index = {
    version: 1,
    problems: canonicalRecords.map((record) => makeIndexEntry(record, duplicateCounts.get(record.id) ?? 0)),
  };
  await mkdir(contentRoot, { recursive: true });
  await writeFile(join(contentRoot, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await writeFile(join(contentRoot, 'aliases.json'), `${JSON.stringify(aliases, null, 2)}\n`, 'utf8');
  await writeFile(join(contentRoot, 'problem-intelligence-report.json'), `${JSON.stringify(buildProblemIntelligenceReport(canonicalRecords), null, 2)}\n`, 'utf8');

  return {
    total: canonicalRecords.length,
    complete: canonicalRecords.filter((record) => record.completeness === 'complete').length,
    indexOnly: canonicalRecords.filter((record) => record.completeness === 'index-only').length,
    exactDuplicates: parsed.length - canonicalRecords.length,
  };
}

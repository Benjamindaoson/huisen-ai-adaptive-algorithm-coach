import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';
import { buildCorpus } from '../lib/build-corpus.mjs';

const fixturePath = fileURLToPath(new URL('./fixtures/problem.html', import.meta.url));
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test('buildCorpus writes a searchable catalog and canonical problem record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-corpus-'));
  temporaryDirectories.push(root);
  const archiveRoot = join(root, 'archive', 'original', 'ABCD卷');
  const contentRoot = join(root, 'content');
  await mkdir(archiveRoot, { recursive: true });
  await cp(fixturePath, join(archiveRoot, '(A卷,100分)- IPv4地址转换成整数（Java & Python & JS）.html'));

  const summary = await buildCorpus({
    archiveRoot: join(root, 'archive', 'original'),
    contentRoot,
    goldenAnnotations: [{ title: 'IPv4地址转换成整数', skills: ['math'], reviewStatus: 'candidate' }],
  });
  const index = JSON.parse(await readFile(join(contentRoot, 'index.json'), 'utf8'));
  const intelligenceReport = JSON.parse(await readFile(join(contentRoot, 'problem-intelligence-report.json'), 'utf8'));

  expect(summary).toMatchObject({ total: 1, complete: 1, exactDuplicates: 0 });
  expect(index.problems[0]).toMatchObject({
    title: 'IPv4地址转换成整数', score: 100, languages: ['python'], skills: ['math'],
    classification: { source: 'candidate' }, quality: { practiceReady: true },
  });
  expect(index.problems[0].searchText).toContain('虚拟 IPv4');
  expect(index.problems[0].searchText).toContain('math');
  expect(intelligenceReport).toMatchObject({ total: 1, classified: 1, explicit: 1, inferred: 0, practiceReady: 1 });
  expect(JSON.parse(await readFile(join(contentRoot, 'problems', `${index.problems[0].id}.json`), 'utf8')).sections.description).toContain('虚拟 IPv4');
  expect(Object.keys(JSON.parse(await readFile(join(contentRoot, 'aliases.json'), 'utf8')))).toHaveLength(1);
});

test('buildCorpus removes stale generated problem records before writing a new catalog', async () => {
  const root = await mkdtemp(join(tmpdir(), 'od-corpus-'));
  temporaryDirectories.push(root);
  const archiveRoot = join(root, 'archive', 'original', 'ABCD卷');
  const contentRoot = join(root, 'content');
  await mkdir(join(contentRoot, 'problems'), { recursive: true });
  await writeFile(join(contentRoot, 'problems', 'orphan.json'), '{}', 'utf8');
  await mkdir(archiveRoot, { recursive: true });
  await cp(fixturePath, join(archiveRoot, '(A卷,100分)- IPv4地址转换成整数（Java & Python & JS）.html'));

  await buildCorpus({ archiveRoot: join(root, 'archive', 'original'), contentRoot });

  await expect(readFile(join(contentRoot, 'problems', 'orphan.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
});

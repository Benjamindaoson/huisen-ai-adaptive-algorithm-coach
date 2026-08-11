import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { archiveSources } from '../lib/source-files.mjs';

const temporaryDirectories = [];

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'od-archive-'));
  temporaryDirectories.push(root);
  await mkdir(join(root, 'set'), { recursive: true });
  await writeFile(join(root, 'set', 'a.html'), '<h1>A</h1>', 'utf8');
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test('archiveSources preserves relative paths and records content hashes', async () => {
  const root = await createFixture();
  const archiveRoot = join(root, 'archive', 'original');

  const manifest = await archiveSources({ root, archiveRoot, sourceRoots: ['set'] });

  expect(manifest.files).toEqual([
    {
      relativePath: 'set/a.html',
      size: 10,
      sha256: createHash('sha256').update('<h1>A</h1>').digest('hex'),
    },
  ]);
  expect(await readFile(join(archiveRoot, 'set', 'a.html'), 'utf8')).toBe('<h1>A</h1>');
});

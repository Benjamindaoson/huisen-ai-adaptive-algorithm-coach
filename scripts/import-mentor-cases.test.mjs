import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importMentorCases, readArgs } from './import-mentor-cases.mjs';

describe('local CodeNet-style mentor-case importer', () => {
  it('imports local metadata and source once, preserves verdict, and leaves teacher gold labels pending', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mentor-cases-'));
    try {
      const metadataDir = join(root, 'metadata');
      const sourceRoot = join(root, 'data');
      await mkdir(metadataDir, { recursive: true });
      await mkdir(join(sourceRoot, 'p00001', 'Python'), { recursive: true });
      await mkdir(join(sourceRoot, 'p00001', 'C++'), { recursive: true });
      await writeFile(join(metadataDir, 'p00001.csv'), 'submission_id,problem_id,user_id,language,filename_ext,status\ns0001,p00001,u1,Python,py,Wrong Answer\ns0002,p00001,u2,Python,py,Wrong Answer\ns0003,p00001,u3,C++,cpp,Time Limit Exceeded\n', 'utf8');
      const source = 'print(input.split())\n';
      await writeFile(join(sourceRoot, 'p00001', 'Python', 's0001.py'), source, 'utf8');
      await writeFile(join(sourceRoot, 'p00001', 'Python', 's0002.py'), source, 'utf8');
      await writeFile(join(sourceRoot, 'p00001', 'C++', 's0003.cpp'), 'int main() {}\n', 'utf8');

      const outputPath = join(root, 'provenance.json');
      const report = await importMentorCases({
        metadataDir,
        sourceRoot,
        outputPath,
        sourceUrl: 'https://github.com/IBM/Project_CodeNet',
        license: 'CDLA-Permissive-2.0',
      });
      const manifest = JSON.parse(await readFile(outputPath, 'utf8'));

      expect(report).toMatchObject({ imported: 2, duplicates: 1, skippedMissingSource: 0 });
      expect(manifest.cases).toHaveLength(2);
      expect(manifest.cases[0]).toMatchObject({
        language: 'python',
        execution: { verdict: 'wrong-answer' },
        adjudication: { status: 'pending' },
        provenance: { origin: 'public-dataset', sourceUrl: 'https://github.com/IBM/Project_CodeNet', license: 'CDLA-Permissive-2.0' },
        attempt: { sourceHash: createHash('sha256').update(source).digest('hex') },
      });
      expect(manifest.cases[0]).not.toHaveProperty('expected');
      expect(manifest.cases[1]).toMatchObject({ language: 'cpp', execution: { verdict: 'timeout' } });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects non-local paths instead of downloading a dataset', async () => {
    await expect(importMentorCases({
      metadataDir: 'https://example.test/metadata',
      sourceRoot: 'https://example.test/data',
      outputPath: join(tmpdir(), 'unused-mentor-cases.json'),
      sourceUrl: 'https://example.test/source',
      license: 'Apache-2.0',
    })).rejects.toThrow(/local/i);
  });

  it('maps the documented --output CLI flag to outputPath', () => {
    expect(readArgs(['--metadata-dir', 'metadata', '--source-root', 'data', '--output', 'cases.json', '--source-url', 'https://example.test', '--license', 'CDLA-Permissive-2.0'])).toMatchObject({ outputPath: 'cases.json' });
  });
});

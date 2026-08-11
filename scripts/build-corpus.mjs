import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildCorpus } from './lib/build-corpus.mjs';

const root = process.cwd();
let goldenAnnotations = [];
try {
  const manifest = JSON.parse(await readFile(join(root, 'content', 'golden-100.json'), 'utf8'));
  goldenAnnotations = Array.isArray(manifest?.problems) ? manifest.problems : [];
} catch {
  // The first corpus build has no Golden manifest yet; all entries remain honestly inferred.
}
const summary = await buildCorpus({
  archiveRoot: join(root, 'archive', 'original'),
  contentRoot: join(root, 'content'),
  goldenAnnotations,
});

console.log(JSON.stringify(summary, null, 2));

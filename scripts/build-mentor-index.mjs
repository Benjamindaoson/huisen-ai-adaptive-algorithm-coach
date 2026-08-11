import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMentorIndex } from './lib/mentor-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problemsDir = path.join(root, 'content', 'problems');
const files = (await readdir(problemsDir)).filter((name) => name.endsWith('.json')).sort();
const problems = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(problemsDir, name), 'utf8'))));
const index = buildMentorIndex(problems);
await writeFile(path.join(root, 'content', 'mentor-index.json'), `${JSON.stringify(index)}\n`, 'utf8');
console.log(JSON.stringify({ problems: index.problemCount, documents: index.documentCount }, null, 2));

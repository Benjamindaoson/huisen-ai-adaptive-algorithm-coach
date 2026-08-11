import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { archiveSources } from './lib/source-files.mjs';

const root = process.cwd();
const archiveRoot = join(root, 'archive', 'original');
const sourceRoots = [
  'ABCD卷',
  '2025 E卷-2025A卷',
  '2025B卷',
  '2025.12月-2026.3月【双机位C卷】',
  '2026.4月-7月【新系统机试】真题-持续更新',
  '刷前必看⭐️刷题攻略.docx',
  '在线oj.docx',
  '机考技术面辅导+助力offer.pdf',
];

const manifest = await archiveSources({ root, archiveRoot, sourceRoots });
await mkdir(archiveRoot, { recursive: true });
await writeFile(
  join(archiveRoot, '.manifest.json'),
  `${JSON.stringify({ version: 1, files: manifest.files }, null, 2)}\n`,
  'utf8',
);
console.log(`Archived ${manifest.files.length} files to ${archiveRoot}`);

import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';

function normalize(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

export function deriveMetadata(relativePath) {
  const normalizedPath = relativePath.replaceAll('\\', '/');
  const [collection = '未分类'] = normalizedPath.split('/');
  const stem = basename(normalizedPath, extname(normalizedPath));
  const scoreMatch = stem.match(/(100|200)分/);
  let title = stem
    .replace(/[（(][^()（）]*(?:Java|Python|JS|JavaScript|C\+\+|C语言|C\s*&)[^()（）]*[)）]/gi, '')
    .replace(/^[（(][ABCE]卷\s*,?\s*\d+分[)）]\s*[-—]?\s*/i, '')
    .replace(/^[（(][ABCE]卷\s*[-,，]?\s*\d+分[)）]\s*[-—]?\s*/i, '')
    .replace(/^[【](?:华为OD[-\s]*)?[ABCE]卷[^】]*[】]\s*[-—]?\s*/i, '')
    .replace(/^\d+分\s*[-,，]?\s*/, '');

  title = normalize(title) || stem;
  return { collection, score: scoreMatch ? Number(scoreMatch[1]) : null, title };
}

export function createProblemId({ title, sections, solutions = {} }) {
  const fingerprint = [normalize(title), createBodyHash({ sections, solutions })].join('\n');
  return `od-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 12)}`;
}

export function createBodyHash({ sections, solutions }) {
  const body = [sections.description, sections.input, sections.output, sections.solution, ...Object.values(solutions)].map(normalize).join('\n');
  return createHash('sha256').update(body).digest('hex');
}

import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';

const languageAliases = new Map([
  ['java', 'java'],
  ['python', 'python'],
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['c++', 'cpp'],
  ['cpp', 'cpp'],
  ['c语言', 'cpp'],
]);

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCode(value, stripLineNumberArtifacts) {
  const lines = value
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n');
  return (stripLineNumberArtifacts ? lines.filter((line) => !/^123456789\d+$/.test(line.trim())) : lines).join('\n').trim();
}

function normalizeLanguage(value) {
  const normalized = normalizeText(value).toLowerCase();
  return languageAliases.get(normalized) ?? null;
}

function sectionForHeading(heading) {
  if (heading.includes('题目描述')) return 'description';
  if (heading.includes('输入描述') || heading === '输入') return 'input';
  if (heading.includes('输出描述') || heading === '输出') return 'output';
  if (heading.includes('示例') || heading === '用例') return 'examples';
  if (heading.includes('解题思路') || heading.includes('题目解析') || heading.includes('示例分析')) return 'solution';
  if (heading.includes('复杂度')) return 'complexity';
  return null;
}

function appendSection(sections, section, text) {
  if (!section || !text) return;
  if (section === 'examples') {
    sections.examples.push(text);
    return;
  }
  sections[section] = sections[section] ? `${sections[section]}\n${text}` : text;
}

export async function parseHtmlProblem(filePath, metadata, { stripLineNumberArtifacts = true } = {}) {
  const html = await readFile(filePath);
  const $ = load(html);
  $('style, script, noscript').remove();
  const root = $('#write').length ? $('#write') : $('body');
  const sections = { examples: [] };
  const solutions = {};
  let activeSection = null;
  let activeLanguage = null;

  root.find('h1, h2, h3, h4, h5, h6, p, li, pre').each((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const text = tagName === 'pre' ? normalizeCode($(element).text(), stripLineNumberArtifacts) : normalizeText($(element).text());

    if (/^h[1-6]$/.test(tagName)) {
      activeSection = sectionForHeading(text);
      activeLanguage = normalizeLanguage(text);
      return;
    }

    if (tagName === 'pre') {
      const declaredLanguage = normalizeLanguage($(element).attr('lang') ?? $(element).find('code').attr('class')?.replace('language-', '') ?? '');
      const language = declaredLanguage ?? activeLanguage;
      if (language && text) solutions[language] = solutions[language] ? `${solutions[language]}\n${text}` : text;
      return;
    }

    appendSection(sections, activeSection, text);
  });

  return {
    id: null,
    title: metadata.title,
    sourcePaths: [],
    sourceKinds: ['html'],
    score: metadata.score ?? null,
    collection: metadata.collection,
    sections,
    solutions,
    tags: [],
    completeness: sections.description ? 'complete' : 'index-only',
    duplicateOf: null,
  };
}

function normalizeLine(value) {
  return value.replace(/\s+/g, ' ').trim();
}

const headings = [
  ['description', /^题目描述(?:\s*[：:]\s*|\s*$)(.*)$/],
  ['input', /^输入描述(?:\s*[：:]\s*|\s*$)(.*)$/],
  ['output', /^输出描述(?:\s*[：:]\s*|\s*$)(.*)$/],
  ['solution', /^(?:解题思路|题目解析)(?:\s*[：:]\s*|\s*$)(.*)$/],
  ['complexity', /^复杂度(?:\s*[：:]\s*|\s*$)(.*)$/],
  ['examples', /^(?:示例|样例)\s*\d*(?:\s*[：:]\s*|\s*$)(.*)$/],
];

function headingFor(line) {
  for (const [section, expression] of headings) {
    const match = line.match(expression);
    if (match) return { section, initialContent: match[1] ?? '' };
  }
  return null;
}

export function parseDocumentText(value, metadata) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n').map(normalizeLine).filter(Boolean);
  const sections = { examples: [] };
  let activeSection = null;
  let exampleLines = [];

  function flushExample() {
    const text = exampleLines.join(' ').trim();
    if (text) sections.examples.push(text);
    exampleLines = [];
  }

  for (const line of lines) {
    const heading = headingFor(line);
    if (heading) {
      if (activeSection === 'examples') flushExample();
      activeSection = heading.section;
      if (activeSection === 'examples') {
        exampleLines = heading.initialContent ? [heading.initialContent] : [];
      } else if (heading.initialContent) {
        sections[activeSection] = heading.initialContent;
      }
      continue;
    }

    if (activeSection === 'examples') {
      exampleLines.push(line);
    } else if (activeSection) {
      sections[activeSection] = sections[activeSection] ? `${sections[activeSection]} ${line}` : line;
    }
  }
  if (activeSection === 'examples') flushExample();

  for (const section of ['description', 'input', 'output', 'solution', 'complexity']) {
    if (sections[section]) sections[section] = sections[section].replace(/^(?:题目描述|输入描述|输出描述|解题思路|题目解析|复杂度)\s*[：:]?\s*/, '');
  }

  const fallback = lines.join(' ');
  if (!sections.description) sections.description = fallback;
  return {
    id: null,
    title: metadata.title,
    sourcePaths: [],
    sourceKinds: ['docx'],
    score: metadata.score,
    collection: metadata.collection,
    sections,
    solutions: {},
    tags: [],
    completeness: sections.description.length >= 100 ? 'complete' : 'index-only',
    duplicateOf: null,
  };
}

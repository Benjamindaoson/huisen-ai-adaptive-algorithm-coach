const MISCONCEPTIONS = {
  array: ['off-by-one', 'index-boundary'],
  string: ['encoding-boundary', 'substring-range'],
  hash: ['missing-key', 'duplicate-count'],
  sorting: ['comparator-direction', 'stability-assumption'],
  'binary-search': ['search-boundary', 'monotonicity-assumption'],
  'stack-queue': ['empty-container', 'ordering-invariant'],
  tree: ['base-case', 'subtree-state'],
  graph: ['visited-timing', 'disconnected-component'],
  search: ['pruning-correctness', 'state-restoration'],
  greedy: ['local-choice-proof', 'ordering-condition'],
  'dynamic-programming': ['state-definition', 'transition-boundary'],
  math: ['integer-overflow', 'rounding-rule'],
  interval: ['closed-open-boundary', 'merge-condition'],
  'io-parsing': ['line-token-shape', 'trailing-whitespace'],
  simulation: ['state-update-order', 'termination-condition'],
};

function compact(value, limit = 4_000) {
  const text = String(value ?? '').replace(/\0/g, '').trim();
  return text.length <= limit ? text : text.slice(0, limit);
}

function verification(verified, present = true) {
  return verified ? 'verified' : present ? 'candidate' : 'unverified';
}

function document(ref, kind, title, text, skillIds, level, metadata = {}) {
  return {
    ref, kind, title: compact(title, 300), text: compact(text), skillIds: [...new Set(skillIds)].sort(),
    verification: level, authoritative: level === 'verified', metadata,
  };
}

export function buildMentorIndex(problems) {
  const documents = [];
  const skills = new Set();
  for (const problem of [...problems].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const skillIds = Array.isArray(problem.skills) && problem.skills.length ? problem.skills.filter((item) => typeof item === 'string') : ['simulation'];
    skillIds.forEach((skill) => skills.add(skill));
    const quality = problem.quality ?? {};
    const problemLevel = verification(Boolean(quality.contentVerified), Boolean(quality.readable));
    documents.push(document(
      `problem:${problem.id}`, 'problem', problem.title,
      [problem.sections?.description, problem.sections?.input, problem.sections?.output].filter(Boolean).join('\n'),
      skillIds, problemLevel, { problemId: problem.id, collection: problem.collection ?? '', score: problem.score ?? null },
    ));
    if (problem.sections?.solution) documents.push(document(
      `solution:${problem.id}:explanation`, 'solution', `${problem.title} · 解题思路`, problem.sections.solution,
      skillIds, verification(Boolean(quality.solutionVerified), true), { problemId: problem.id, language: 'explanation' },
    ));
    for (const [language, source] of Object.entries(problem.solutions ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      if (typeof source !== 'string' || !source.trim()) continue;
      documents.push(document(
        `solution:${problem.id}:${language}`, 'solution', `${problem.title} · ${language}`, source,
        skillIds, verification(Boolean(quality.solutionVerified), true), { problemId: problem.id, language },
      ));
    }
  }
  for (const skillId of [...skills].sort()) {
    documents.push(document(`skill:${skillId}`, 'skill', skillId, `算法技能 ${skillId}：定义状态、约束、复杂度和可迁移不变量。`, [skillId], 'candidate'));
    for (const misconception of MISCONCEPTIONS[skillId] ?? [`${skillId}-boundary`]) {
      documents.push(document(`misconception:${skillId}:${misconception}`, 'misconception', misconception, `常见误区 ${misconception}，需要代码结构、失败输入或运行状态证据验证。`, [skillId], 'candidate', { misconceptionId: misconception }));
    }
  }
  return {
    version: 1,
    problemCount: problems.length,
    documentCount: documents.length,
    documents: documents.sort((a, b) => a.ref.localeCompare(b.ref)),
  };
}

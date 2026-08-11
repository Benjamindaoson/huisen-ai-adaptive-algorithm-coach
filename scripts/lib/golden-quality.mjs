const SKILLS = [
  ['io-parsing', ['输入', '输出', '解析', '格式', '日志']],
  ['string', ['字符串', '字符', '子串', '回文', '编码', '前缀']],
  ['array', ['数组', '序列', '列表', '矩阵', '双指针', '滑动窗口']],
  ['hash', ['哈希', 'hash', '集合', '字典', 'map', '去重', '计数']],
  ['sorting', ['排序', '有序', 'topk', 'top k', '优先级']],
  ['binary-search', ['二分', '折半', '答案搜索']],
  ['stack-queue', ['栈', '队列', '括号', '表达式', '单调栈', 'deque']],
  ['tree', ['二叉树', '多叉树', '树结构', '叶子', '祖先']],
  ['graph', ['图', 'graph', '连通', '最短路', '拓扑', '邻接']],
  ['search', ['dfs', 'bfs', '深度优先', '广度优先', '回溯', '搜索', '遍历']],
  ['greedy', ['贪心', 'greedy', '最少', '最多']],
  ['dynamic-programming', ['动态规划', '背包', '状态转移', ' dp ']],
  ['math', ['质数', '素数', '最大公约数', '进制', '位运算', '组合', '数学']],
  ['interval', ['区间', '范围', '差分', '扫描线', '时间段']],
];

function inferSkills(problem) {
  const text = ` ${problem.title}\n${problem.excerpt || ''} `.toLocaleLowerCase('zh-Hans-CN');
  const matched = SKILLS.filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase('zh-Hans-CN')))).map(([id]) => id);
  return matched.length ? matched : ['simulation'];
}

export function buildGoldenQuality(catalog, records, reviewedIds, target = 100) {
  const eligible = catalog.filter((problem) => problem.completeness === 'complete' && Array.isArray(problem.languages) && problem.languages.length > 0);
  const reviewed = eligible.filter((problem) => reviewedIds.has(problem.id));
  const candidates = eligible.filter((problem) => !reviewedIds.has(problem.id));
  const selected = [...reviewed, ...candidates].slice(0, target);
  const annotations = selected.map((problem) => ({
    id: problem.id,
    title: problem.title,
    collection: problem.collection,
    score: problem.score,
    languages: problem.languages,
    skills: inferSkills(problem),
    reviewStatus: 'candidate',
    contentReviewStatus: reviewedIds.has(problem.id) ? 'verified' : 'unreviewed',
    solutionReviewStatus: reviewedIds.has(problem.id) ? 'candidate' : 'unreviewed',
    publicSampleCount: reviewedIds.has(problem.id) ? 2 : 0,
    hiddenTestCount: reviewedIds.has(problem.id) ? 2 : 0,
    skillReviewStatus: 'inferred',
  }));
  const issues = [];
  if (annotations.length !== target) issues.push(`Golden set has ${annotations.length}/${target} annotated problems.`);
  for (const annotation of annotations.filter((item) => item.contentReviewStatus === 'verified')) {
    const record = records.get(annotation.id);
    if (!record) { issues.push(`${annotation.id}: verified problem record is missing.`); continue; }
    for (const section of ['description', 'input', 'output']) {
      if (typeof record.sections?.[section] !== 'string' || !record.sections[section].trim()) issues.push(`${annotation.id}: ${section} is missing.`);
    }
  }
  const contentVerified = annotations.filter((item) => item.contentReviewStatus === 'verified').length;
  const skillVerified = annotations.filter((item) => item.skillReviewStatus === 'verified').length;
  return {
    annotations,
    report: {
      version: 2, target, annotated: annotations.length, contentVerified, skillVerified,
      verified: skillVerified, candidate: annotations.length - skillVerified,
      issues, pass: annotations.length === target && issues.length === 0,
    },
  };
}

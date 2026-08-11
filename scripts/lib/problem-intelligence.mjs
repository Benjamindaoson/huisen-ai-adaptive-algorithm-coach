export const OD_SKILL_TAXONOMY = [
  ['io-parsing', ['输入解析', '输出格式', '正则', 'tlv', '日志']],
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
  ['simulation', ['模拟', '调度', '规则', '系统', '流程']],
];

const VALID_SKILLS = new Set(OD_SKILL_TAXONOMY.map(([id]) => id));

function normalizedText(problem) {
  return ` ${problem.title ?? ''}\n${problem.sections?.description ?? ''}\n${problem.sections?.solution ?? ''} `
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('zh-Hans-CN');
}

function inferredSkills(problem) {
  const text = normalizedText(problem);
  const matches = OD_SKILL_TAXONOMY
    .filter(([id, keywords]) => id !== 'simulation' && keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase('zh-Hans-CN'))))
    .map(([id]) => id);
  return matches.length ? [...new Set(matches)] : ['simulation'];
}

function validAnnotatedSkills(annotation) {
  if (!Array.isArray(annotation?.skills)) return [];
  return [...new Set(annotation.skills.filter((skill) => VALID_SKILLS.has(skill)))];
}

export function classifyProblem(problem, annotation) {
  const annotatedSkills = validAnnotatedSkills(annotation);
  const skills = annotatedSkills.length ? annotatedSkills : inferredSkills(problem);
  const source = annotatedSkills.length && annotation?.reviewStatus === 'verified' && annotation?.skillReviewStatus === 'verified'
    ? 'verified'
    : annotatedSkills.length ? 'candidate' : 'inferred';
  const solutionCoverage = Object.keys(problem.solutions ?? {}).length;
  const readable = problem.completeness === 'complete';
  const solutionPresent = solutionCoverage > 0;
  const publicSampleCount = Number.isInteger(annotation?.publicSampleCount) && annotation.publicSampleCount > 0 ? annotation.publicSampleCount : 0;
  const hiddenTestCount = Number.isInteger(annotation?.hiddenTestCount) && annotation.hiddenTestCount > 0 ? annotation.hiddenTestCount : 0;
  const publicSampleJudgeable = publicSampleCount > 0;
  const hiddenJudgeable = hiddenTestCount > 0;
  const contentVerified = annotation?.contentReviewStatus === 'verified';
  const solutionVerified = annotation?.solutionReviewStatus === 'verified';
  const judgeReady = readable && solutionPresent && publicSampleJudgeable && hiddenJudgeable;
  const verified = judgeReady && contentVerified && solutionVerified;
  const issues = [];
  if (problem.completeness !== 'complete') issues.push('incomplete-statement');
  if (!solutionCoverage) issues.push('missing-solution');
  const practiceReady = readable && solutionPresent;
  const reviewStatus = source === 'verified'
    ? 'verified'
    : source === 'candidate' ? 'candidate' : problem.completeness === 'index-only' ? 'needs-content' : 'unreviewed';
  const confidence = source === 'verified' ? 1 : source === 'candidate' ? 0.9 : skills[0] === 'simulation' ? 0.35 : Math.min(0.82, 0.62 + (skills.length - 1) * 0.05);

  return {
    skills,
    classification: { source, confidence },
    quality: {
      practiceReady, reviewStatus, solutionCoverage, issues, readable, solutionPresent,
      publicSampleCount, hiddenTestCount, publicSampleJudgeable, hiddenJudgeable,
      contentVerified, solutionVerified, judgeReady, verified,
    },
  };
}

export function buildProblemIntelligenceReport(problems) {
  const verificationBacklog = problems
    .filter((problem) => !problem.quality?.verified)
    .map((problem) => {
      const missing = [];
      if (!problem.quality?.readable) missing.push('readable-content');
      if (!problem.quality?.solutionPresent) missing.push('solution');
      if (!problem.quality?.publicSampleJudgeable) missing.push('public-samples');
      if (!problem.quality?.hiddenJudgeable) missing.push('hidden-tests');
      if (!problem.quality?.solutionVerified) missing.push('solution-verification');
      missing.push('human-verification');
      return { id: problem.id, missing };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    version: 1,
    total: problems.length,
    classified: problems.filter((problem) => Array.isArray(problem.skills) && problem.skills.length > 0).length,
    explicit: problems.filter((problem) => ['verified', 'candidate'].includes(problem.classification?.source)).length,
    inferred: problems.filter((problem) => problem.classification?.source === 'inferred').length,
    verified: problems.filter((problem) => problem.classification?.source === 'verified').length,
    practiceReady: problems.filter((problem) => problem.quality?.practiceReady).length,
    needsContent: problems.filter((problem) => problem.quality?.reviewStatus === 'needs-content').length,
    readiness: {
      readable: problems.filter((problem) => problem.quality?.readable).length,
      solutionPresent: problems.filter((problem) => problem.quality?.solutionPresent).length,
      publicSampleJudgeable: problems.filter((problem) => problem.quality?.publicSampleJudgeable).length,
      hiddenJudgeable: problems.filter((problem) => problem.quality?.hiddenJudgeable).length,
      verified: problems.filter((problem) => problem.quality?.verified).length,
    },
    verificationBacklog,
    lowConfidence: problems.filter((problem) => (problem.classification?.confidence ?? 0) < 0.6).map((problem) => problem.id),
  };
}

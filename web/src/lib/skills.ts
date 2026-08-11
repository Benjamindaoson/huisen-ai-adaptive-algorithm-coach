export const OD_SKILLS = [
  { id: 'io-parsing', title: '输入输出与解析', description: '稳定处理多行、分隔符和边界输入。', keywords: ['输入', '输出', '解析', '格式', '正则', 'tlv', '日志'] },
  { id: 'string', title: '字符串', description: '字符处理、匹配、编码与字符串变换。', keywords: ['字符串', '字符', '子串', '回文', '编码', '前缀'] },
  { id: 'array', title: '数组与序列', description: '索引、窗口、双指针和序列统计。', keywords: ['数组', '序列', '列表', '矩阵', '双指针', '滑动窗口'] },
  { id: 'hash', title: '哈希与集合', description: '用映射和集合做计数、去重与快速查找。', keywords: ['哈希', 'hash', '集合', '字典', 'map', '去重', '计数'] },
  { id: 'sorting', title: '排序', description: '排序、比较器、Top K 与有序结构。', keywords: ['排序', '有序', 'topk', 'top k', '优先级'] },
  { id: 'binary-search', title: '二分与答案搜索', description: '在有序空间或答案空间中缩小范围。', keywords: ['二分', '折半', '答案搜索'] },
  { id: 'stack-queue', title: '栈与队列', description: '栈、队列、单调结构和表达式处理。', keywords: ['栈', '队列', '括号', '表达式', '单调栈', 'deque'] },
  { id: 'tree', title: '树', description: '树的遍历、递归、路径和公共祖先。', keywords: ['二叉树', '多叉树', '树结构', '叶子', '祖先'] },
  { id: 'graph', title: '图与连通性', description: '图建模、连通分量、拓扑与最短路。', keywords: ['图', 'graph', '连通', '最短路', '拓扑', '邻接'] },
  { id: 'search', title: '搜索与回溯', description: 'DFS、BFS、回溯和状态空间剪枝。', keywords: ['dfs', 'bfs', '深度优先', '广度优先', '回溯', '搜索', '遍历'] },
  { id: 'greedy', title: '贪心', description: '识别局部最优选择及其正确性条件。', keywords: ['贪心', 'greedy', '最少', '最多'] },
  { id: 'dynamic-programming', title: '动态规划', description: '状态定义、转移、初始化和空间优化。', keywords: ['动态规划', '背包', '状态转移', ' dp '] },
  { id: 'math', title: '数学与位运算', description: '数论、组合、进制和位级技巧。', keywords: ['质数', '素数', '最大公约数', '进制', '位运算', '组合', '数学'] },
  { id: 'interval', title: '区间与扫描', description: '区间合并、差分、扫描线和时间范围。', keywords: ['区间', '范围', '差分', '扫描线', '时间段'] },
  { id: 'simulation', title: '模拟与实现', description: '把复杂规则可靠地翻译为状态更新。', keywords: ['模拟', '调度', '规则', '系统', '流程'] },
] as const;

export type SkillId = (typeof OD_SKILLS)[number]['id'];
export type SkillDefinition = (typeof OD_SKILLS)[number];

type SearchableProblem = { title: string; excerpt?: string; searchText: string; skills?: readonly string[] };

export function inferProblemSkills(problem: SearchableProblem): SkillId[] {
  const persisted = problem.skills?.filter((skill): skill is SkillId => OD_SKILLS.some((definition) => definition.id === skill));
  if (persisted?.length) return [...new Set(persisted)];
  const evidenceText = problem.excerpt?.trim() || problem.searchText;
  const haystack = ` ${problem.title}\n${evidenceText} `.toLocaleLowerCase('zh-Hans-CN');
  const matches = OD_SKILLS
    .filter((skill) => skill.id !== 'simulation' && skill.keywords.some((keyword) => haystack.includes(keyword.toLocaleLowerCase('zh-Hans-CN'))))
    .map((skill) => skill.id);
  return matches.length ? [...new Set(matches)] : ['simulation'];
}

export function getSkill(skillId: SkillId): SkillDefinition {
  return OD_SKILLS.find((skill) => skill.id === skillId) ?? OD_SKILLS[OD_SKILLS.length - 1];
}

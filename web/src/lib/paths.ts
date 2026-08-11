type CatalogLike = { id: string; title: string; searchText: string };

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  matches: string[];
};

export const LEARNING_PATHS: LearningPath[] = [
  { id: 'strings', title: '字符串与解析', description: '从字符处理、编码与格式解析切入。', matches: ['ipv4', 'tlv', '字符串', '解析'] },
  { id: 'arrays', title: '数组与排序', description: '练习排序、双指针、区间与高频数组题。', matches: ['数组', '排序', '双指针', '区间'] },
  { id: 'stack-queue', title: '栈与队列', description: '建立单调栈、队列与表达式处理直觉。', matches: ['栈', '队列', '括号', '表达式'] },
  { id: 'trees-graphs', title: '树与图', description: '覆盖遍历、路径、连通性与最短路。', matches: ['树', '图', 'dfs', 'bfs', '连通'] },
  { id: 'dynamic-programming', title: '动态规划', description: '从状态定义到转移方程，循序挑战。', matches: ['动态规划', 'dp', '背包'] },
  { id: 'simulation', title: '模拟与系统题', description: '处理规则驱动、日志、调度与实现细节。', matches: ['模拟', '日志', '调度', '系统'] },
];

export function resolvePath(path: LearningPath, catalog: CatalogLike[]): string[] {
  const used = new Set<string>();
  const ids: string[] = [];
  for (const match of path.matches) {
    const candidate = catalog.find((problem) => !used.has(problem.id) && `${problem.title}\n${problem.searchText}`.toLocaleLowerCase('zh-Hans-CN').includes(match.toLocaleLowerCase('zh-Hans-CN')));
    if (candidate) {
      used.add(candidate.id);
      ids.push(candidate.id);
    }
  }
  return ids;
}

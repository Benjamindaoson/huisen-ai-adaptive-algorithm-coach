import type { LearningEvent } from './learner-memory';

export type PracticumPhase = 'understanding' | 'diagnosis' | 'planning' | 'implementation' | 'verification' | 'reflection' | 'completed';
export type PracticumFile = { path: string; language: 'markdown' | 'javascript'; content: string; editable?: boolean };
export type ProjectPracticum = {
  id: string;
  order: number;
  prerequisiteIds: string[];
  verificationKind: 'pagination-boundary' | 'async-cache-expiry' | 'selection-reconcile' | 'large-dedup';
  title: string;
  role: string;
  level: string;
  estimatedMinutes: number;
  skills: string[];
  brief: string;
  acceptance: string[];
  files: PracticumFile[];
  diagnosisChoices: Array<{ id: string; label: string }>;
  planChoices: Array<{ id: string; label: string }>;
};

const STARTER = `export function normalizePage(rawPage, totalPages) {
  const parsed = Number.parseInt(rawPage, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(parsed, totalPages);
}`;

export const PROJECT_PRACTICUMS: ProjectPracticum[] = [{
  id: 'repo-pagination',
  order: 1,
  prerequisiteIds: [],
  verificationKind: 'pagination-boundary',
  title: '修复订单后台的分页边界缺陷',
  role: '初级前端 / 全栈工程师',
  level: '入门真实工程任务',
  estimatedMinutes: 35,
  skills: ['需求澄清', '跨文件阅读', '边界分析', '自动化测试', '复盘'],
  brief: '客服反馈：订单列表从分享链接打开时，page=-3 会让接口收到负页码；空数据时 totalPages=0 也会返回第 0 页。请在不改调用方的前提下修复分页归一化契约。',
  acceptance: ['非法 page 回退到 1', '负数 page 被限制为 1', '超过总页数时取最后一页', 'totalPages=0 时仍返回第 1 页'],
  diagnosisChoices: [
    { id: 'parser-error', label: 'parseInt 无法解析字符串数字' },
    { id: 'missing-lower-bound', label: '只限制了上界，没有统一限制下界与空数据边界' },
    { id: 'caller-state', label: '列表页没有把 URL 参数写回状态' },
  ],
  planChoices: [
    { id: 'clamp-contract', label: '先把总页数归一为至少 1，再把 page 限制到 [1, maxPage]' },
    { id: 'change-caller', label: '分别修改所有调用方，在传参前判断' },
    { id: 'hide-error', label: '捕获接口错误并显示空页面' },
  ],
  files: [
    { path: 'README.md', language: 'markdown', content: '# Orders Console\n\n分页工具是 API、URL 路由和表格组件共享的领域边界。修复必须保持调用方接口不变。' },
    { path: 'src/normalizePage.js', language: 'javascript', content: STARTER, editable: true },
    { path: 'src/listOrders.js', language: 'javascript', content: `import { normalizePage } from './normalizePage.js';\n\nexport async function listOrders(query, api) {\n  const page = normalizePage(query.page, query.totalPages);\n  return api.get('/orders', { page });\n}` },
    { path: 'tests/normalizePage.test.js', language: 'javascript', content: `// 可见契约摘要\nnormalizePage('abc', 8) === 1;\nnormalizePage('12', 8) === 8;\n// 另外两项边界测试由运行器验证` },
  ],
}, {
  id: 'repo-async-cache',
  order: 2,
  prerequisiteIds: ['repo-pagination'],
  verificationKind: 'async-cache-expiry',
  title: '修复订单缓存过期判断',
  role: '初级全栈工程师',
  level: '异步数据流',
  estimatedMinutes: 45,
  skills: ['异步流程', '缓存契约', '时间边界', '自动化测试'],
  brief: '订单详情为了减少接口调用增加了缓存，但当前代码只要缓存存在就永远复用，导致用户看到过期状态。请保持调用方接口不变，修复缓存有效期判断。',
  acceptance: ['缺失缓存不能复用', '有效期内缓存可以复用', '到期缓存必须重新请求', '未来时间戳不能被当作有效缓存'],
  diagnosisChoices: [
    { id: 'missing-expiry', label: '判断只检查了缓存是否存在，没有验证保存时间与有效期' },
    { id: 'api-timeout', label: '后端接口响应速度太慢' },
    { id: 'serialization', label: '缓存对象无法被 JSON 序列化' },
  ],
  planChoices: [
    { id: 'validate-age', label: '计算缓存年龄，并把它限制在 0 到 ttlMs 之间' },
    { id: 'delete-cache', label: '完全删除缓存，每次都请求接口' },
    { id: 'increase-ttl', label: '把所有缓存有效期改成一天' },
  ],
  files: [
    { path: 'README.md', language: 'markdown', content: '# Orders Cache\n\n缓存命中必须同时满足：条目存在、时间戳有效、尚未过期。' },
    { path: 'src/shouldUseCachedEntry.js', language: 'javascript', editable: true, content: `export function shouldUseCachedEntry(entry, nowMs, ttlMs) {\n  return Boolean(entry);\n}` },
    { path: 'src/loadOrder.js', language: 'javascript', content: `export async function loadOrder(id, cache, api, nowMs, ttlMs) {\n  const entry = cache.get(id);\n  if (shouldUseCachedEntry(entry, nowMs, ttlMs)) return entry.value;\n  const value = await api.get('/orders/' + id);\n  cache.set(id, { value, savedAt: nowMs });\n  return value;\n}` },
    { path: 'tests/shouldUseCachedEntry.test.js', language: 'javascript', content: `shouldUseCachedEntry(null, 1000, 100) === false;\nshouldUseCachedEntry({ savedAt: 950 }, 1000, 100) === true;` },
  ],
}, {
  id: 'repo-selection-state',
  order: 3,
  prerequisiteIds: ['repo-async-cache'],
  verificationKind: 'selection-reconcile',
  title: '修复跨页勾选状态漂移',
  role: '前端状态工程师',
  level: '状态建模',
  estimatedMinutes: 50,
  skills: ['状态建模', '集合语义', '数据一致性', '回归测试'],
  brief: '批量操作在筛选条件变化后会保留已消失的订单，同时重复点击会产生重复 ID。请让勾选状态只保留当前可见且不重复的订单。',
  acceptance: ['移除不可用 ID', '重复 ID 只保留一次', '保持用户原有选择顺序', '空输入返回空数组'],
  diagnosisChoices: [
    { id: 'array-not-set', label: '数组过滤没有表达唯一集合语义' },
    { id: 'render-key', label: 'React 列表 key 使用错误' },
    { id: 'network-race', label: '接口请求发生竞态' },
  ],
  planChoices: [
    { id: 'dedupe-filter', label: '先按首次出现去重，再与可用 ID 集合求交集' },
    { id: 'sort-all', label: '对所有 ID 排序后直接返回' },
    { id: 'clear-all', label: '筛选变化时清空全部选择' },
  ],
  files: [
    { path: 'README.md', language: 'markdown', content: '# Selection State\n\n选择状态是有顺序的集合，必须与当前可用数据保持一致。' },
    { path: 'src/reconcileSelection.js', language: 'javascript', editable: true, content: `export function reconcileSelection(selectedIds, availableIds) {\n  return selectedIds.filter((id) => availableIds.includes(id));\n}` },
    { path: 'src/useSelection.js', language: 'javascript', content: `export function onRowsChanged(selectedIds, visibleRows) {\n  return reconcileSelection(selectedIds, visibleRows.map((row) => row.id));\n}` },
    { path: 'tests/reconcileSelection.test.js', language: 'javascript', content: `JSON.stringify(reconcileSelection(['b', 'b', 'x'], ['a', 'b'])) === JSON.stringify(['b']);` },
  ],
}, {
  id: 'repo-large-dedup',
  order: 4,
  prerequisiteIds: ['repo-selection-state'],
  verificationKind: 'large-dedup',
  title: '优化大批量编号去重排序',
  role: '算法与性能工程师',
  level: '性能与可靠性',
  estimatedMinutes: 60,
  skills: ['复杂度分析', '大数据边界', '差分测试', '性能验证'],
  brief: '导入任务需要把大量订单编号去重并升序输出。现有实现只去重没有排序，小样例偶尔看不出问题。请用可验证的算法契约完成修复。',
  acceptance: ['输出数字升序', '所有重复项只保留一次', '不修改原数组', '通过 5000 项规模验证'],
  diagnosisChoices: [
    { id: 'set-order', label: 'Set 只保证插入顺序，不会自动按数字大小排序' },
    { id: 'string-sort', label: '输入数据被错误解析为字符串' },
    { id: 'memory-limit', label: '数组超过了浏览器内存限制' },
  ],
  planChoices: [
    { id: 'set-numeric-sort', label: '使用 Set 去重，再用数字比较器排序新数组' },
    { id: 'nested-loop', label: '用双重循环逐一删除重复项' },
    { id: 'mutate-input', label: '直接对输入数组原地排序' },
  ],
  files: [
    { path: 'README.md', language: 'markdown', content: '# Import Pipeline\n\n输出契约要求唯一、数字升序，并且不得改变调用方传入的数组。' },
    { path: 'src/uniqueSorted.js', language: 'javascript', editable: true, content: `export function uniqueSorted(values) {\n  return [...new Set(values)];\n}` },
    { path: 'src/importOrders.js', language: 'javascript', content: `export function prepareOrderIds(rows) {\n  return uniqueSorted(rows.map((row) => row.orderId));\n}` },
    { path: 'tests/uniqueSorted.test.js', language: 'javascript', content: `JSON.stringify(uniqueSorted([10, 2, 10, 1])) === JSON.stringify([1, 2, 10]);` },
  ],
}];

export type PracticumProgress = { phase: PracticumPhase; started: boolean; completed: boolean; hintCount: number; lastTest?: { passed: boolean; passedCount: number; totalCount: number }; evidenceRefs: string[] };

export function derivePracticumProgress(project: ProjectPracticum, events: readonly LearningEvent[]): PracticumProgress {
  const relevant = events.filter((event) => event.problemId === project.id && event.kind.startsWith('practicum-'));
  let phase: PracticumPhase = 'understanding';
  let started = false; let completed = false; let hintCount = 0; let lastTest: PracticumProgress['lastTest'];
  for (const event of relevant) {
    if (event.kind === 'practicum-started') { started = true; phase = 'diagnosis'; }
    if (event.kind === 'practicum-phase-completed' && event.data.phase === 'diagnosis') phase = 'planning';
    if (event.kind === 'practicum-phase-completed' && event.data.phase === 'planning') phase = 'implementation';
    if (event.kind === 'practicum-hint-used') hintCount += 1;
    if (event.kind === 'practicum-tested') {
      lastTest = { passed: event.data.passed === true, passedCount: Number(event.data.passedCount ?? 0), totalCount: Number(event.data.totalCount ?? 0) };
      phase = lastTest.passed ? 'reflection' : 'implementation';
    }
    if (event.kind === 'practicum-reflected') phase = 'completed';
    if (event.kind === 'practicum-completed') { completed = true; phase = 'completed'; }
  }
  return { phase, started, completed, hintCount, ...(lastTest ? { lastTest } : {}), evidenceRefs: relevant.map((event) => `event:${event.id}`) };
}

export type ProjectAvailability = {
  projectId: string;
  status: 'available' | 'locked' | 'completed';
  missingPrerequisiteIds: string[];
};

export function projectAvailability(projects: readonly ProjectPracticum[], events: readonly LearningEvent[]): ProjectAvailability[] {
  const completedIds = new Set(events
    .filter((event) => event.kind === 'practicum-completed')
    .map((event) => event.problemId));

  return [...projects]
    .sort((left, right) => left.order - right.order)
    .map((project) => {
      const missingPrerequisiteIds = project.prerequisiteIds.filter((id) => !completedIds.has(id));
      return {
        projectId: project.id,
        status: completedIds.has(project.id) ? 'completed' : missingPrerequisiteIds.length === 0 ? 'available' : 'locked',
        missingPrerequisiteIds,
      };
    });
}

export function mentorIntervention(phase: PracticumPhase, hintCount: number): { scope: 'prediction' | 'file-boundary' | 'test-boundary'; prompt: string } {
  if (phase === 'diagnosis') return hintCount === 0
    ? { scope: 'prediction', prompt: '先预测：rawPage=-3、totalPages=8 时，当前函数会返回什么？把观察与需求契约对照。' }
    : { scope: 'file-boundary', prompt: '结合刚才的观察，只看 src/normalizePage.js：它限制了哪一侧边界？空数据时“最后一页”应该至少是多少？' };
  if (phase === 'planning') return { scope: 'file-boundary', prompt: '你的计划能否只修改领域边界函数，同时让 API 和路由两个调用方都受益？' };
  return { scope: 'test-boundary', prompt: '先运行测试并只查看第一个失败用例。说明失败输入穿过了哪一层归一化，再做最小修改。' };
}

export function buildPracticumHarness(project: ProjectPracticum, source: string): string {
  const executable = source.replace(/\bexport\s+/g, '');
  const casesByKind: Record<ProjectPracticum['verificationKind'], string> = {
    'pagination-boundary': `[
  ['invalid text', normalizePage("abc", 8), 1],
  ['negative page', normalizePage("-3", 8), 1],
  ['upper bound', normalizePage("12", 8), 8],
  ['empty result', normalizePage("2", 0), 1],
]`,
    'async-cache-expiry': `[
  ['missing entry', shouldUseCachedEntry(null, 1000, 100), false],
  ['fresh entry', shouldUseCachedEntry({ savedAt: 950 }, 1000, 100), true],
  ['expired entry', shouldUseCachedEntry({ savedAt: 900 }, 1000, 100), false],
  ['future timestamp', shouldUseCachedEntry({ savedAt: 1001 }, 1000, 100), false],
]`,
    'selection-reconcile': `[
  ['deduplicate and remove unavailable', reconcileSelection(['b', 'b', 'x'], ['a', 'b']), ['b']],
  ['preserve selection order', reconcileSelection(['c', 'a'], ['a', 'b', 'c']), ['c', 'a']],
  ['empty selection', reconcileSelection([], ['a']), []],
  ['no available rows', reconcileSelection(['a'], []), []],
]`,
    'large-dedup': `(() => {
  const input = [10, 2, 10, 1];
  const snapshot = JSON.stringify(input);
  const large = Array.from({ length: 5000 }, (_, index) => 4999 - (index % 1000));
  return [
    ['numeric ascending', uniqueSorted(input), [1, 2, 10]],
    ['does not mutate input', JSON.stringify(input), snapshot],
    ['empty input', uniqueSorted([]), []],
    ['large input', uniqueSorted(large), Array.from({ length: 1000 }, (_, index) => 4000 + index)],
  ];
})()`,
  };
  return `${executable}\n\nconst __meta = { projectId: "${project.id}" };\nconst __cases = ${casesByKind[project.verificationKind]};\nconst __same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);\nconst __failures = __cases.filter(([, actual, expected]) => !__same(actual, expected)).map(([name, actual, expected]) => ({ name, actual, expected }));\nconsole.log('PRACTICUM_RESULT:' + JSON.stringify({ ...__meta, passedCount: __cases.length - __failures.length, totalCount: __cases.length, failures: __failures }));`;
}

export type PracticumTestResult = { passed: boolean; passedCount: number; totalCount: number; failures: Array<{ name: string; actual: unknown; expected: unknown }> };

export function parsePracticumTestOutput(stdout: string): PracticumTestResult {
  const line = stdout.split(/\r?\n/).reverse().find((item) => item.startsWith('PRACTICUM_RESULT:'));
  if (!line) return { passed: false, passedCount: 0, totalCount: 4, failures: [{ name: 'test-runner', actual: 'missing-result', expected: 'structured-result' }] };
  try {
    const value = JSON.parse(line.slice('PRACTICUM_RESULT:'.length)) as Partial<PracticumTestResult>;
    const passedCount = Number(value.passedCount); const totalCount = Number(value.totalCount);
    if (!Number.isInteger(passedCount) || !Number.isInteger(totalCount) || totalCount <= 0 || passedCount < 0 || passedCount > totalCount || !Array.isArray(value.failures)) throw new Error('invalid');
    return { passed: passedCount === totalCount, passedCount, totalCount, failures: value.failures };
  } catch { return { passed: false, passedCount: 0, totalCount: 4, failures: [{ name: 'test-runner', actual: 'invalid-result', expected: 'structured-result' }] }; }
}

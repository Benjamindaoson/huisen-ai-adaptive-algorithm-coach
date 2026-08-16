import { FOUNDATION_LESSONS } from './foundation-curriculum';
import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';
import { OD_SKILLS, type SkillId } from './skills';

export type LearningStage = 'explain' | 'visualize' | 'predict' | 'partial-code' | 'full-practice';
export type VisualizationKind = 'state-table' | 'pointer-track' | 'search-space' | 'queue-frontier';
export type CurriculumSegment = 'program-foundation' | 'problem-modeling' | 'core-patterns' | 'structures-search' | 'integrated-transfer';
export type CurriculumAvailability = 'available' | 'coming-soon';
export type CurriculumAuthority = 'human-reviewed' | 'candidate';

export type AlgorithmKnowledgeNode = {
  id: string;
  lessonId?: string;
  entryLessonIds: string[];
  version: number;
  title: string;
  objective: string;
  segment: CurriculumSegment;
  availability: CurriculumAvailability;
  misconceptionIds: string[];
  prerequisites: string[];
  skillIds: SkillId[];
  transferSkillIds: SkillId[];
  authority: CurriculumAuthority;
  contentHash: string;
  microLessonMinutes: number;
  visualization: VisualizationKind;
  reviewIntervalsDays: [number, number, number];
  stages: LearningStage[];
};

export type AlgorithmKnowledgeGraph = { version: string; nodes: AlgorithmKnowledgeNode[] };
export type KnowledgeGraphIssue = {
  code: 'invalid-version' | 'duplicate-node' | 'unknown-prerequisite' | 'cycle' | 'unknown-skill' | 'unknown-lesson' | 'incomplete-node' | 'content-hash-mismatch';
  nodeId?: string;
  detail: string;
};

const STAGES: LearningStage[] = ['explain', 'visualize', 'predict', 'partial-code', 'full-practice'];
const REVIEW_INTERVALS: [number, number, number] = [1, 7, 30];
const PROGRAM_FOUNDATION_IDS = new Set(['input-output', 'variables-state', 'conditions', 'loops']);
const PROBLEM_MODELING_IDS = new Set(['arrays-strings', 'functions-decomposition', 'complexity-intuition']);
const ENTRY_LESSON_IDS: Record<string, string[]> = {
  'arrays-strings': ['starter-array-traversal'],
  'hash-lookup': ['starter-hash-lookup'],
  'two-pointers': ['starter-two-pointers'],
};
const MISCONCEPTIONS: Record<string, string[]> = {
  'input-output': ['input-is-text'],
  'variables-state': ['state-does-not-change'],
  conditions: ['branch-is-random'],
  loops: ['loop-runs-once'],
  'arrays-strings': ['index-starts-at-one', 'loop-variable-is-index'],
  'functions-decomposition': ['solution-must-be-one-block'],
  'complexity-intuition': ['runtime-equals-complexity'],
  'hash-lookup': ['lookup-requires-rescan'],
  'two-pointers': ['pointer-move-is-guessing'],
  'sliding-window': ['window-recomputed-from-scratch'],
  'binary-search': ['binary-boundary-is-symmetric'],
  'queue-bfs': ['queue-order-does-not-matter'],
};

function visualizationFor(id: string): VisualizationKind {
  if (id.includes('pointer') || id.includes('window')) return 'pointer-track';
  if (id.includes('binary')) return 'search-space';
  if (id.includes('queue') || id.includes('graph') || id.includes('tree')) return 'queue-frontier';
  return 'state-table';
}

function segmentFor(id: string): CurriculumSegment {
  if (PROGRAM_FOUNDATION_IDS.has(id)) return 'program-foundation';
  if (PROBLEM_MODELING_IDS.has(id)) return 'problem-modeling';
  return 'core-patterns';
}

function fingerprintText(value: string): string {
  let left = 0x811c9dc5;
  let right = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    left = Math.imul(left ^ code, 0x01000193) >>> 0;
    right = Math.imul(right ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${left.toString(16).padStart(8, '0')}${right.toString(16).padStart(8, '0')}`;
}

function nodeContract(node: Omit<AlgorithmKnowledgeNode, 'contentHash'> | AlgorithmKnowledgeNode): string {
  return JSON.stringify({
    id: node.id,
    lessonId: node.lessonId ?? null,
    entryLessonIds: node.entryLessonIds,
    version: node.version,
    title: node.title,
    objective: node.objective,
    segment: node.segment,
    availability: node.availability,
    misconceptionIds: node.misconceptionIds,
    prerequisites: node.prerequisites,
    skillIds: node.skillIds,
    transferSkillIds: node.transferSkillIds,
    authority: node.authority,
    microLessonMinutes: node.microLessonMinutes,
    visualization: node.visualization,
    reviewIntervalsDays: node.reviewIntervalsDays,
    stages: node.stages,
  });
}

export function fingerprintAlgorithmKnowledgeNode(node: Omit<AlgorithmKnowledgeNode, 'contentHash'> | AlgorithmKnowledgeNode): string {
  return fingerprintText(nodeContract(node));
}

function withContentHash(node: Omit<AlgorithmKnowledgeNode, 'contentHash'>): AlgorithmKnowledgeNode {
  return { ...node, contentHash: fingerprintAlgorithmKnowledgeNode(node) };
}

const availableNodes = FOUNDATION_LESSONS.map((lesson) => withContentHash({
  id: lesson.id,
  lessonId: lesson.id,
  entryLessonIds: ENTRY_LESSON_IDS[lesson.id] ?? [],
  version: 1,
  title: lesson.title,
  objective: lesson.objective,
  segment: segmentFor(lesson.id),
  availability: 'available' as const,
  misconceptionIds: MISCONCEPTIONS[lesson.id] ?? ['needs-evidence'],
  prerequisites: [...lesson.prerequisites],
  skillIds: [...lesson.skillIds],
  transferSkillIds: [lesson.transfer.skillId],
  authority: 'human-reviewed' as const,
  microLessonMinutes: Math.min(10, Math.max(5, Math.ceil(lesson.minutes / 2))),
  visualization: visualizationFor(lesson.id),
  reviewIntervalsDays: [...REVIEW_INTERVALS],
  stages: [...STAGES],
}));

function futureNode(input: {
  id: string;
  title: string;
  objective: string;
  prerequisites: string[];
  skillIds: SkillId[];
  segment?: CurriculumSegment;
}): AlgorithmKnowledgeNode {
  return withContentHash({
    ...input,
    entryLessonIds: [],
    version: 1,
    segment: input.segment ?? 'structures-search',
    availability: 'coming-soon',
    misconceptionIds: ['content-not-yet-reviewed'],
    transferSkillIds: [...input.skillIds],
    authority: 'candidate',
    microLessonMinutes: 10,
    visualization: visualizationFor(input.id),
    reviewIntervalsDays: [...REVIEW_INTERVALS],
    stages: [...STAGES],
  });
}

const futureNodes = [
  futureNode({ id: 'recursion-backtracking', title: '从选择到回退', objective: '看见递归状态、选择和撤销如何共同搜索答案。', prerequisites: ['functions-decomposition'], skillIds: ['search'] }),
  futureNode({ id: 'tree-traversal', title: '沿着树找到每个节点', objective: '用递归或队列遍历树，并说明当前节点和子问题。', prerequisites: ['recursion-backtracking'], skillIds: ['tree', 'search'] }),
  futureNode({ id: 'graph-search', title: '在连接关系中探索', objective: '把现实关系建成图，并选择 BFS 或 DFS。', prerequisites: ['queue-bfs'], skillIds: ['graph', 'search'] }),
  futureNode({ id: 'greedy-choice', title: '每一步为什么可以先选最好', objective: '识别局部选择成立的条件，并用反例检查它。', prerequisites: ['complexity-intuition'], skillIds: ['greedy'] }),
  futureNode({ id: 'dynamic-programming', title: '把重复子问题记下来', objective: '定义状态、转移和初始条件，避免重复计算。', prerequisites: ['recursion-backtracking'], skillIds: ['dynamic-programming'] }),
  futureNode({
    id: 'mixed-unseen-transfer', title: '陌生题综合迁移', objective: '在无题型标签和答案的条件下独立完成综合任务。',
    prerequisites: ['hash-lookup', 'two-pointers', 'sliding-window', 'binary-search', 'queue-bfs'],
    skillIds: ['array', 'hash', 'search'], segment: 'integrated-transfer',
  }),
];

export const ALGORITHM_KNOWLEDGE_GRAPH: AlgorithmKnowledgeGraph = {
  version: '2.0.0',
  nodes: [...availableNodes, ...futureNodes],
};

export function availableBridgeNodes(): AlgorithmKnowledgeNode[] {
  return ALGORITHM_KNOWLEDGE_GRAPH.nodes.filter((node) => node.availability === 'available');
}

export function getAlgorithmKnowledgeNodeByLessonId(lessonId: string): AlgorithmKnowledgeNode | undefined {
  return ALGORITHM_KNOWLEDGE_GRAPH.nodes.find((node) => node.lessonId === lessonId || node.entryLessonIds.includes(lessonId));
}

export function validateAlgorithmKnowledgeGraph(graph: AlgorithmKnowledgeGraph): KnowledgeGraphIssue[] {
  const issues: KnowledgeGraphIssue[] = [];
  if (!/^\d+\.\d+\.\d+$/.test(graph.version)) issues.push({ code: 'invalid-version', detail: 'Graph version must use semver.' });
  const counts = new Map<string, number>();
  for (const node of graph.nodes) counts.set(node.id, (counts.get(node.id) ?? 0) + 1);
  const ids = new Set(graph.nodes.map((node) => node.id));
  const knownSkills = new Set(OD_SKILLS.map((skill) => skill.id));
  const knownLessons = new Set([...FOUNDATION_LESSONS, ...STARTER_ALGORITHM_LESSONS].map((lesson) => lesson.id));

  for (const node of graph.nodes) {
    if ((counts.get(node.id) ?? 0) > 1) issues.push({ code: 'duplicate-node', nodeId: node.id, detail: `Duplicate node: ${node.id}` });
    const invalidAvailableNode = node.availability === 'available' && (node.authority !== 'human-reviewed' || !node.lessonId);
    if (node.version < 1 || node.microLessonMinutes < 5 || node.microLessonMinutes > 10 || invalidAvailableNode ||
      !node.objective.trim() || node.misconceptionIds.length === 0 || STAGES.some((stage) => !node.stages.includes(stage)) ||
      node.reviewIntervalsDays.some((day, index, values) => day <= 0 || (index > 0 && day <= values[index - 1]))) {
      issues.push({ code: 'incomplete-node', nodeId: node.id, detail: `Incomplete five-stage contract: ${node.id}` });
    }
    if (node.contentHash !== fingerprintAlgorithmKnowledgeNode(node)) {
      issues.push({ code: 'content-hash-mismatch', nodeId: node.id, detail: `Content hash mismatch: ${node.id}` });
    }
    for (const lessonId of [node.lessonId, ...node.entryLessonIds].filter((id): id is string => Boolean(id))) {
      if (!knownLessons.has(lessonId)) issues.push({ code: 'unknown-lesson', nodeId: node.id, detail: `Unknown lesson: ${lessonId}` });
    }
    for (const prerequisite of node.prerequisites) {
      if (!ids.has(prerequisite)) issues.push({ code: 'unknown-prerequisite', nodeId: node.id, detail: `Unknown prerequisite: ${prerequisite}` });
    }
    for (const skill of [...node.skillIds, ...node.transferSkillIds]) {
      if (!knownSkills.has(skill)) issues.push({ code: 'unknown-skill', nodeId: node.id, detail: `Unknown skill: ${skill}` });
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  function visit(id: string): void {
    if (visiting.has(id)) {
      issues.push({ code: 'cycle', nodeId: id, detail: `Cycle includes: ${id}` });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const prerequisite of byId.get(id)?.prerequisites ?? []) if (byId.has(prerequisite)) visit(prerequisite);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return issues.filter((issue, index, all) => all.findIndex((item) => item.code === issue.code && item.nodeId === issue.nodeId && item.detail === issue.detail) === index);
}

export function smallestIncompletePrerequisite(nodeId: string, completed: ReadonlySet<string>): string | null {
  const byId = new Map(ALGORITHM_KNOWLEDGE_GRAPH.nodes.map((node) => [node.id, node]));
  const node = byId.get(nodeId);
  if (!node) return null;
  for (const prerequisiteId of node.prerequisites) {
    if (completed.has(prerequisiteId)) continue;
    const earlier = smallestIncompletePrerequisite(prerequisiteId, completed);
    return earlier ?? prerequisiteId;
  }
  return completed.has(nodeId) ? null : nodeId;
}

export function nextDelayedReview(transferPassedAt: string, reviewIndex: number): string {
  const intervals = availableBridgeNodes()[0]?.reviewIntervalsDays ?? REVIEW_INTERVALS;
  const interval = intervals[Math.max(0, Math.min(reviewIndex, intervals.length - 1))];
  const due = new Date(transferPassedAt);
  if (Number.isNaN(due.getTime())) throw new Error('Invalid transfer timestamp');
  due.setUTCDate(due.getUTCDate() + interval);
  return due.toISOString();
}

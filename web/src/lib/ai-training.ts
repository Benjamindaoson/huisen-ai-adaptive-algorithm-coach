import type { FoundationLesson } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import { ALGORITHM_KNOWLEDGE_GRAPH, getAlgorithmKnowledgeNodeByLessonId } from './algorithm-knowledge-graph';
import { buildBridgePlan, deriveDiagnosticSnapshot, DIAGNOSTIC_OBSERVATION_COPY, type DiagnosticObservation } from './bridge-journey';

export const TRAINING_STAGE_IDS = ['explain', 'observe', 'predict', 'build', 'transfer'] as const;
export type TrainingStageId = (typeof TRAINING_STAGE_IDS)[number];
export type TrainingDiagnosisKind = 'baseline' | 'entry-handoff' | 'prompt-dependence' | 'implementation-friction' | 'transfer-ready';

export type TrainingHandoffObservation = DiagnosticObservation & {
  label: string;
  detail: string;
};

export type TrainingDiagnosis = {
  kind: TrainingDiagnosisKind;
  eyebrow: string;
  title: string;
  claim: string;
  evidenceLabel: string;
  evidenceRefs: string[];
  uncertainty: string;
  handoffObservations?: TrainingHandoffObservation[];
  masteryBoundary?: string;
};

export type TrainingStage = {
  id: TrainingStageId;
  label: string;
  purpose: string;
};

export type TrainingSession = {
  version: 1;
  curriculumVersion: string;
  nodeId: string;
  lessonId: string;
  diagnosis: TrainingDiagnosis;
  mission: { title: string; objective: string; minutes: 10; stages: TrainingStage[]; transferCriterion: string };
  progress: TrainingProgress;
};

export type TrainingProgress = {
  started: boolean;
  completedStageIds: TrainingStageId[];
  activeStageId: TrainingStageId;
  transferReady: boolean;
  masteryVerified: boolean;
};

export type GrowthReplay = {
  startingPoint: string;
  completedStageIds: TrainingStageId[];
  evidence: Array<{ label: string; detail: string }>;
  transfer: { status: 'pending' | 'immediate' | 'verified'; detail: string };
  nextAction: string;
};

const STAGES: TrainingStage[] = [
  { id: 'explain', label: '听懂', purpose: '先用生活语言建立直觉' },
  { id: 'observe', label: '看见', purpose: '观察程序每一步记住什么' },
  { id: 'predict', label: '预测', purpose: '在运行前说出下一步' },
  { id: 'build', label: '动手', purpose: '只写关键的一小步' },
  { id: 'transfer', label: '独立迁移', purpose: '换一道题验证是否真的会用' },
];

function evidenceRef(event: LearningEvent): string {
  return `event:${event.id}`;
}

function newest(events: LearningEvent[], predicate: (event: LearningEvent) => boolean): LearningEvent | undefined {
  return events.filter(predicate).sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
}

export function deriveTrainingDiagnosis(lesson: FoundationLesson, events: LearningEvent[]): TrainingDiagnosis {
  const relevantAttempts = events.filter((event) => event.kind === 'attempt-recorded' && event.data.skillIds?.includes(lesson.transfer.skillId) === true);
  const assistedPass = newest(relevantAttempts, (event) => event.data.outcome === 'passed' && event.data.assisted === true);
  const relatedHint = assistedPass
    ? newest(events, (event) => event.kind === 'hint-requested' && event.data.skillIds?.includes(lesson.transfer.skillId) === true && event.createdAt <= assistedPass.createdAt)
    : undefined;
  if (assistedPass && relatedHint) {
    return {
      kind: 'prompt-dependence', eyebrow: 'AI 的当前判断', title: '你已经能推进，但还需要把方法变成自己的。',
      claim: '记录显示你在得到提示后通过过同类练习；这次我们先训练“自己先判断下一步”。',
      evidenceLabel: '基于一次提示后通过的记录', evidenceRefs: [evidenceRef(relatedHint), evidenceRef(assistedPass)],
      uncertainty: '这不是对能力的最终结论，还需要独立迁移来验证。',
    };
  }
  const unsuccessful = newest(relevantAttempts, (event) => event.data.outcome !== 'passed');
  if (unsuccessful) {
    return {
      kind: 'implementation-friction', eyebrow: 'AI 的当前判断', title: '先把程序状态看清，再写完整代码。',
      claim: '最近一次同技能练习没有通过；先缩小任务，观察每一步的状态变化。',
      evidenceLabel: '基于一次未通过的同技能提交', evidenceRefs: [evidenceRef(unsuccessful)],
      uncertainty: '系统尚未确认具体错因，本次训练会收集更细的学习证据。',
    };
  }
  const verifiedTransfer = newest(events, (event) => event.kind === 'lesson-transfer-passed' && event.data.lessonId === lesson.id && event.data.assisted === false);
  if (verifiedTransfer) {
    return {
      kind: 'transfer-ready', eyebrow: 'AI 的当前判断', title: '这个方法已经有独立使用的证据。',
      claim: '你曾在不同题面中独立通过；这次用于巩固和发现边界，而不是重复背答案。',
      evidenceLabel: '基于一次独立迁移通过', evidenceRefs: [evidenceRef(verifiedTransfer)],
      uncertainty: '长期掌握仍需在之后的延迟复测中确认。',
    };
  }
  const bridgePlan = buildBridgePlan(events);
  const diagnosticSnapshot = deriveDiagnosticSnapshot(events);
  if (bridgePlan?.entryLessonId === lesson.id && diagnosticSnapshot.status === 'complete') {
    return {
      kind: 'entry-handoff',
      eyebrow: '继续刚才的入口诊断',
      title: bridgePlan.title,
      claim: bridgePlan.reason,
      evidenceLabel: `来自入口诊断的 ${diagnosticSnapshot.observations.length} 个动作`,
      evidenceRefs: [...diagnosticSnapshot.evidenceRefs],
      uncertainty: diagnosticSnapshot.uncertainty,
      handoffObservations: diagnosticSnapshot.observations.map((observation) => ({
        ...observation,
        ...DIAGNOSTIC_OBSERVATION_COPY[observation.step],
      })),
      masteryBoundary: '这些入口动作只用于安排训练起点，不等于掌握证明。',
    };
  }
  return {
    kind: 'baseline', eyebrow: 'AI 从这里开始认识你', title: '先让 AI 看见你如何理解程序。',
    claim: `现在还没有你的 ${lesson.plainTitle} 编程证据。先完成一个小预测和一个关键代码动作，系统再据此安排下一步。`,
    evidenceLabel: '目前还没有可用的同技能学习记录', evidenceRefs: [],
    uncertainty: '这是起点，不是对你能力的判断。',
  };
}

export function deriveTrainingProgress(lesson: FoundationLesson, events: LearningEvent[]): TrainingProgress {
  const lessonEvents = events.filter((event) => event.data.lessonId === lesson.id);
  const completedStageIds = TRAINING_STAGE_IDS.filter((stage) => lessonEvents.some((event) =>
    event.kind === 'training-stage-completed' && event.data.stage === stage && event.data.correct === true));
  const completed = new Set(completedStageIds);
  const transferReady = ['explain', 'observe', 'predict', 'build'].every((stage) => completed.has(stage as TrainingStageId));
  const masteryVerified = lessonEvents.some((event) =>
    event.kind === 'lesson-transfer-passed' && event.data.stage === 'transfer' && event.data.correct === true && event.data.assisted === false);
  const activeStageId = transferReady
    ? 'transfer'
    : TRAINING_STAGE_IDS.find((stage) => stage !== 'transfer' && !completed.has(stage)) ?? 'transfer';
  return {
    started: lessonEvents.some((event) => event.kind === 'training-session-started' || event.kind === 'training-stage-completed'),
    completedStageIds,
    activeStageId,
    transferReady,
    masteryVerified,
  };
}

export function buildTrainingSession(lesson: FoundationLesson, events: LearningEvent[]): TrainingSession {
  const node = getAlgorithmKnowledgeNodeByLessonId(lesson.id);
  return {
    version: 1,
    curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version,
    nodeId: node?.id ?? lesson.id,
    lessonId: lesson.id,
    diagnosis: deriveTrainingDiagnosis(lesson, events),
    mission: {
      title: `10 分钟学会一个动作：${lesson.plainTitle}`,
      objective: lesson.objective,
      minutes: 10,
      stages: STAGES,
      transferCriterion: '在没有答案和提示的另一道题里，独立把这个动作用出来。',
    },
    progress: deriveTrainingProgress(lesson, events),
  };
}

export function buildGrowthReplay(lesson: FoundationLesson, events: LearningEvent[]): GrowthReplay {
  const session = buildTrainingSession(lesson, events);
  const completedStageIds = TRAINING_STAGE_IDS.filter((stage) => events.some((event) => event.kind === 'training-stage-completed' && event.data.lessonId === lesson.id && event.data.stage === stage && event.data.correct === true));
  const transferVerified = events.some((event) => event.kind === 'lesson-transfer-passed' && event.data.lessonId === lesson.id && event.data.assisted === false && event.data.correct === true);
  const immediateTransfer = events.some((event) => event.kind === 'training-stage-completed' && event.data.lessonId === lesson.id && event.data.stage === 'transfer' && event.data.correct === true);
  const evidence = completedStageIds.map((stage) => ({
    label: STAGES.find((item) => item.id === stage)?.label ?? stage,
    detail: stage === 'predict' ? '你先预测了程序状态，再查看结果。' : stage === 'build' ? '你独立补上了关键的代码动作。' : '这个训练阶段已经留下了完成记录。',
  }));
  return {
    startingPoint: session.diagnosis.title,
    completedStageIds,
    evidence,
    transfer: transferVerified
      ? { status: 'verified', detail: '你已在另一道题中独立通过，方法开始具备迁移证据。' }
      : immediateTransfer
        ? { status: 'immediate', detail: '你已在新情境中独立通过两组即时测试；这不等于长期掌握，还需要之后的延迟复测。' }
      : { status: 'pending', detail: '还缺一次没有答案和提示的独立迁移；现在不能把它叫作“已掌握”。' },
    nextAction: transferVerified || immediateTransfer ? '返回训练地图；系统会在之后安排延迟复测。' : '下一步：进入独立迁移题，用不同题面验证你能否自己做出下一道题。',
  };
}

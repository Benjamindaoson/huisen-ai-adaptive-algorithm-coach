import { ALGORITHM_KNOWLEDGE_GRAPH } from './algorithm-knowledge-graph';
import { getFoundationLesson, type FoundationLesson } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';

export const DIAGNOSTIC_STEPS = ['state', 'implementation', 'modeling'] as const;
export type DiagnosticStep = (typeof DIAGNOSTIC_STEPS)[number];
export type BridgePlacement = 'foundation' | 'bridge';
export type DiagnosticStatus = 'not-started' | 'incomplete' | 'complete';
export type DiagnosticObservation = {
  step: DiagnosticStep;
  result: 'stable' | 'needs-practice';
  evidenceRef: string;
};

export const DIAGNOSTIC_OBSERVATION_COPY: Record<DiagnosticStep, { label: string; detail: string }> = {
  state: { label: '读懂程序状态', detail: '能否跟住变量随语句发生的变化' },
  implementation: { label: '把想法写成代码', detail: '能否把重复处理写成一个代码动作' },
  modeling: { label: '把题意变成状态', detail: '能否先判断解决问题需要记住什么' },
};

export type DiagnosticSnapshot = {
  status: DiagnosticStatus;
  curriculumVersion: string;
  completedSteps: DiagnosticStep[];
  nextStep: DiagnosticStep | null;
  evidenceRefs: string[];
  observations: DiagnosticObservation[];
  uncertainty: string;
  placement?: BridgePlacement;
  entryNodeId?: string;
  bottleneck?: string;
  claim?: string;
  confidenceBand?: 'low' | 'medium';
};

export type BridgePlan = {
  version: 1;
  id: string;
  curriculumVersion: string;
  authority: 'event-projection';
  placement: BridgePlacement;
  entryNodeId: string;
  entryLessonId: string;
  title: string;
  goal: string;
  estimatedMinutes: 10;
  prerequisite: string;
  gain: string;
  reason: string;
  completionCriterion: string;
  confidenceBand: 'low' | 'medium';
  evidenceRefs: string[];
  changesWhen: string;
};

function isDiagnosticEvent(event: LearningEvent, step?: DiagnosticStep): boolean {
  return event.kind === 'bridge-diagnostic-step-recorded'
    && event.data.curriculumVersion === ALGORITHM_KNOWLEDGE_GRAPH.version
    && (step === undefined || event.data.diagnosticStep === step);
}

function latestStepEvent(events: LearningEvent[], step: DiagnosticStep): LearningEvent | undefined {
  return events
    .filter((event) => isDiagnosticEvent(event, step))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
}

function correct(event: LearningEvent | undefined): boolean {
  return event?.data.correct === true;
}

export function deriveDiagnosticSnapshot(events: LearningEvent[]): DiagnosticSnapshot {
  const evidence = new Map(DIAGNOSTIC_STEPS.map((step) => [step, latestStepEvent(events, step)]));
  const completedSteps = DIAGNOSTIC_STEPS.filter((step) => evidence.get(step));
  const evidenceRefs = completedSteps.map((step) => `event:${evidence.get(step)!.id}`);
  const observations = completedSteps.map((step): DiagnosticObservation => ({
    step,
    result: correct(evidence.get(step)) ? 'stable' : 'needs-practice',
    evidenceRef: `event:${evidence.get(step)!.id}`,
  }));
  const nextStep = DIAGNOSTIC_STEPS.find((step) => !evidence.get(step)) ?? null;
  if (completedSteps.length === 0) {
    return {
      status: 'not-started', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep: 'state', evidenceRefs, observations,
      uncertainty: '现在还没有你的学习动作证据；先完成三个小动作，系统才会建议起点。',
    };
  }
  if (nextStep) {
    return {
      status: 'incomplete', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep, evidenceRefs, observations,
      uncertainty: `还需要完成 ${DIAGNOSTIC_STEPS.length - completedSteps.length} 个小动作，当前不能判断你的正式起点。`,
    };
  }

  const stateCorrect = correct(evidence.get('state'));
  const implementationCorrect = correct(evidence.get('implementation'));
  const modelingCorrect = correct(evidence.get('modeling'));
  if (!stateCorrect) {
    return {
      status: 'complete', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep: null, evidenceRefs, observations,
      placement: 'foundation', entryNodeId: 'variables-state', bottleneck: '程序状态', confidenceBand: 'medium',
      claim: '你目前最需要的不是背算法模板，而是先看清每一行执行后变量怎样变化。',
      uncertainty: '这是三次短动作形成的起点判断；系统还会在真实练习中继续校准。',
    };
  }
  if (!implementationCorrect) {
    return {
      status: 'complete', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep: null, evidenceRefs, observations,
      placement: 'foundation', entryNodeId: 'loops', bottleneck: '从理解到代码', confidenceBand: 'medium',
      claim: '你能看懂状态，但把重复步骤稳定写成代码时还会卡住，先补一个最小实现动作。',
      uncertainty: '一次局部编码不能代表全部语法能力；通过真实训练后会重新判断。',
    };
  }
  if (!modelingCorrect) {
    return {
      status: 'complete', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep: null, evidenceRefs, observations,
      placement: 'bridge', entryNodeId: 'functions-decomposition', bottleneck: '问题建模', confidenceBand: 'medium',
      claim: '你的基础语法动作比较稳定，现在更需要练习把题意变成要保存的状态和可执行步骤。',
      uncertainty: '系统尚未判断你对每种数据结构的掌握，下一次真实任务会继续收集证据。',
    };
  }
  return {
    status: 'complete', curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version, completedSteps, nextStep: null, evidenceRefs, observations,
    placement: 'bridge', entryNodeId: 'arrays-strings', bottleneck: '陌生题迁移', confidenceBand: 'medium',
    claim: '三个基础动作都比较稳定，可以直接进入算法过桥，用不同题面验证你能否独立迁移。',
    uncertainty: '短诊断不能证明掌握；只有后续陌生迁移和延迟复测才能升级能力证据。',
  };
}

function planCopy(snapshot: DiagnosticSnapshot): Pick<BridgePlan, 'title' | 'prerequisite' | 'gain' | 'reason'> {
  if (snapshot.entryNodeId === 'variables-state') return {
    title: '先看见程序每一步记住了什么',
    prerequisite: '不要求算法基础，只需要跟着三行代码观察变量。',
    gain: '能够在运行前说出变量下一步会变成什么。',
    reason: '刚才的状态预测没有形成稳定证据，先补程序状态，比直接刷题更有效。',
  };
  if (snapshot.entryNodeId === 'loops') return {
    title: '把重复步骤稳定写成循环',
    prerequisite: '你已经能读懂简单变量变化。',
    gain: '能够说明循环变量代表什么，并独立补上关键更新。',
    reason: '刚才看懂了状态，但实现动作还不稳定，所以只练循环里的关键一步。',
  };
  if (snapshot.entryNodeId === 'functions-decomposition') return {
    title: '把题意拆成状态和几个小步骤',
    prerequisite: '你已经能完成基础状态预测和局部代码。',
    gain: '能够先说清要保存什么、每一步做什么，再开始写完整代码。',
    reason: '刚才的语法动作稳定，但建模选择没有通过；现在优先补“从题意到步骤”。',
  };
  return {
    title: '用数组遍历建立第一个可迁移动作',
    prerequisite: '你已完成状态、实现和建模三个入口动作。',
    gain: '能够解释循环变量，并在不同题面中逐个处理一组数据。',
    reason: '三个入口动作都有正确证据，可以跳过基础讲解，直接进入短训练和陌生迁移。',
  };
}

export function buildBridgePlan(events: LearningEvent[]): BridgePlan | null {
  const snapshot = deriveDiagnosticSnapshot(events);
  if (snapshot.status !== 'complete' || !snapshot.placement || !snapshot.entryNodeId || !snapshot.confidenceBand) return null;
  const node = ALGORITHM_KNOWLEDGE_GRAPH.nodes.find((item) => item.id === snapshot.entryNodeId && item.availability === 'available');
  if (!node?.lessonId) return null;
  const entryLessonId = node.entryLessonIds[0] ?? node.lessonId;
  const copy = planCopy(snapshot);
  const lastEvidenceId = snapshot.evidenceRefs.at(-1)?.replace('event:', '') ?? 'baseline';
  return {
    version: 1,
    id: `bridge-plan:${ALGORITHM_KNOWLEDGE_GRAPH.version}:${lastEvidenceId}`,
    curriculumVersion: ALGORITHM_KNOWLEDGE_GRAPH.version,
    authority: 'event-projection',
    placement: snapshot.placement,
    entryNodeId: snapshot.entryNodeId,
    entryLessonId,
    title: copy.title,
    goal: node.objective,
    estimatedMinutes: 10,
    prerequisite: copy.prerequisite,
    gain: copy.gain,
    reason: copy.reason,
    completionCriterion: '完成预测和关键代码动作后，进入不同题面的独立迁移；当前小课完成不等于掌握。',
    confidenceBand: snapshot.confidenceBand,
    evidenceRefs: [...snapshot.evidenceRefs],
    changesWhen: '真实训练、提示使用、陌生迁移或延迟复测产生新证据时，系统会重新安排。',
  };
}

export function nextBridgeTrainingLesson(events: LearningEvent[]): FoundationLesson | null {
  const plan = buildBridgePlan(events);
  return plan ? getFoundationLesson(plan.entryLessonId) ?? null : null;
}

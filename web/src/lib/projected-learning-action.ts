import { buildBridgePlan, deriveDiagnosticSnapshot } from './bridge-journey';
import { nextFoundationLesson } from './lesson-progress';
import type { LearningEvent } from './learner-memory';
import { hrefFor, type AppRoute } from './routes';

export type ProjectedBridgeActionState = 'start-diagnosis' | 'continue-diagnosis' | 'start-training' | 'continue-training' | 'continue-foundation' | 'choose-next-training';

export type ProjectedLearningAction = {
  version: 1;
  authority: 'event-projection';
  state: ProjectedBridgeActionState;
  label: string;
  route: { name: 'today' } | { name: 'training'; lessonId: string } | { name: 'learn'; lessonId: string } | { name: 'paths' };
  href: string;
  evidenceRefs: string[];
};

function action(state: ProjectedBridgeActionState, label: string, route: ProjectedLearningAction['route'], evidenceRefs: string[]): ProjectedLearningAction {
  return { version: 1, authority: 'event-projection', state, label, route, href: hrefFor(route), evidenceRefs: [...evidenceRefs] };
}

function foundationEvidenceRefs(events: LearningEvent[], lessonId: string, prerequisiteIds: string[]): string[] {
  const relevantLessonIds = new Set([lessonId, ...prerequisiteIds]);
  return events
    .filter((event) => (
      event.kind === 'lesson-started'
      || event.kind === 'lesson-checkpoint-passed'
      || event.kind === 'lesson-completed'
    ) && Boolean(event.data.lessonId) && relevantLessonIds.has(event.data.lessonId!))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id))
    .map((event) => `event:${event.id}`);
}

export function projectBridgeLearningAction(events: LearningEvent[]): ProjectedLearningAction {
  const latestImmediateTransfer = events
    .filter((event) => event.kind === 'training-stage-completed' && event.data.stage === 'transfer' && event.data.correct === true && Boolean(event.data.lessonId))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
  if (latestImmediateTransfer) {
    const laterStart = events
      .filter((event) => event.kind === 'training-session-started' && Date.parse(event.createdAt) > Date.parse(latestImmediateTransfer.createdAt) && Boolean(event.data.lessonId))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
    if (laterStart) return action('continue-training', '继续 10 分钟训练', { name: 'training', lessonId: laterStart.data.lessonId! }, [`event:${latestImmediateTransfer.id}`, `event:${laterStart.id}`]);
    const nextLesson = nextFoundationLesson(events);
    if (nextLesson) {
      return action(
        'continue-foundation',
        `继续下一课：${nextLesson.title}`,
        { name: 'learn', lessonId: nextLesson.id },
        [`event:${latestImmediateTransfer.id}`, ...foundationEvidenceRefs(events, nextLesson.id, nextLesson.prerequisites)],
      );
    }
    return action('choose-next-training', '选择下一项训练', { name: 'paths' }, [`event:${latestImmediateTransfer.id}`]);
  }
  const snapshot = deriveDiagnosticSnapshot(events);
  if (snapshot.status === 'not-started') return action('start-diagnosis', '开始 3 分钟诊断', { name: 'today' }, snapshot.evidenceRefs);
  if (snapshot.status === 'incomplete') return action('continue-diagnosis', '继续入口诊断', { name: 'today' }, snapshot.evidenceRefs);

  const plan = buildBridgePlan(events);
  if (!plan) return action('continue-diagnosis', '继续入口诊断', { name: 'today' }, snapshot.evidenceRefs);
  const matchingStart = events
    .filter((event) => event.kind === 'training-session-started' && event.data.lessonId === plan.entryLessonId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
  const route = { name: 'training' as const, lessonId: plan.entryLessonId };
  return matchingStart
    ? action('continue-training', '继续 10 分钟训练', route, [...plan.evidenceRefs, `event:${matchingStart.id}`])
    : action('start-training', '开始 10 分钟训练', route, plan.evidenceRefs);
}

export function projectMentorNextAction(route: AppRoute, events: LearningEvent[], evidenceCount: number): string {
  const bridgeAction = projectBridgeLearningAction(events);
  if ((route.name === 'today' || route.name === 'insights') && (evidenceCount === 0 || bridgeAction.state === 'continue-foundation' || bridgeAction.state === 'choose-next-training')) return bridgeAction.label;
  if (route.name === 'today') return '完成今日计划中的第一项';
  if (route.name === 'review') return '先解释上次错误，再开始复练';
  if (route.name === 'insights') return '查看一个最需要补强的技能';
  return '继续当前学习步骤';
}

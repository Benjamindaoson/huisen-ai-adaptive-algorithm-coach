import type { LearnerMemory } from './learner-memory';
import type { AgentDecision } from './learning-orchestrator';
import { getSkill } from './skills';

export type PlanEvidenceCard = { ref: string; label: string; detail: string; kind: 'goal' | 'skill' | 'assistance' | 'review' | 'catalog' };
export type AdaptivePlanExplanation = {
  personalization: 'baseline' | 'evidence-backed';
  whyNow: string;
  skillGap: string;
  assistanceSignal: string;
  reviewSignal: string;
  confidence: number;
  evidence: PlanEvidenceCard[];
  changesWhen: string;
};

export function explainAdaptivePlan(decision: AgentDecision, events: LearnerMemory['events']): AdaptivePlanExplanation {
  const action = decision.actions[0];
  const personalization = decision.mode === 'baseline' ? 'baseline' : 'evidence-backed';
  const skillTitle = action ? getSkill(action.skillId).title : '待诊断技能';
  const profileEvidence = decision.evidence.find((item) => item.kind === 'profile');
  const masteryEvidence = decision.evidence.find((item) => item.kind === 'mastery');
  const assistanceEvidence = decision.evidence.find((item) => item.kind === 'intervention' || /提示|参考答案/.test(item.summary));
  const reviewEvent = [...events].reverse().find((event) =>
    (event.kind === 'mastery-check-failed' || event.kind === 'mastery-check-passed') &&
    (!action || event.data.skillIds?.includes(action.skillId)));
  const evidence: PlanEvidenceCard[] = [];
  if (profileEvidence) evidence.push({ ref: profileEvidence.ref, label: '学习目标与时间', detail: profileEvidence.summary, kind: 'goal' });
  if (masteryEvidence) evidence.push({ ref: masteryEvidence.ref, label: '技能证据', detail: masteryEvidence.summary, kind: 'skill' });
  if (assistanceEvidence) evidence.push({ ref: assistanceEvidence.ref, label: '帮助依赖', detail: assistanceEvidence.summary, kind: 'assistance' });
  if (reviewEvent) evidence.push({ ref: `event:${reviewEvent.id}`, label: '迁移 / 复测信号', detail: reviewEvent.data.reason ?? (reviewEvent.kind === 'mastery-check-passed' ? '独立复测已通过' : '延迟复测未通过'), kind: 'review' });
  for (const item of decision.evidence.filter((entry) => entry.kind === 'catalog')) evidence.push({ ref: item.ref, label: '可用任务', detail: item.summary, kind: 'catalog' });

  return {
    personalization,
    whyNow: personalization === 'baseline'
      ? '目前还没有足够的有效学习证据，先完成一次诊断任务，建立能力基线。'
      : reviewEvent?.kind === 'mastery-check-failed'
        ? `最近的延迟复测没有独立通过，所以现在优先修复 ${skillTitle}。`
        : `当前证据显示 ${skillTitle} 是最可能提升下一次独立完成率的投入点。`,
    skillGap: personalization === 'baseline' ? '尚未形成可信技能差距' : `${skillTitle}：${action?.reason ?? decision.summary}`,
    assistanceSignal: assistanceEvidence?.summary ?? '没有发现影响本次判断的提示或参考答案记录。',
    reviewSignal: reviewEvent ? String(reviewEvent.data.reason ?? (reviewEvent.kind === 'mastery-check-passed' ? '独立复测已通过' : '延迟复测未通过')) : '当前没有到期迁移或延迟复测信号。',
    confidence: decision.confidence,
    evidence,
    changesWhen: '新的独立提交、迁移题结果、提示使用或延迟复测会触发重新规划；AI 文案本身不会修改掌握度。',
  };
}

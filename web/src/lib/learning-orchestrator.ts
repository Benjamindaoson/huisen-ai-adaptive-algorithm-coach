import { buildDailyPlan, type DailyPlanKind } from './daily-plan';
import type { LearnerProfile, LearningEvent } from './learner-memory';
import type { SkillMastery } from './mastery';
import type { PracticeAttempt } from './practice';
import type { ProgressState } from './progress';
import { getSkill, inferProblemSkills, type SkillId } from './skills';
import { interventionForPass } from './learning-evidence';

export type AgentToolCall = {
  name: 'get_learner_profile' | 'get_mastery_evidence' | 'select_practice_candidates' | 'check_intervention_history';
  summary: string;
};

export type AgentEvidence = {
  ref: string;
  kind: 'profile' | 'mastery' | 'attempt' | 'intervention' | 'catalog';
  summary: string;
};

export type LearningAction = {
  type: 'practice' | 'mastery-check';
  kind: DailyPlanKind | 'mastery-check';
  problemId: string;
  title: string;
  skillId: SkillId;
  reason: string;
  priority: number;
  estimatedMinutes: number;
};

export type AgentDecision = {
  version: 1;
  traceId: string;
  role: 'learning-orchestrator';
  mode: 'baseline' | 'adaptive' | 'mastery-check';
  strategy: 'steady' | 'sprint';
  summary: string;
  confidence: number;
  generatedAt: string;
  tools: AgentToolCall[];
  evidence: AgentEvidence[];
  actions: LearningAction[];
};

export type AgentProblem = {
  id: string;
  title: string;
  searchText: string;
  excerpt?: string;
  skills?: readonly string[];
  completeness?: 'complete' | 'index-only';
  languages?: unknown[];
  quality?: { practiceReady: boolean };
};

type OrchestratorInput = {
  profile: LearnerProfile;
  events: LearningEvent[];
  catalog: AgentProblem[];
  mastery: SkillMastery[];
  attempts: PracticeAttempt[];
  progress: ProgressState;
  now?: Date;
  traceId?: string;
};

const DAY_MS = 24 * 60 * 60 * 1_000;

function makeTraceId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `trace-${crypto.randomUUID()}`
    : `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function examDays(profile: LearnerProfile, now: Date): number | null {
  if (profile.target !== 'od-exam' || !profile.examDate) return null;
  return Math.max(0, Math.ceil((Date.parse(`${profile.examDate}T00:00:00`) - now.getTime()) / DAY_MS));
}

function estimatedMinutes(score: number | null, type: LearningAction['type']): number {
  if (type === 'mastery-check') return 25;
  return score === 200 ? 50 : 35;
}

function recentAssistedPass(attempts: PracticeAttempt[], events: LearningEvent[]) {
  const passes = [...attempts]
    .filter((attempt) => attempt.mode === 'sample-submit' && attempt.outcome === 'passed')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  for (const passed of passes) {
    const intervention = interventionForPass(passed, attempts, events);
    if (intervention) return { passed, intervention };
  }
  return null;
}

export function orchestrateLearning({ profile, events, catalog, mastery, attempts, progress, now = new Date(), traceId = makeTraceId() }: OrchestratorInput): AgentDecision {
  const submissionEvidence = attempts.filter((attempt) => attempt.mode === 'sample-submit');
  const days = examDays(profile, now);
  const strategy = days !== null && days <= 14 ? 'sprint' : 'steady';
  const available = catalog.filter((problem) =>
    problem.completeness !== 'index-only' && problem.quality?.practiceReady !== false &&
    (problem.languages === undefined || problem.languages.length > 0));
  const tools: AgentToolCall[] = [
    { name: 'get_learner_profile', summary: `${profile.target} · 每日 ${profile.dailyMinutes} 分钟${profile.examDate ? ` · ${profile.examDate}` : ''}` },
    { name: 'get_mastery_evidence', summary: `${submissionEvidence.length} 次有效提交 · ${mastery.filter((item) => item.evidenceCount > 0).length} 项技能有证据` },
    { name: 'select_practice_candidates', summary: `${available.length} 道正文和答案条件可用的候选题` },
  ];
  const evidence: AgentEvidence[] = [
    { ref: `profile:${profile.updatedAt}`, kind: 'profile', summary: `目标 ${profile.target}，每日可学习 ${profile.dailyMinutes} 分钟。` },
    submissionEvidence.length
      ? { ref: `attempts:${submissionEvidence.length}`, kind: 'mastery', summary: `计划基于 ${submissionEvidence.length} 次样例提交和对应技能证据。` }
      : { ref: 'attempts:0', kind: 'mastery', summary: '尚无有效提交，本次只建立能力基线，不声称已完成个性化掌握判断。' },
    { ref: `catalog:${available.length}`, kind: 'catalog', summary: `已排除正文不完整或不可练习题，剩余 ${available.length} 道候选题。` },
  ];

  const plan = buildDailyPlan({ catalog: available, mastery, attempts, progress, now });
  let mode: AgentDecision['mode'] = submissionEvidence.length ? 'adaptive' : 'baseline';
  let actions: LearningAction[] = plan.map((item, index) => ({
    type: 'practice', kind: item.kind, problemId: item.problemId, title: item.title, skillId: item.skillId,
    reason: item.reason, priority: index + 1, estimatedMinutes: estimatedMinutes(null, 'practice'),
  }));

  const assisted = recentAssistedPass(attempts, events);
  if (assisted) {
    const source = available.find((problem) => problem.id === assisted.passed.problemId);
    const skillId = source ? inferProblemSkills(source)[0] : 'simulation';
    const completedTransfer = events.some((event) => event.kind === 'mastery-check-passed' &&
      Date.parse(event.createdAt) > Date.parse(assisted.passed.createdAt) && event.data.skillIds?.includes(skillId));
    const transfer = available.find((problem) => problem.id !== assisted.passed.problemId && inferProblemSkills(problem).includes(skillId));
    if (transfer && !completedTransfer) {
      const assistance = assisted.intervention.kind === 'reference-unlocked'
        ? '查看过参考答案'
        : `接受过 ${assisted.intervention.data.hintLevel ?? ''} 级提示`.replace('  级', '级');
      mode = 'mastery-check';
      tools.push({ name: 'check_intervention_history', summary: `${assisted.passed.problemId} 通过前${assistance}` });
      evidence.push({ ref: `event:${assisted.intervention.id}`, kind: 'intervention', summary: `${assisted.passed.problemId} 本次通过前${assistance}，不能直接视为独立掌握。` });
      actions = [{
        type: 'mastery-check', kind: 'mastery-check', problemId: transfer.id, title: transfer.title, skillId,
        reason: `上一题${assistance}；请独立完成一道${getSkill(skillId).title}迁移题，验证真正掌握。`,
        priority: 1, estimatedMinutes: estimatedMinutes(null, 'mastery-check'),
      }, ...actions.filter((action) => action.problemId !== transfer.id).slice(0, 2).map((action, index) => ({ ...action, priority: index + 2 }))];
    }
  }

  const summary = strategy === 'sprint' && days !== null
    ? `距离目标考试还有 ${days} 天，进入冲刺节奏；优先处理薄弱项、到期复习和独立掌握验证。`
    : mode === 'baseline'
      ? '先用真实提交建立能力基线；完成后总教练会根据证据重新规划。'
      : mode === 'mastery-check'
        ? '本次优先验证接受帮助后的独立迁移能力。'
        : '根据掌握度、错因和复习到期状态安排下一步。';

  return {
    version: 1, traceId, role: 'learning-orchestrator', mode, strategy, summary,
    confidence: mode === 'baseline' ? 0.45 : mode === 'mastery-check' ? 0.84 : 0.72,
    generatedAt: now.toISOString(), tools, evidence, actions,
  };
}

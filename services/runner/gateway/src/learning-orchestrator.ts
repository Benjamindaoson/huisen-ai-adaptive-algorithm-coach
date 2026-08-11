import { randomUUID } from 'node:crypto';
import type { AgentPlanRequest, LearnerProfile, LearningEvent } from './learning-validation.js';

const DAY_MS = 24 * 60 * 60 * 1_000;

export function buildAgentPlan(profile: LearnerProfile, events: LearningEvent[], request: AgentPlanRequest) {
  const now = new Date(request.now ?? Date.now());
  const days = profile.target === 'od-exam' && profile.examDate
    ? Math.max(0, Math.ceil((Date.parse(`${profile.examDate}T00:00:00`) - now.getTime()) / DAY_MS))
    : null;
  const strategy = days !== null && days <= 14 ? 'sprint' : 'steady';
  const attempts = events.filter((event) => event.kind === 'attempt-recorded');
  const passedAttempts = attempts.filter((event) => event.data.outcome === 'passed')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  let assisted: { pass: LearningEvent; intervention: LearningEvent } | null = null;
  for (const pass of passedAttempts) {
    const previousPassTime = passedAttempts
      .filter((candidate) => candidate.id !== pass.id && candidate.problemId === pass.problemId && Date.parse(candidate.createdAt) < Date.parse(pass.createdAt))
      .reduce((latest, candidate) => Math.max(latest, Date.parse(candidate.createdAt)), Number.NEGATIVE_INFINITY);
    const intervention = events.filter((event) => ['hint-received', 'reference-unlocked'].includes(event.kind) &&
      event.problemId === pass.problemId && Date.parse(event.createdAt) <= Date.parse(pass.createdAt) && Date.parse(event.createdAt) > previousPassTime)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    if (intervention) { assisted = { pass, intervention }; break; }
  }
  const assistedSkills = Array.isArray(assisted?.pass.data.skillIds) ? assisted.pass.data.skillIds.filter((skill): skill is string => typeof skill === 'string') : [];
  const completedTransfer = assisted && events.some((event) => event.kind === 'mastery-check-passed' &&
    Date.parse(event.createdAt) > Date.parse(assisted.pass.createdAt) &&
    Array.isArray(event.data.skillIds) && event.data.skillIds.some((skill) => assistedSkills.includes(skill as string)));
  const transfer = assisted && !completedTransfer ? request.candidates.find((candidate) => candidate.problemId !== assisted?.pass.problemId &&
    (!assistedSkills.length || assistedSkills.includes(candidate.skillId))) : undefined;
  const mode = assisted && transfer ? 'mastery-check' : attempts.length ? 'adaptive' : 'baseline';
  const orderedCandidates = transfer
    ? [transfer, ...request.candidates.filter((candidate) => candidate.problemId !== transfer.problemId && candidate.problemId !== assisted?.pass.problemId)]
    : request.candidates;
  return {
    version: 1,
    traceId: `trace-${randomUUID()}`,
    role: 'learning-orchestrator',
    mode,
    strategy,
    summary: strategy === 'sprint' && days !== null
      ? `距离目标考试还有 ${days} 天，进入冲刺节奏。`
      : mode === 'baseline' ? '先用真实提交建立能力基线。' : '根据学习证据安排下一步。',
    confidence: mode === 'baseline' ? 0.45 : 0.75,
    generatedAt: now.toISOString(),
    tools: [
      { name: 'get_learner_profile', summary: `${profile.target} · 每日 ${profile.dailyMinutes} 分钟` },
      { name: 'get_mastery_evidence', summary: `${attempts.length} 条服务端提交证据` },
      { name: 'select_practice_candidates', summary: `${request.candidates.length} 道候选题` },
    ],
    evidence: [
      { ref: `profile:${profile.updatedAt}`, kind: 'profile', summary: `目标 ${profile.target}` },
      { ref: `events:${events.length}`, kind: 'intervention', summary: `${events.length} 条学习事件` },
    ],
    actions: orderedCandidates.slice(0, 3).map((candidate, index) => ({
      type: mode === 'mastery-check' && index === 0 ? 'mastery-check' : 'practice',
      kind: mode === 'mastery-check' && index === 0 ? 'mastery-check' : mode === 'baseline' ? 'baseline' : 'weakness',
      ...candidate,
      priority: index + 1,
      estimatedMinutes: mode === 'mastery-check' && index === 0 ? 25 : 35,
      reason: mode === 'mastery-check' && index === 0 ? '接受帮助后需要独立迁移验证。' : mode === 'baseline' ? '建立真实能力基线。' : '巩固当前薄弱技能。',
    })),
  };
}

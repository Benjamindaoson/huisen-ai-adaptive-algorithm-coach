import { describe, expect, it } from 'vitest';
import type { AgentDecision } from './learning-orchestrator';
import { explainAdaptivePlan } from './adaptive-plan-explanation';

const decision: AgentDecision = {
  version: 1, traceId: 'trace-1', role: 'learning-orchestrator', mode: 'adaptive', strategy: 'steady',
  summary: '根据证据安排下一步', confidence: 0.72, generatedAt: '2026-08-13T00:00:00Z',
  tools: [{ name: 'get_mastery_evidence', summary: '3 次有效提交' }],
  evidence: [
    { ref: 'profile:1', kind: 'profile', summary: '目标 interview，每日 45 分钟。' },
    { ref: 'event:hint-2', kind: 'intervention', summary: '上一任务使用过 2 级提示。' },
    { ref: 'attempts:3', kind: 'mastery', summary: '数组技能最近两次未通过。' },
  ],
  actions: [{ type: 'practice', kind: 'weakness', problemId: 'p1', title: '数组边界', skillId: 'array', reason: '边界错误重复出现', priority: 1, estimatedMinutes: 35 }],
};

describe('adaptive-plan explanation', () => {
  it('labels cold start honestly without claiming observed personalization', () => {
    const explanation = explainAdaptivePlan({ ...decision, mode: 'baseline', confidence: 0.45, evidence: [{ ref: 'attempts:0', kind: 'mastery', summary: '尚无有效提交。' }] }, []);
    expect(explanation.personalization).toBe('baseline');
    expect(explanation.whyNow).toContain('建立能力基线');
    expect(explanation.evidence.every((item) => item.ref !== 'ai:inferred')).toBe(true);
  });

  it('explains the goal, skill gap, assistance and review timing from stable evidence', () => {
    const explanation = explainAdaptivePlan(decision, [{
      id: 'review-1', learnerId: 'learner-a', kind: 'mastery-check-failed', problemId: 'p0',
      data: { skillIds: ['array'], reason: '延迟复测未通过' }, createdAt: '2026-08-12T00:00:00Z',
    }]);
    expect(explanation.personalization).toBe('evidence-backed');
    expect(explanation.skillGap).toContain('数组');
    expect(explanation.assistanceSignal).toContain('2 级提示');
    expect(explanation.reviewSignal).toContain('延迟复测');
    expect(explanation.evidence.map((item) => item.ref)).toEqual(expect.arrayContaining(['event:hint-2', 'event:review-1']));
  });
});

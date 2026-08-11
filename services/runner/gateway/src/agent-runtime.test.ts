import { describe, expect, it } from 'vitest';
import { executeAgentTool, runLearningAgent, type AgentPolicy, type AgentRuntimeRequest, type AgentToolName } from './agent-runtime.js';

function request(patch: Partial<AgentRuntimeRequest> = {}): AgentRuntimeRequest {
  return {
    version: 1,
    hintLevel: 1,
    problem: { id: 'od-array', title: '数组窗口', description: '寻找连续数组窗口', input: '第一行数量，第二行数组', output: '输出最大值', skillIds: ['array', 'io-parsing'] },
    attempt: { id: 'attempt-1', language: 'javascript', outcome: 'failed', summary: '0/2', code: "const a = require('fs').readFileSync(0,'utf8').split(' ');" },
    judge: { outcome: 'failed', passedCount: 0, totalCount: 2, evidenceRef: 'judge:od-array:public' },
    mastery: { prior: 0.25, observations: [{ kind: 'failure', evidenceRef: 'attempt:attempt-1' }] },
    evidence: [
      { ref: 'problem:od-array', kind: 'problem', title: '数组窗口', text: '连续数组与输入边界', skillIds: ['array'], verification: 'candidate' },
      { ref: 'solution:od-array:verified', kind: 'solution', title: '验证解法', text: '双指针维护连续窗口', skillIds: ['array'], verification: 'verified' },
    ],
    ...patch,
  };
}

describe('runLearningAgent', () => {
  it('executes real tools and emits typed role handoffs in deterministic mode', async () => {
    const run = await runLearningAgent(request(), { traceId: () => 'trace-1', now: (() => { let value = 0; return () => value += 5; })() });
    expect(run).toMatchObject({ version: 1, traceId: 'trace-1', mode: 'deterministic', judgeOutcome: 'failed' });
    expect(run.tools.map((tool) => [tool.role, tool.name, tool.status])).toEqual([
      ['diagnostician', 'retrieve_evidence', 'completed'],
      ['diagnostician', 'inspect_code', 'completed'],
      ['tutor', 'select_tutor_action', 'completed'],
      ['assessor', 'project_mastery', 'completed'],
    ]);
    expect(run.handoffs.map((handoff) => `${handoff.from}->${handoff.to}`)).toEqual([
      'planner->diagnostician', 'diagnostician->tutor', 'tutor->assessor',
    ]);
    expect(run.hypothesis.evidenceRefs).toContain('judge:od-array:public');
    expect(run.nextAction).toContain('输入');
    expect(run.masteryImpact.probability).toBeLessThan(0.25);
    expect(JSON.stringify(run)).not.toContain(request().attempt.code);
  });

  it('enforces the maximum step budget', async () => {
    await expect(runLearningAgent(request({ maxSteps: 3 }))).rejects.toThrow('Agent step budget exceeded');
  });

  it('does not expose a proven diagnosis when only heuristic evidence exists', async () => {
    const run = await runLearningAgent(request());
    expect(run.hypothesis.proven).toBe(false);
    expect(run.judgeOutcome).toBe(request().judge.outcome);
  });

  it('uses a model policy to choose eligible tools after each observation', async () => {
    const choices: AgentToolName[] = ['inspect_code', 'retrieve_evidence', 'select_tutor_action', 'project_mastery'];
    const policy: AgentPolicy = async ({ available }) => {
      const name = choices.shift();
      return available.find((item) => item.name === name) ?? null;
    };
    const run = await runLearningAgent(request(), { policy });
    expect(run.mode).toBe('model-assisted');
    expect(run.tools.map((item) => item.name)).toEqual(['inspect_code', 'retrieve_evidence', 'select_tutor_action', 'project_mastery']);
  });

  it('falls back safely when a model policy asks for an ineligible tool', async () => {
    const run = await runLearningAgent(request(), { policy: async () => ({ role: 'tutor', name: 'inspect_code' }) });
    expect(run.mode).toBe('fallback');
    expect(run.tools).toHaveLength(4);
    expect(run.tools.every((item) => item.status === 'completed')).toBe(true);
  });
});

describe('executeAgentTool', () => {
  it('rejects a tool outside the role allowlist and records no fabricated completion', async () => {
    await expect(executeAgentTool('tutor', 'inspect_code', request(), { outputs: new Map() })).rejects.toThrow('Tool inspect_code is not allowed for tutor');
  });
});

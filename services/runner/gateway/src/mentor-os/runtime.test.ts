import { describe, expect, it, vi } from 'vitest';
import { createMentorOSStore } from './store.js';
import { executeMentorOSAct } from './runtime.js';

describe('Mentor OS dynamic runtime', () => {
  it('persists context, actual tools, verified reasoning, and an explicit stop reason', async () => {
    const store = createMentorOSStore();
    const run = await store.start({ learnerId: 'learner-a', goal: '独立掌握双指针', route: { kind: 'practice', ref: 'p-1' }, idempotencyKey: 'start-1' });
    const runTurn = vi.fn(async () => ({
      version: 1 as const,
      session: {
        version: 1 as const, id: 'mentor-session-1', learnerId: 'learner-a', problemId: 'p-1', phase: 'awaiting-prediction' as const,
        mode: 'deepseek' as const, model: 'deepseek-chat', judgeOutcome: 'failed', nextAction: '先预测 right 的值', timeline: [
          { id: 'e-1', type: 'hypothesis' as const, title: '边界假设', detail: 'right 可能越界', at: '2026-08-12T00:00:00Z', evidenceRefs: ['ast:p-1:line-8'], status: 'supported' as const },
          { id: 'e-2', type: 'verification' as const, title: '反例验证', detail: '最小数组复现', at: '2026-08-12T00:00:01Z', evidenceRefs: ['run:test-1'], status: 'complete' as const },
        ], twin: { version: 1 as const, learnerId: 'learner-a', updatedAt: '2026-08-12T00:00:00Z', skills: {}, lastChanges: [] },
      },
      executions: [{ id: 'tool-1', tool: 'verify_hypothesis' as const, arguments: {}, summary: '反例验证成功', evidenceRefs: ['run:test-1'], durationMs: 12 }],
      provider: { mode: 'deepseek' as const, model: 'deepseek-chat', calls: 2, inputTokens: 40, outputTokens: 20, latencyMs: 80 },
    }));

    const result = await executeMentorOSAct({
      store, runId: run.id, expectedSequence: run.sequence, idempotencyKey: 'act-1', assessment: 'learning',
      context: [{ version: 1, id: 'attempt-a1', kind: 'attempt', priority: 90, evidenceRefs: ['attempt:a1'], data: { outcome: 'failed', problemId: 'p-1' } }],
      mentorInput: { version: 1, learnerId: 'learner-a', problem: { id: 'p-1', title: '双指针', description: '', input: '', output: '', skillIds: ['two-pointer'], publicInputs: ['1\n'] }, attempt: { id: 'a1', language: 'python', outcome: 'failed', summary: '0/1', sourceCode: 'print(1)' } },
      runTurn,
      pricing: { inputMicrosPerMillionTokens: 1_000_000, outputMicrosPerMillionTokens: 2_000_000 },
    });

    const replay = await executeMentorOSAct({
      store, runId: run.id, expectedSequence: run.sequence, idempotencyKey: 'act-1', assessment: 'learning',
      context: [{ version: 1, id: 'attempt-a1', kind: 'attempt', priority: 90, evidenceRefs: ['attempt:a1'], data: { outcome: 'failed', problemId: 'p-1' } }],
      mentorInput: { version: 1, learnerId: 'learner-a', problem: { id: 'p-1', title: '双指针', description: '', input: '', output: '', skillIds: ['two-pointer'], publicInputs: ['1\n'] }, attempt: { id: 'a1', language: 'python', outcome: 'failed', summary: '0/1', sourceCode: 'print(1)' } },
      runTurn,
      pricing: { inputMicrosPerMillionTokens: 1_000_000, outputMicrosPerMillionTokens: 2_000_000 },
    });

    expect(runTurn).toHaveBeenCalledOnce();
    expect(replay).toEqual(result);
    expect(result.events.map((event) => event.type)).toEqual(expect.arrayContaining(['context-compiled', 'tool-started', 'tool-completed', 'hypothesis', 'verified', 'stopped']));
    expect(result.checkpoint).toMatchObject({ stopReason: 'awaiting-learner', nextAction: '先预测 right 的值' });
    expect(result.events.find((event) => event.type === 'tool-completed')?.evidenceRefs).toContain('run:test-1');
    expect(result.events.find((event) => event.type === 'context-compiled')?.detail).toContain('deepseek-chat');
    expect(result.events.find((event) => event.type === 'context-compiled')?.metadata).toMatchObject({
      provider: 'deepseek', model: 'deepseek-chat', inputTokens: 40, outputTokens: 20, latencyMs: 80, estimatedCostMicros: 80,
    });
    expect(result.events.find((event) => event.type === 'tool-completed')?.metadata).toMatchObject({
      tool: 'verify_hypothesis', argumentsHash: expect.stringMatching(/^[a-f0-9]{64}$/), resultHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(result.mentorResult?.session.id).toBe('mentor-session-1');
  });

  it('denies model execution during independent assessment', async () => {
    const store = createMentorOSStore();
    const run = await store.start({ learnerId: 'learner-a', goal: '独立测评', route: { kind: 'practice', ref: 'p-1' }, idempotencyKey: 'start-2' });
    const runTurn = vi.fn();
    const result = await executeMentorOSAct({ store, runId: run.id, expectedSequence: 1, idempotencyKey: 'act-2', assessment: 'independent', context: [], mentorInput: {} as never, runTurn });
    expect(runTurn).not.toHaveBeenCalled();
    expect(result.events.at(-1)).toMatchObject({ type: 'policy-denied', stopReason: 'policy-denied' });
  });
});

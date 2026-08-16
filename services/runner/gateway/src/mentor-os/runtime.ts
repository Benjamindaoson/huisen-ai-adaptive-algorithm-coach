import { createHash } from 'node:crypto';
import type { MentorTurnInput, MentorTurnResult } from '../mentor/mentor-engine.js';
import { compileMentorContext } from './context-compiler.js';
import { authorizeMentorAction } from './policy.js';
import type { MentorContextContribution, MentorLifecycleType, MentorStopReason } from './contracts.js';
import type { MentorOSRun, MentorOSStore } from './store.js';
import type { MentorOSEventMetadata } from './store.js';

type Assessment = 'learning' | 'ai-collaboration' | 'independent' | 'independent-transfer';

type Input = {
  store: MentorOSStore;
  runId: string;
  expectedSequence: number;
  idempotencyKey: string;
  assessment: Assessment;
  context: MentorContextContribution[];
  mentorInput: MentorTurnInput;
  runTurn: (input: MentorTurnInput) => Promise<MentorTurnResult>;
  pricing?: { inputMicrosPerMillionTokens: number; outputMicrosPerMillionTokens: number };
};

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function stopReasonFor(result: MentorTurnResult): MentorStopReason {
  if (result.session.phase === 'complete') return 'completed';
  if (result.session.mode === 'fallback') return 'unavailable';
  if (result.session.phase === 'awaiting-prediction' || result.session.phase === 'awaiting-edit' || result.session.phase === 'transfer' || result.session.pendingPrompt) return 'awaiting-learner';
  return 'insufficient-evidence';
}

export async function executeMentorOSAct(input: Input): Promise<MentorOSRun & { mentorResult?: MentorTurnResult }> {
  const operation = await input.store.claimOperation(input.runId, input.idempotencyKey);
  if (operation.status === 'completed') return operation.value as MentorOSRun & { mentorResult?: MentorTurnResult };
  if (operation.status === 'pending') throw new Error('Mentor OS action is already in progress');
  let sequence = input.expectedSequence;
  const commit = async (type: MentorLifecycleType, detail: string, evidenceRefs: string[], stopReason?: MentorStopReason, metadata?: MentorOSEventMetadata) => {
    const result = await input.store.commit(input.runId, {
      idempotencyKey: `${input.idempotencyKey}:${sequence + 1}:${type}`,
      expectedSequence: sequence,
      type,
      detail,
      evidenceRefs,
      ...(stopReason ? { stopReason } : {}),
      ...(metadata ? { metadata } : {}),
    });
    sequence = result.run.sequence;
    return result.run;
  };

  try {
    const policy = authorizeMentorAction({ assessment: input.assessment, action: 'model', usedTools: 0, elapsedMs: 0, referenceAuthority: 'candidate' });
    if (!policy.allowed) {
      const denied = await commit('policy-denied', policy.reason, [`policy:${input.assessment}`], policy.stopReason ?? 'policy-denied');
      await input.store.completeOperation(input.runId, input.idempotencyKey, denied);
      return denied;
    }

    const compiled = compileMentorContext(input.context, { maxItems: 16, maxCharacters: 12_000 });
    const result = await input.runTurn(input.mentorInput);
    const estimatedCostMicros = input.pricing ? Math.ceil(
      result.provider.inputTokens * input.pricing.inputMicrosPerMillionTokens / 1_000_000
      + result.provider.outputTokens * input.pricing.outputMicrosPerMillionTokens / 1_000_000,
    ) : 0;
    await commit('context-compiled', `已编译 ${compiled.items.length} 项高信号上下文；运行模式 ${result.provider.mode}${result.provider.model ? ` · ${result.provider.model}` : ''}；省略 ${compiled.omitted.reduce((sum, item) => sum + item.count, 0)} 项。`, compiled.evidenceRefs, undefined, {
      provider: result.provider.mode, ...(result.provider.model ? { model: result.provider.model } : {}),
      inputTokens: result.provider.inputTokens, outputTokens: result.provider.outputTokens,
      latencyMs: result.provider.latencyMs, estimatedCostMicros,
    });

    for (const execution of result.executions) {
      const argumentsHash = hash(execution.arguments);
      await commit('tool-started', `执行 ${execution.tool}`, execution.evidenceRefs, undefined, { tool: execution.tool, argumentsHash });
      await commit('tool-completed', `${execution.tool} · ${execution.durationMs} ms · ${execution.summary}`, execution.evidenceRefs, undefined, {
        tool: execution.tool, argumentsHash, resultHash: hash({ summary: execution.summary, evidenceRefs: execution.evidenceRefs }), latencyMs: execution.durationMs,
      });
    }
    for (const event of result.session.timeline.slice(-20)) {
      if (event.type === 'hypothesis') await commit('hypothesis', `${event.title}：${event.detail}`, event.evidenceRefs);
      if (event.type === 'missing-evidence') await commit('missing-evidence', `${event.title}：${event.detail}`, event.evidenceRefs);
      if (event.type === 'verification') await commit('verified', `${event.title}：${event.detail}`, event.evidenceRefs);
    }
    const completed = await commit('stopped', result.session.nextAction, [`mentor-session:${result.session.id}`, `attempt:${input.mentorInput.attempt.id}`], stopReasonFor(result));
    const output = { ...completed, mentorResult: result };
    await input.store.completeOperation(input.runId, input.idempotencyKey, output);
    return output;
  } catch (error) {
    await input.store.abandonOperation(input.runId, input.idempotencyKey);
    throw error;
  }
}

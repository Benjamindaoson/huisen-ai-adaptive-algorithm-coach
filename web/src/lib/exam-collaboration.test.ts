import { describe, expect, it } from 'vitest';
import { createExamSession } from './exam';
import { recordCollaborationEvent } from './exam-collaboration';

describe('AI collaboration exam evidence', () => {
  it('records every bounded collaboration step with its evidence', () => {
    let exam = createExamSession(['a'], 90, 1_000, 'collab-1', 'ai-collaboration');
    const events = [
      { id: 'plan-1', type: 'plan', evidence: [{ id: 'prompt-1', kind: 'prompt', summary: 'Plan a two-pointer approach.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:prompt' }] },
      { id: 'delegate-1', type: 'delegation', evidence: [{ id: 'tool-1', kind: 'tool-action', summary: 'Inspected complexity.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:tool:t1' }] },
      { id: 'review-1', type: 'review', evidence: [{ id: 'diff-1', kind: 'diff', summary: 'Bounded loop-condition diff.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:tool:d1' }, { id: 'decision-1', kind: 'learner-decision', summary: 'Rejected the change.', source: 'learner-action', artifactRef: 'exam-agent:r1:decision:reject' }] },
      { id: 'test-1', type: 'test', evidence: [{ id: 'test-evidence-1', kind: 'test', summary: 'Executed duplicate-values regression case.', source: 'agent-runtime', artifactRef: 'exam-agent:r1:tool:test' }] },
      { id: 'correct-1', type: 'correction', evidence: [{ id: 'diff-2', kind: 'diff', summary: 'Corrected pointer advance.', source: 'agent-runtime', artifactRef: 'exam-agent:r2:tool:d2' }] },
      { id: 'oral-1', type: 'oral-explanation', evidence: [{ id: 'oral-prompt-1', kind: 'prompt', summary: 'Agent asked for the invariant.', source: 'agent-runtime', artifactRef: 'exam-agent:r2:oral-prompt' }, { id: 'oral-evidence-1', kind: 'oral-response', summary: 'Explained loop invariant.', source: 'learner-action', artifactRef: 'exam-agent:r2:oral-response' }] },
    ] as const;

    for (const event of events) exam = recordCollaborationEvent(exam, { ...event, recordedAt: 2_000 });

    expect(exam.collaborationEvents).toHaveLength(6);
    expect(exam.collaborationEvents.map((event) => event.type)).toEqual([
      'plan', 'delegation', 'review', 'test', 'correction', 'oral-explanation',
    ]);
    expect(exam.collaborationEvents[2].evidence.map((item) => item.id)).toEqual(['diff-1', 'decision-1']);
  });

  it('rejects learner-authored summaries that are not bound to runtime artifacts', () => {
    const exam = createExamSession(['a'], 90, 1_000, 'collab-1', 'ai-collaboration');
    expect(() => recordCollaborationEvent(exam, {
      id: 'fake-plan', type: 'plan', recordedAt: 2_000,
      evidence: [{ id: 'self-report', kind: 'prompt', summary: 'I used an agent.' }],
    })).toThrow(/runtime artifact/i);
  });

  it('rejects collaboration evidence from an independent no-AI session', () => {
    const exam = createExamSession(['a'], 90, 1_000, 'independent-1');
    expect(() => recordCollaborationEvent(exam, {
      id: 'plan-1',
      type: 'plan',
      recordedAt: 2_000,
      evidence: [{ id: 'prompt-1', kind: 'prompt', summary: 'Plan.' }],
    })).toThrow(/independent/i);
  });
});

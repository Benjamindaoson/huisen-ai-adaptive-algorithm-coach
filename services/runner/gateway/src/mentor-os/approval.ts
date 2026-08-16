import type { MentorOSStore } from './store.js';

type Proposal = { id: string; expectedSequence: number; summary: string; diff: string; evidenceRefs: string[] };
type Decision = { approvalId: string; expectedSequence: number; decision: 'accept' | 'reject'; evidenceRefs: string[] };

const validId = (value: string) => /^[a-zA-Z0-9._:-]{1,200}$/.test(value);

export async function requestEditApproval(store: MentorOSStore, runId: string, proposal: Proposal) {
  if (!validId(proposal.id) || !proposal.summary.trim() || !proposal.diff.trim() || proposal.diff.length > 20_000) throw new Error('Invalid edit approval request');
  return store.commit(runId, {
    idempotencyKey: `approval-request:${proposal.id}`,
    expectedSequence: proposal.expectedSequence,
    type: 'approval-requested',
    detail: JSON.stringify({ approvalId: proposal.id, summary: proposal.summary.slice(0, 1_000), diff: proposal.diff }),
    evidenceRefs: proposal.evidenceRefs,
    stopReason: 'awaiting-approval',
  });
}

export async function resolveEditApproval(store: MentorOSStore, runId: string, decision: Decision) {
  const run = await store.get(runId);
  const pending = [...(run?.events ?? [])].reverse().find((event) => event.type === 'approval-requested' && (() => {
    try { return (JSON.parse(event.detail) as { approvalId?: string }).approvalId === decision.approvalId; } catch { return false; }
  })());
  const alreadyResolved = run?.events.some((event) => event.type === 'approval-resolved' && event.detail.includes(`"approvalId":"${decision.approvalId}"`));
  if (!pending || alreadyResolved) throw new Error('Mentor edit approval not pending');
  return store.commit(runId, {
    idempotencyKey: `approval-resolution:${decision.approvalId}:${decision.decision}`,
    expectedSequence: decision.expectedSequence,
    type: 'approval-resolved',
    detail: JSON.stringify({ approvalId: decision.approvalId, decision: decision.decision }),
    evidenceRefs: [...decision.evidenceRefs, pending.id],
  });
}

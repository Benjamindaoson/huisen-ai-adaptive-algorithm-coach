import { describe, expect, it } from 'vitest';
import { createMentorOSStore } from './store.js';
import { requestEditApproval, resolveEditApproval } from './approval.js';

describe('Mentor edit approval', () => {
  it('records learner accept or reject before an edit can be applied', async () => {
    const store = createMentorOSStore();
    const run = await store.start({ learnerId: 'learner-a', goal: '修复边界错误', route: { kind: 'practice', ref: 'p-1' }, idempotencyKey: 'start' });
    const requested = await requestEditApproval(store, run.id, { id: 'edit-1', expectedSequence: 1, summary: '把 <= 改成 <', diff: '- i <= n\n+ i < n', evidenceRefs: ['ast:line-8'] });
    expect(requested.run.checkpoint.stopReason).toBe('awaiting-approval');
    expect(() => resolveEditApproval(store, run.id, { approvalId: 'wrong', expectedSequence: 2, decision: 'accept', evidenceRefs: [] })).rejects.toThrow('approval');
    const resolved = await resolveEditApproval(store, run.id, { approvalId: 'edit-1', expectedSequence: 2, decision: 'reject', evidenceRefs: ['learner:decision-1'] });
    expect(resolved.event).toMatchObject({ type: 'approval-resolved', detail: expect.stringContaining('reject') });
    expect(resolved.event.evidenceRefs).toContain('learner:decision-1');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { createMentorOSClient, parseMentorSSE } from './mentor-os-client';

describe('Mentor OS client', () => {
  it('starts and contributes context with learner authorization', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'run-1', learnerId: 'l-1', sequence: 1, events: [], checkpoint: { sequence: 1, nextAction: 'compile' } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ run: { id: 'run-1', learnerId: 'l-1', sequence: 2, events: [], checkpoint: { sequence: 2, nextAction: 'ready' } } }), { status: 200 }));
    const client = createMentorOSClient({ fetcher, identity: { headers: async () => ({ authorization: 'Bearer signed' }) } });
    const run = await client.start('http://localhost:8787', { learnerId: 'l-1', goal: '通过算法初试', route: { kind: 'today', ref: 'daily' }, idempotencyKey: 'start-1' });
    await client.command('http://localhost:8787', { version: 1, runId: run.id, idempotencyKey: 'ctx-1', kind: 'contribute-context', expectedSequence: 1, detail: '今日页证据', evidenceRefs: ['route:daily'] }, 'l-1');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ authorization: 'Bearer signed' });
  });

  it('parses cursor-addressed SSE lifecycle events and checkpoint fallback', () => {
    const parsed = parseMentorSSE('id: 2\nevent: hypothesis\ndata: {"id":"e2","sequence":2,"type":"hypothesis","detail":"边界错误","evidenceRefs":["ast:8"],"at":"now"}\n\nevent: checkpoint\ndata: {"sequence":2,"nextAction":"预测状态"}\n\n');
    expect(parsed.events).toEqual([expect.objectContaining({ sequence: 2, type: 'hypothesis' })]);
    expect(parsed.checkpoint).toEqual({ sequence: 2, nextAction: '预测状态' });
  });

  it('returns the real Mentor result from an OS act command', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 'run-1', learnerId: 'l-1', sequence: 8, events: [], checkpoint: { sequence: 8, nextAction: '预测状态' }, mentorResult: { session: { id: 'session-1', mode: 'deepseek' }, executions: [] } }), { status: 200 }));
    const client = createMentorOSClient({ fetcher, identity: { headers: async () => ({}) } });
    const result = await client.act('http://localhost:8787', { runId: 'run-1', learnerId: 'l-1', expectedSequence: 2, idempotencyKey: 'act-a1', assessment: 'learning', mentorInput: { version: 1 }, context: [] } as never);
    expect(result.mentorResult?.session.id).toBe('session-1');
  });
});

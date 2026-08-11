import { describe, expect, it, vi } from 'vitest';
import { emptyLearnerMemory } from './learner-memory';
import { requestRemotePlan, syncLearnerProfile, syncLearningEvent, syncLearningEventsBatch } from './learning-client';

const localIdentity = { headers: async () => ({}) };

describe('learning client', () => {
  it('does nothing when the optional backend is not configured', async () => {
    const fetcher = vi.fn();
    expect(await syncLearnerProfile('', emptyLearnerMemory('learner-a').profile, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('syncs profiles and events without sending source code', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const memory = emptyLearnerMemory('learner-a');
    await syncLearnerProfile('http://127.0.0.1:8787', memory.profile, fetcher, localIdentity);
    await syncLearningEvent('http://127.0.0.1:8787', {
      id: 'event-a', learnerId: 'learner-a', kind: 'hint-received', problemId: 'od-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00Z',
    }, fetcher, localIdentity);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('sourceCode');
  });

  it('returns null instead of breaking local planning when remote orchestration fails', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    expect(await requestRemotePlan('http://127.0.0.1:8787', {
      learnerId: 'learner-a', candidates: [],
    }, fetcher, undefined, localIdentity)).toBeNull();
  });

  it('syncs initial history with one bounded batch request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"accepted":1,"created":1}', { status: 200 }));
    const event = { id: 'event-a', learnerId: 'learner-a', kind: 'hint-received' as const, problemId: 'od-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00Z' };
    expect(await syncLearningEventsBatch('http://127.0.0.1:8787', 'learner-a', [event], fetcher, localIdentity)).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0][0])).toContain('/events/batch');
  });

  it('retries transient sync failures before acknowledging the outbox batch', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"accepted":1,"created":1}', { status: 200 }));
    const event = { id: 'event-retry', learnerId: 'learner-a', kind: 'hint-received' as const, problemId: 'od-a', data: { hintLevel: 2 }, createdAt: '2026-08-11T00:00:00Z' };
    expect(await syncLearningEventsBatch('http://127.0.0.1:8787', 'learner-a', [event], fetcher, localIdentity)).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('attaches learner ownership credentials to profile synchronization', async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => new Response('{}', { status: 200 }));
    const identity = { headers: async () => ({ authorization: 'Bearer signed-token' }) };
    await syncLearnerProfile('http://127.0.0.1:8787', emptyLearnerMemory('learner-a').profile, fetcher, identity);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'Bearer signed-token' });
  });
});

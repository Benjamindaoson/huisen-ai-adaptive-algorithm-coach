import { describe, expect, it, vi } from 'vitest';
import { createProviderAgentPolicy } from './agent-policy-provider.js';

describe('createProviderAgentPolicy', () => {
  it('returns only a currently available role/tool choice', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"role":"diagnostician","name":"inspect_code"}' } }] }), { status: 200 }));
    const policy = createProviderAgentPolicy({ apiUrl: 'http://model.local/v1', apiKey: 'secret', model: 'agent-model', fetcher });
    const choice = await policy({
      problem: { id: 'p1', title: '数组题', outcome: 'failed' }, step: 0, completed: [],
      available: [{ role: 'diagnostician', name: 'inspect_code' }, { role: 'diagnostician', name: 'retrieve_evidence' }],
    });
    expect(choice).toEqual({ role: 'diagnostician', name: 'inspect_code' });
    expect(fetcher).toHaveBeenCalledWith('http://model.local/v1/chat/completions', expect.objectContaining({ method: 'POST' }));
    expect(String(fetcher.mock.calls[0][1]?.body)).not.toContain('secret');
  });

  it('returns null for unavailable or ineligible provider output', async () => {
    const invalid = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '{"role":"tutor","name":"inspect_code"}' } }] }), { status: 200 }));
    const policy = createProviderAgentPolicy({ apiUrl: 'http://model.local', apiKey: '', model: 'agent-model', fetcher: invalid });
    expect(await policy({ problem: { id: 'p1', title: '题', outcome: 'failed' }, step: 0, completed: [], available: [{ role: 'diagnostician', name: 'inspect_code' }] })).toBeNull();
    const offline = createProviderAgentPolicy({ apiUrl: '', apiKey: '', model: '', fetcher: invalid });
    expect(await offline({ problem: { id: 'p1', title: '题', outcome: 'failed' }, step: 0, completed: [], available: [] })).toBeNull();
  });
});

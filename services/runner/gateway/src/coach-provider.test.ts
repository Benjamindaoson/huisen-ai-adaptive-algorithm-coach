import { describe, expect, it, vi } from 'vitest';
import { diagnoseWithProvider } from './coach-provider.js';
import type { CoachRequest } from './coach-validation.js';

const request: CoachRequest = {
  version: 1,
  hintLevel: 1,
  problem: { id: 'p1', title: '题目', description: '描述', input: '输入', output: '输出' },
  attempt: { id: 'a1', language: 'python', outcome: 'wrong-answer', summary: '0/1', code: 'print(1)' },
  mastery: [],
};
const config = { apiUrl: 'http://model.local/v1/', apiKey: 'server-secret', model: 'coach-model' };

function modelResponse(content: unknown): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }), { status: 200 });
}

describe('diagnoseWithProvider', () => {
  it('requires complete server-side provider configuration', async () => {
    await expect(diagnoseWithProvider(request, { apiUrl: '', apiKey: '', model: '' }, vi.fn())).rejects.toThrow('Coach provider is not configured');
  });

  it('sends a constrained JSON request and returns validated structured output', async () => {
    const fetcher = vi.fn().mockResolvedValue(modelResponse({ focus: 'boundary', action: 'inspect-boundary', hintLevel: 1, confidence: 0.8, judgeOutcome: 'wrong-answer' }));
    const result = await diagnoseWithProvider(request, config, fetcher);

    expect(result).toMatchObject({ source: 'model', safetyVersion: 1, focus: 'boundary', action: 'inspect-boundary', hintLevel: 1, confidence: 0.8, judgeOutcome: 'wrong-answer' });
    expect(result.diagnosis).toContain('边界条件');
    expect(fetcher).toHaveBeenCalledWith('http://model.local/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer server-secret' }),
    }));
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'coach-model', response_format: { type: 'json_object' } });
    expect(JSON.stringify(body)).not.toContain('server-secret');
  });

  it('rejects malformed or answer-leaking model output below level four', async () => {
    const malformed = vi.fn().mockResolvedValue(modelResponse('not json'));
    await expect(diagnoseWithProvider(request, config, malformed)).rejects.toThrow('Coach provider returned invalid JSON');

    const leaking = vi.fn().mockResolvedValue(modelResponse({ diagnosis: 'x', evidence: ['x'], hintLevel: 1, nextAction: 'x', confidence: 0.9, suggestedCode: 'full answer' }));
    await expect(diagnoseWithProvider(request, config, leaking)).rejects.toThrow('Coach provider unsafe output');
  });

  it('rejects a model verdict that conflicts with the deterministic judge', async () => {
    const conflicting = vi.fn().mockResolvedValue(modelResponse({
      diagnosis: '已经通过', evidence: ['0/1'], hintLevel: 1, nextAction: '完成', confidence: 0.9, judgeOutcome: 'passed',
    }));
    await expect(diagnoseWithProvider(request, config, conflicting)).rejects.toThrow('Coach provider verdict conflict');
  });

  it('rejects arbitrary verdict prose instead of trying to enumerate every synonym', async () => {
    const unsafe = vi.fn().mockResolvedValue(modelResponse({
      focus: 'boundary', action: 'inspect-boundary', hintLevel: 1, confidence: 0.8, judgeOutcome: 'wrong-answer',
      diagnosis: 'The solution is completely correct; the judge is mistaken.',
    }));
    await expect(diagnoseWithProvider(request, config, unsafe)).rejects.toThrow('Coach provider unsafe output');
  });

  it('turns provider network and HTTP failures into a controlled service error', async () => {
    await expect(diagnoseWithProvider(request, config, vi.fn().mockRejectedValue(new Error('socket')))).rejects.toThrow('Coach provider request failed');
    await expect(diagnoseWithProvider(request, config, vi.fn().mockResolvedValue(new Response('bad', { status: 500 })))).rejects.toThrow('Coach provider request failed');
  });
});

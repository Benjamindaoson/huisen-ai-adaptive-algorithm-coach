import { describe, expect, it, vi } from 'vitest';
import { createDeepSeekMentorProvider, resolveDeepSeekConfig } from './deepseek-provider.js';

const tools = [{
  type: 'function' as const,
  function: {
    name: 'inspect_syntax', description: 'Inspect source structure',
    parameters: { type: 'object', properties: { focus: { type: 'string' } }, required: ['focus'], additionalProperties: false },
  },
}];

describe('DeepSeek mentor provider', () => {
  it('resolves only server-side DeepSeek configuration with current defaults', () => {
    expect(resolveDeepSeekConfig({ DEEPSEEK_API_KEY: 'secret' })).toMatchObject({
      apiKey: 'secret', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash',
    });
    expect(resolveDeepSeekConfig({})).toBeNull();
  });

  it('returns native tool calls, reasoning content and redacted usage metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: 'deepseek-v4-flash',
      choices: [{ message: {
        role: 'assistant', content: '', reasoning_content: 'Need syntax evidence first.',
        tool_calls: [{ id: 'call-1', type: 'function', function: { name: 'inspect_syntax', arguments: '{"focus":"loops"}' } }],
      }, finish_reason: 'tool_calls' }],
      usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 },
    }), { status: 200 }));
    const provider = createDeepSeekMentorProvider({ apiKey: 'top-secret', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash', fetcher, now: (() => { let value = 100; return () => value += 25; })() });
    const result = await provider.complete({ messages: [{ role: 'user', content: 'analyze' }], tools });
    expect(result).toMatchObject({
      model: 'deepseek-v4-flash', reasoningContent: 'Need syntax evidence first.', latencyMs: 25,
      toolCalls: [{ id: 'call-1', name: 'inspect_syntax', arguments: { focus: 'loops' } }],
      usage: { inputTokens: 120, outputTokens: 30, totalTokens: 150 },
    });
    const request = fetcher.mock.calls[0][1];
    expect(request.headers.authorization).toBe('Bearer top-secret');
    expect(JSON.parse(request.body)).toMatchObject({ model: 'deepseek-v4-flash', tools, tool_choice: 'auto' });
    expect(JSON.stringify(result)).not.toContain('top-secret');
  });

  it('preserves malformed tool arguments for agent self-correction and rejects provider failures', async () => {
    const malformed = createDeepSeekMentorProvider({
      apiKey: 'secret', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash',
      fetcher: async () => new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ id: 'x', function: { name: 'inspect_syntax', arguments: '[]' } }] } }] }), { status: 200 }),
    });
    await expect(malformed.complete({ messages: [{ role: 'user', content: 'x' }], tools })).resolves.toMatchObject({
      toolCalls: [{
        id: 'x', name: 'inspect_syntax', arguments: {}, rawArguments: '[]',
        argumentError: 'Invalid DeepSeek tool arguments: expected a JSON object',
      }],
    });

    const unavailable = createDeepSeekMentorProvider({
      apiKey: 'secret', apiUrl: 'https://api.deepseek.com', model: 'deepseek-v4-flash',
      fetcher: async () => new Response('busy', { status: 503 }),
    });
    await expect(unavailable.complete({ messages: [{ role: 'user', content: 'x' }], tools })).rejects.toThrow('DeepSeek unavailable: 503');
  });
});

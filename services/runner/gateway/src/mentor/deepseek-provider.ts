export type JsonSchema = Record<string, unknown>;
export type MentorToolDefinition = {
  type: 'function';
  function: { name: string; description: string; parameters: JsonSchema; strict?: boolean };
};
export type MentorModelMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  reasoning_content?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};
export type MentorModelRequest = { messages: MentorModelMessage[]; tools: MentorToolDefinition[] };
export type MentorModelResult = {
  model: string;
  content: string;
  reasoningContent?: string;
  finishReason: string;
  toolCalls: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    rawArguments?: string;
    argumentError?: string;
  }>;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  latencyMs: number;
};
export type MentorModelAdapter = { mode: 'deepseek'; model: string; complete(request: MentorModelRequest): Promise<MentorModelResult> };

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
type DeepSeekConfig = { apiKey: string; apiUrl: string; model: string };

export function resolveDeepSeekConfig(env: Record<string, string | undefined>): DeepSeekConfig | null {
  const apiUrl = env.DEEPSEEK_API_URL?.trim() || 'https://api.deepseek.com';
  const apiKey = env.DEEPSEEK_API_KEY?.trim() || (apiUrl.includes('deepseek') ? env.AI_API_KEY?.trim() : '');
  if (!apiKey) return null;
  return { apiKey, apiUrl, model: env.DEEPSEEK_MODEL?.trim() || 'deepseek-v4-flash' };
}

function endpoint(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, '')}/chat/completions`;
}

function objectArguments(value: string): { arguments: Record<string, unknown>; argumentError?: string } {
  let parsed: unknown;
  try { parsed = JSON.parse(value); }
  catch { return { arguments: {}, argumentError: 'Invalid DeepSeek tool arguments: expected a JSON object' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { arguments: {}, argumentError: 'Invalid DeepSeek tool arguments: expected a JSON object' };
  }
  return { arguments: parsed as Record<string, unknown> };
}

export function createDeepSeekMentorProvider(config: DeepSeekConfig & { fetcher?: Fetcher; now?: () => number }): MentorModelAdapter {
  const fetcher = config.fetcher ?? fetch;
  const now = config.now ?? Date.now;
  return {
    mode: 'deepseek',
    model: config.model,
    async complete(request): Promise<MentorModelResult> {
      const startedAt = now();
      const response = await fetcher(endpoint(config.apiUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          tools: request.tools,
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 2_048,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const latencyMs = Math.max(0, now() - startedAt);
      if (!response.ok) throw new Error(`DeepSeek unavailable: ${response.status}`);
      const payload = await response.json() as {
        model?: string;
        choices?: Array<{ finish_reason?: string; message?: { content?: string | null; reasoning_content?: string; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const choice = payload.choices?.[0];
      if (!choice?.message) throw new Error('Invalid DeepSeek response');
      const toolCalls = (choice.message.tool_calls ?? []).map((call) => {
        if (!call.id || !call.function?.name || typeof call.function.arguments !== 'string') throw new Error('Invalid DeepSeek tool call');
        return {
          id: call.id,
          name: call.function.name,
          rawArguments: call.function.arguments.slice(0, 4_000),
          ...objectArguments(call.function.arguments),
        };
      });
      return {
        model: payload.model || config.model,
        content: choice.message.content ?? '',
        ...(choice.message.reasoning_content ? { reasoningContent: choice.message.reasoning_content } : {}),
        finishReason: choice.finish_reason || (toolCalls.length ? 'tool_calls' : 'stop'),
        toolCalls,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          totalTokens: payload.usage?.total_tokens ?? 0,
        },
        latencyMs,
      };
    },
  };
}

import type { AgentPolicy, AgentPolicyContext } from './agent-runtime.js';

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function endpoint(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, '')}/chat/completions`;
}

export function createProviderAgentPolicy(options: { apiUrl: string; apiKey: string; model: string; fetcher?: Fetcher }): AgentPolicy {
  const fetcher = options.fetcher ?? fetch;
  return async (context: AgentPolicyContext) => {
    if (!options.apiUrl.trim() || !options.model.trim() || !context.available.length) return null;
    try {
      const response = await fetcher(endpoint(options.apiUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}) },
        body: JSON.stringify({
          model: options.model, temperature: 0,
          messages: [
            { role: 'system', content: '你是受权限约束的学习 Agent 策略器。只能从 available 中选择一个下一步。不得输出判题结论。仅返回 JSON：role,name。' },
            { role: 'user', content: JSON.stringify(context) },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;
      const choice = JSON.parse(content) as { role?: string; name?: string };
      return context.available.find((item) => item.role === choice.role && item.name === choice.name) ?? null;
    } catch { return null; }
  };
}

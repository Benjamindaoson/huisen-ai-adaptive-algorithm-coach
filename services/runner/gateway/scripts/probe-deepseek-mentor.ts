import { createDeepSeekMentorProvider, resolveDeepSeekConfig } from '../src/mentor/deepseek-provider.js';
import { MENTOR_TOOL_DEFINITIONS } from '../src/mentor/mentor-tools.js';

const config = resolveDeepSeekConfig(process.env);
if (!config) throw new Error('DEEPSEEK_API_KEY is not configured');

const provider = createDeepSeekMentorProvider(config);
const result = await provider.complete({
  messages: [
    { role: 'system', content: '你是 Mentor Agent。必须先选择一个工具收集证据，不要直接给答案。' },
    { role: 'user', content: '学习者的 JavaScript 循环使用 i <= a.length，公开测试未通过。请选择下一步工具。' },
  ],
  tools: MENTOR_TOOL_DEFINITIONS,
});

process.stdout.write(`${JSON.stringify({
  ok: result.toolCalls.length > 0,
  model: result.model,
  finishReason: result.finishReason,
  tools: result.toolCalls.map((call) => call.name),
  reasoningObserved: Boolean(result.reasoningContent),
  usage: result.usage,
  latencyMs: result.latencyMs,
})}\n`);

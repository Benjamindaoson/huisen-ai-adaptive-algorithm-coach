import type { CoachHintLevel, CoachOutcome, CoachRequest } from './coach-validation.js';

export type CoachProviderConfig = { apiUrl: string; apiKey: string; model: string };
export type CoachFocus = 'input-parsing' | 'boundary' | 'state-transition' | 'complexity' | 'data-structure' | 'output-format' | 'syntax' | 'runtime' | 'unknown';
export type CoachAction = 'trace' | 'inspect-boundary' | 'inspect-parser' | 'review-complexity' | 'review-state' | 'review-data-structure' | 'review-output' | 'fix-syntax' | 'replay-runtime' | 'compare-reference';
export type ProviderDiagnosis = {
  source: 'model';
  safetyVersion: 1;
  focus: CoachFocus;
  action: CoachAction;
  diagnosis: string;
  evidence: string[];
  hintLevel: CoachHintLevel;
  nextAction: string;
  confidence: number;
  judgeOutcome: CoachOutcome;
  suggestedCode?: string;
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const FOCUSES: CoachFocus[] = ['input-parsing', 'boundary', 'state-transition', 'complexity', 'data-structure', 'output-format', 'syntax', 'runtime', 'unknown'];
const ACTIONS: CoachAction[] = ['trace', 'inspect-boundary', 'inspect-parser', 'review-complexity', 'review-state', 'review-data-structure', 'review-output', 'fix-syntax', 'replay-runtime', 'compare-reference'];
const FOCUS_LABELS: Record<CoachFocus, string> = {
  'input-parsing': '输入解析', boundary: '边界条件', 'state-transition': '状态转移', complexity: '复杂度',
  'data-structure': '数据结构选择', 'output-format': '输出格式', syntax: '语法与类型', runtime: '运行时边界', unknown: '首次偏差位置',
};
const ACTION_LABELS: Record<CoachAction, string> = {
  trace: '用失败样例逐步跟踪变量，定位第一次与预期状态不同的位置。',
  'inspect-boundary': '检查循环上下界、空输入、最小值、最大值和重复值。',
  'inspect-parser': '逐项核对输入行数、分隔符、类型转换与读取顺序。',
  'review-complexity': '按题面上限估算循环次数，并消除重复扫描或重复子问题。',
  'review-state': '写出状态定义与转移前提，再核对初始化和更新顺序。',
  'review-data-structure': '比较当前结构的查询与更新复杂度，确认是否需要哈希、有序或单调结构。',
  'review-output': '逐字符核对输出内容、顺序、空格和换行。',
  'fix-syntax': '从编译器第一条错误开始做最小修复，然后重新运行。',
  'replay-runtime': '用同一输入重放异常路径，检查下标、空值、除数与解析结果。',
  'compare-reference': '先写出自己方案的不变量与复杂度，再对照参考解法。',
};
const MODEL_OUTPUT_KEYS = new Set(['focus', 'action', 'hintLevel', 'confidence', 'judgeOutcome', 'suggestedCode']);

const OUTCOME_CLAIMS: Array<[CoachOutcome, RegExp]> = [
  ['passed', /已经通过|判题通过|答案正确|结果正确|\b(?:accepted|passed)\b/i],
  ['wrong-answer', /判题失败|答案错误|结果错误|\bwrong[ -]?answer\b/i],
  ['compile-error', /编译失败|编译错误|\bcompile[ -]?error\b/i],
  ['runtime-error', /运行时错误|\bruntime[ -]?error\b/i],
  ['timeout', /运行超时|\btime(?:d)?[ -]?out\b/i],
];

function conflictsWithJudge(value: unknown, expectedOutcome: CoachOutcome): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const text = [candidate.diagnosis, ...(Array.isArray(candidate.evidence) ? candidate.evidence : []), candidate.nextAction]
    .filter((item): item is string => typeof item === 'string').join('\n');
  return OUTCOME_CLAIMS.some(([outcome, pattern]) => outcome !== expectedOutcome && pattern.test(text));
}

export function providerConfigFromEnv(): CoachProviderConfig {
  return {
    apiUrl: process.env.AI_API_URL?.trim() ?? '',
    apiKey: process.env.AI_API_KEY?.trim() ?? '',
    model: process.env.AI_MODEL?.trim() ?? '',
  };
}

function providerEndpoint(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, '')}/chat/completions`;
}

function parseProviderDiagnosis(value: unknown, expectedLevel: CoachHintLevel, expectedOutcome: CoachOutcome, request: CoachRequest): ProviderDiagnosis | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !MODEL_OUTPUT_KEYS.has(key)) ||
    !FOCUSES.includes(candidate.focus as CoachFocus) || !ACTIONS.includes(candidate.action as CoachAction) ||
    candidate.hintLevel !== expectedLevel || candidate.judgeOutcome !== expectedOutcome ||
    typeof candidate.confidence !== 'number' || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1 ||
    (candidate.suggestedCode !== undefined && (expectedLevel !== 4 || typeof candidate.suggestedCode !== 'string' || candidate.suggestedCode.length > 50_000))) return null;
  const focus = candidate.focus as CoachFocus;
  const action = candidate.action as CoachAction;
  const evidence = [`确定性判题：${request.attempt.outcome} · ${request.attempt.summary}`];
  if (request.attempt.evidence?.stderr) evidence.push(`错误输出：${request.attempt.evidence.stderr.slice(0, 800)}`);
  if (request.attempt.evidence?.failedCase) evidence.push(`${request.attempt.evidence.failedCase.name}：预期与实际输出不一致。`);
  return {
    source: 'model', safetyVersion: 1, focus, action,
    diagnosis: `模型建议优先检查${FOCUS_LABELS[focus]}；确定性判题结果保持为 ${expectedOutcome}。`,
    evidence, hintLevel: expectedLevel, nextAction: ACTION_LABELS[action], confidence: candidate.confidence as number,
    judgeOutcome: expectedOutcome,
    ...(candidate.suggestedCode !== undefined ? { suggestedCode: candidate.suggestedCode as string } : {}),
  };
}

function systemPrompt(level: CoachHintLevel): string {
  return [
    '你是华为 OD 编程训练教练。只根据提供的题目、用户代码、公开运行证据和掌握度诊断。',
    '不要声称看过隐藏测试，不要编造失败输入。每个判断都必须在 evidence 中引用输入证据。',
    `当前提示级别是 ${level}。1级只定位和提问；2级给算法方向；3级给局部修改；4级才可给完整解法。`,
    level < 4 ? '禁止返回完整替换代码，禁止 suggestedCode 字段。' : '只有请求提供 referenceSolution 时才可返回 suggestedCode。',
    '判题器结果是不可修改的事实。不得生成任何自由文本判题结论；必须把输入 attempt.outcome 原样放入 judgeOutcome。',
    `focus 只能是：${FOCUSES.join(', ')}。action 只能是：${ACTIONS.join(', ')}。`,
    '仅返回 JSON：focus(string), action(string), hintLevel(number), confidence(0..1), judgeOutcome(string)，4级可选 suggestedCode(string)。禁止 diagnosis、evidence、nextAction 或其他自由文本字段。',
  ].join('\n');
}

export async function diagnoseWithProvider(
  request: CoachRequest,
  config = providerConfigFromEnv(),
  fetcher: Fetcher = fetch,
): Promise<ProviderDiagnosis> {
  if (!config.apiUrl || !config.apiKey || !config.model) throw new Error('Coach provider is not configured');

  let response: Response;
  try {
    response = await fetcher(providerEndpoint(config.apiUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt(request.hintLevel) },
          { role: 'user', content: JSON.stringify(request) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1_200,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error('Coach provider request failed');
  }
  if (!response.ok) throw new Error('Coach provider request failed');

  const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Coach provider returned invalid JSON');
  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new Error('Coach provider returned invalid JSON');
  }
  if (conflictsWithJudge(decoded, request.attempt.outcome)) throw new Error('Coach provider verdict conflict');
  if (decoded && typeof decoded === 'object' && !Array.isArray(decoded) && Object.keys(decoded as Record<string, unknown>).some((key) => !MODEL_OUTPUT_KEYS.has(key))) {
    throw new Error('Coach provider unsafe output');
  }
  const diagnosis = parseProviderDiagnosis(decoded, request.hintLevel, request.attempt.outcome, request);
  if (!diagnosis) throw new Error('Coach provider returned invalid diagnosis');
  return diagnosis;
}

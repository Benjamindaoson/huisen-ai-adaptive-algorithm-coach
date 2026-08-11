import type { ProblemLanguage, ProblemRecord } from './catalog';
import type { SkillMastery } from './mastery';
import type { AttemptEvidence, AttemptOutcome, PracticeAttempt } from './practice';

export type HintLevel = 1 | 2 | 3 | 4;
export type CoachFocus = 'input-parsing' | 'boundary' | 'state-transition' | 'complexity' | 'data-structure' | 'output-format' | 'syntax' | 'runtime' | 'unknown';
export type CoachAction = 'trace' | 'inspect-boundary' | 'inspect-parser' | 'review-complexity' | 'review-state' | 'review-data-structure' | 'review-output' | 'fix-syntax' | 'replay-runtime' | 'compare-reference';

export type CoachRequest = {
  version: 1;
  hintLevel: HintLevel;
  question?: string;
  problem: {
    id: string;
    title: string;
    description: string;
    input: string;
    output: string;
  };
  attempt: {
    id: string;
    language: ProblemLanguage;
    outcome: AttemptOutcome;
    summary: string;
    code: string;
    evidence?: AttemptEvidence;
  };
  mastery: Array<Pick<SkillMastery, 'skillId' | 'score' | 'confidence' | 'evidenceCount' | 'recentErrorKinds'>>;
  referenceSolution?: string;
};

export type CoachDiagnosis = {
  source: 'local' | 'model';
  safetyVersion?: 1;
  focus?: CoachFocus;
  action?: CoachAction;
  diagnosis: string;
  evidence: string[];
  hintLevel: HintLevel;
  nextAction: string;
  confidence: number;
  judgeOutcome: AttemptOutcome;
  suggestedCode?: string;
  notice?: string;
  invalidReason?: 'judge-conflict' | 'unsafe-model-output';
};

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
const SAFE_MODEL_KEYS = new Set(['source', 'safetyVersion', 'focus', 'action', 'hintLevel', 'confidence', 'judgeOutcome', 'suggestedCode']);

const OUTCOME_CLAIMS: Array<[AttemptOutcome, RegExp]> = [
  ['passed', /已经通过|判题通过|答案正确|结果正确|\b(?:accepted|passed)\b/i],
  ['wrong-answer', /判题失败|答案错误|结果错误|\bwrong[ -]?answer\b/i],
  ['compile-error', /编译失败|编译错误|\bcompile[ -]?error\b/i],
  ['runtime-error', /运行时错误|\bruntime[ -]?error\b/i],
  ['timeout', /运行超时|\btime(?:d)?[ -]?out\b/i],
];

function conflictsWithJudge(value: unknown, expectedOutcome: AttemptOutcome): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const text = [candidate.diagnosis, ...(Array.isArray(candidate.evidence) ? candidate.evidence : []), candidate.nextAction]
    .filter((item): item is string => typeof item === 'string').join('\n');
  return OUTCOME_CLAIMS.some(([outcome, pattern]) => outcome !== expectedOutcome && pattern.test(text));
}

function trimmed(value: string | undefined, limit: number): string {
  return (value ?? '').trim().slice(0, limit);
}

export function buildCoachRequest(
  problem: ProblemRecord,
  attempt: PracticeAttempt,
  mastery: SkillMastery[],
  hintLevel: HintLevel,
  question?: string,
): CoachRequest {
  const request: CoachRequest = {
    version: 1,
    hintLevel,
    ...(question?.trim() ? { question: question.trim().slice(0, 1_000) } : {}),
    problem: {
      id: problem.id,
      title: trimmed(problem.title, 300),
      description: trimmed(problem.sections.description, 12_000),
      input: trimmed(problem.sections.input, 4_000),
      output: trimmed(problem.sections.output, 4_000),
    },
    attempt: {
      id: attempt.id,
      language: attempt.language,
      outcome: attempt.outcome,
      summary: trimmed(attempt.summary, 1_000),
      code: attempt.codeSnapshot.slice(0, 50_000),
      ...(attempt.evidence ? { evidence: attempt.evidence } : {}),
    },
    mastery: mastery.filter((item) => item.evidenceCount > 0).slice(0, 8).map((item) => ({
      skillId: item.skillId,
      score: item.score,
      confidence: item.confidence,
      evidenceCount: item.evidenceCount,
      recentErrorKinds: item.recentErrorKinds,
    })),
  };
  const referenceSolution = problem.solutions[attempt.language];
  if (hintLevel === 4 && referenceSolution) request.referenceSolution = referenceSolution.slice(0, 50_000);
  return request;
}

function diagnosisEvidence(request: CoachRequest): string[] {
  const evidence = [`本次结果：${request.attempt.summary || request.attempt.outcome}`];
  const details = request.attempt.evidence;
  if (details?.stderr) evidence.push(`错误输出：${details.stderr.slice(0, 800)}`);
  if (details?.failedCase) {
    evidence.push(`${details.failedCase.name}：预期输出“${details.failedCase.expectedOutput.slice(0, 400)}”，实际输出“${details.failedCase.actualOutput.slice(0, 400) || '无输出'}”`);
  }
  if (details?.timeMs !== undefined) evidence.push(`执行耗时：${details.timeMs} ms`);
  const weakest = [...request.mastery].sort((left, right) => left.score - right.score)[0];
  if (weakest) evidence.push(`相关历史证据：${weakest.skillId} 掌握度 ${Math.round(weakest.score * 100)}%，置信度 ${Math.round(weakest.confidence * 100)}%`);
  return evidence;
}

function localGuidance(outcome: AttemptOutcome, level: HintLevel): Pick<CoachDiagnosis, 'diagnosis' | 'nextAction'> {
  const guidance: Record<AttemptOutcome, Array<[string, string]>> = {
    'compile-error': [
      ['程序还没有进入运行阶段，先定位编译器指出的第一个语法或类型错误。', '从 stderr 的第一条错误和对应行开始，只修复这一处后重新运行。'],
      ['编译错误通常来自括号、类型、变量作用域或语言入口格式不一致。', '检查报错行前一行的括号与分隔符，再核对变量声明和主函数签名。'],
      ['现在可以进行局部修复，但仍不需要替换整份代码。', '保持算法不变，最小化修改报错语句及它直接依赖的声明。'],
      ['已进入完整解法对照阶段。', '先比较入口、输入解析和核心循环，再决定是否替换自己的实现。'],
    ],
    'wrong-answer': [
      ['程序能运行，但公开样例的实际输出与预期输出不一致。', '手工跟踪失败输入，找出第一次与预期状态不同的变量。'],
      ['优先检查初始化、循环边界、索引偏移和最终输出格式。', '把失败样例缩到最小，逐步打印关键状态并再次运行。'],
      ['错误已收敛到实现细节，可以做局部代码修正。', '只修改产生首次偏差的状态转移或边界分支，然后重新提交样例。'],
      ['已进入完整解法对照阶段。', '先总结自己方案与参考方案的不变量差异，再查看完整代码。'],
    ],
    'runtime-error': [
      ['程序在运行过程中异常退出，错误输出是最直接证据。', '用同一输入重放，检查异常行涉及的下标、空值、除数或解析结果。'],
      ['运行错误通常是边界输入打破了代码中的隐含假设。', '列出异常语句需要满足的前置条件，并在输入解析后验证它们。'],
      ['可以对异常路径做最小防御性修复。', '修正越界或非法状态来源，不要只在异常行外层吞掉错误。'],
      ['已进入完整解法对照阶段。', '对照参考实现如何建立边界和数据结构不变量。'],
    ],
    timeout: [
      ['当前实现未在时间限制内结束，先确认是否存在死循环或无法收敛的状态。', '记录主循环每轮缩小的搜索空间；如果没有缩小，先修复终止条件。'],
      ['如果终止条件正确，问题更可能是时间复杂度超过约束。', '根据输入上限估算循环次数，并寻找重复扫描、嵌套枚举或可缓存子问题。'],
      ['需要替换最昂贵的局部步骤，而不是微调常数。', '用哈希、有序结构、单调结构或动态规划消除重复工作，再测同一输入。'],
      ['已进入完整解法对照阶段。', '对比参考方案的复杂度和数据结构，说明它减少了哪一层工作。'],
    ],
    unavailable: [
      ['执行服务不可用，当前没有证据判断代码正确性。', '稍后重新运行；不要根据基础设施失败修改算法。'],
      ['执行服务不可用，无法增加诊断置信度。', '保留代码并等待服务恢复。'],
      ['执行服务不可用，局部修改没有可靠依据。', '先恢复执行证据，再进行代码修正。'],
      ['执行服务不可用，参考解法不应用来掩盖验证缺失。', '等待执行服务恢复后再对照完整解法。'],
    ],
    executed: [
      ['自定义输入运行成功，但这不是判题证据。', '执行“样例提交”，让教练获得可比较的预期输出。'],
      ['单次运行只能说明程序对当前输入没有崩溃。', '补充边界输入并进行样例提交。'],
      ['尚无失败用例可支持局部修复。', '先获得可复现的失败或通过证据。'],
      ['可以查看参考解法，但当前没有证据说明自己的实现错误。', '先独立提交，再做方案对照。'],
    ],
    passed: [
      ['公开样例已通过，下一步应验证边界与复杂度，而不是立即改代码。', '补充最小值、最大值、重复值和空边界输入。'],
      ['样例通过不等于隐藏测试通过。', '解释算法不变量和复杂度，寻找题面约束下的反例。'],
      ['当前没有公开失败证据，适合做鲁棒性审查。', '检查输入解析、溢出、索引和输出格式。'],
      ['已进入完整解法对照阶段。', '比较复杂度与可读性，不要仅比较代码长短。'],
    ],
  };
  const [diagnosis, nextAction] = guidance[outcome][level - 1];
  return { diagnosis, nextAction };
}

export function buildLocalDiagnosis(request: CoachRequest, notice?: string): CoachDiagnosis {
  const guidance = localGuidance(request.attempt.outcome, request.hintLevel);
  return {
    source: 'local',
    ...guidance,
    evidence: diagnosisEvidence(request),
    hintLevel: request.hintLevel,
    confidence: request.attempt.evidence ? 0.55 : 0.3,
    judgeOutcome: request.attempt.outcome,
    ...(request.hintLevel === 4 && request.referenceSolution ? { suggestedCode: request.referenceSolution } : {}),
    ...(notice ? { notice } : {}),
  };
}

function parseDiagnosis(value: unknown, request: CoachRequest): CoachDiagnosis | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<CoachDiagnosis>;
  if (Object.keys(candidate).some((key) => !SAFE_MODEL_KEYS.has(key)) || candidate.source !== 'model' || candidate.safetyVersion !== 1 ||
    !FOCUSES.includes(candidate.focus as CoachFocus) || !ACTIONS.includes(candidate.action as CoachAction) ||
    candidate.hintLevel !== request.hintLevel || candidate.judgeOutcome !== request.attempt.outcome ||
    typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1 ||
    (candidate.suggestedCode !== undefined && (request.hintLevel !== 4 || typeof candidate.suggestedCode !== 'string'))) return null;
  const focus = candidate.focus as CoachFocus;
  const action = candidate.action as CoachAction;
  return {
    source: 'model', safetyVersion: 1, focus, action,
    diagnosis: `模型建议优先检查${FOCUS_LABELS[focus]}；确定性判题结果保持为 ${request.attempt.outcome}。`,
    evidence: diagnosisEvidence(request), hintLevel: request.hintLevel, nextAction: ACTION_LABELS[action],
    confidence: candidate.confidence, judgeOutcome: request.attempt.outcome,
    ...(candidate.suggestedCode !== undefined ? { suggestedCode: candidate.suggestedCode } : {}),
  };
}

export async function requestCoach(baseUrl: string, request: CoachRequest, signal?: AbortSignal): Promise<CoachDiagnosis> {
  if (!baseUrl.trim()) return buildLocalDiagnosis(request);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/coach/diagnose`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request), signal,
    });
    if (!response.ok) {
      if (response.status === 422) return { ...buildLocalDiagnosis(request, '模型输出违反判题安全合同，已丢弃并切换为本地诊断。'), invalidReason: 'unsafe-model-output' };
      return buildLocalDiagnosis(request, '模型教练暂不可用，已切换为本地证据诊断。');
    }
    const payload: unknown = await response.json();
    if (conflictsWithJudge(payload, request.attempt.outcome)) {
      return { ...buildLocalDiagnosis(request, '模型结论与判题事实冲突，已丢弃并切换为本地诊断。'), invalidReason: 'judge-conflict' };
    }
    const diagnosis = parseDiagnosis(payload, request);
    return diagnosis ?? { ...buildLocalDiagnosis(request, '模型输出不符合安全合同，已切换为本地证据诊断。'), invalidReason: 'unsafe-model-output' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return buildLocalDiagnosis(request, '模型教练暂不可用，已切换为本地证据诊断。');
  }
}

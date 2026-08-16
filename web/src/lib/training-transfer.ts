import { runCode, type RunRequest, type RunResult } from './runner-client';

export type ImmediateTransferCase = {
  id: string;
  invocation: string;
  expectedOutput: string;
};

export type ImmediateTransferChallenge = {
  id: string;
  lessonId: string;
  title: string;
  prompt: string;
  skillIds: string[];
  unintroducedSkillIds: string[];
  language: 'python';
  starterCode: string;
  cases: ImmediateTransferCase[];
};

export type ImmediateTransferResult = {
  status: 'passed' | 'failed' | 'unavailable';
  passedCount: number;
  totalCount: number;
  failureKind?: 'empty-source' | 'wrong-output' | Exclude<RunResult['kind'], 'success' | 'unavailable'>;
  message: string;
  caseResults: Array<{ caseId: string; passed: boolean; kind: RunResult['kind'] | 'wrong-output'; output: string }>;
};

export type TransferExecutor = (baseUrl: string, request: RunRequest) => Promise<RunResult>;
export type ImmediateTransferEvaluator = (baseUrl: string, challenge: ImmediateTransferChallenge, sourceCode: string) => Promise<ImmediateTransferResult>;

const ARRAY_TRAVERSAL: ImmediateTransferChallenge = {
  id: 'array-traversal-luggage',
  lessonId: 'starter-array-traversal',
  title: '逐件核对行李重量',
  prompt: '机场传送带送来一组行李重量。请补全函数，按原顺序逐行打印每一件行李的重量。这里只需要用刚学会的数组遍历，不需要排序或区间合并。',
  skillIds: ['array'],
  unintroducedSkillIds: [],
  language: 'python',
  starterCode: 'def show_each(weights):\n    # 在这里写出完整的遍历\n    pass',
  cases: [
    { id: 'visible-shape', invocation: 'show_each([12, 7, 9])', expectedOutput: '12\n7\n9' },
    { id: 'different-length', invocation: 'show_each([3, 3, 1, 5])', expectedOutput: '3\n3\n1\n5' },
  ],
};

export function getImmediateTransferChallenge(lessonId: string): ImmediateTransferChallenge | null {
  return lessonId === ARRAY_TRAVERSAL.lessonId ? ARRAY_TRAVERSAL : null;
}

function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trim();
}

export async function evaluateImmediateTransfer(
  baseUrl: string,
  challenge: ImmediateTransferChallenge,
  sourceCode: string,
  execute: TransferExecutor = runCode,
): Promise<ImmediateTransferResult> {
  const totalCount = challenge.cases.length;
  if (!sourceCode.trim()) {
    return { status: 'failed', passedCount: 0, totalCount, failureKind: 'empty-source', message: '先写下你的遍历代码，再运行测试。', caseResults: [] };
  }
  const caseResults: ImmediateTransferResult['caseResults'] = [];
  for (const testCase of challenge.cases) {
    const sourceWithInvocation = `${sourceCode.trimEnd()}\n\n${testCase.invocation}\n`;
    const result = await execute(baseUrl, { language: challenge.language, sourceCode: sourceWithInvocation, stdin: '' });
    if (result.kind === 'unavailable') {
      return {
        status: 'unavailable', passedCount: caseResults.filter((item) => item.passed).length, totalCount,
        message: result.stderr || '运行服务暂时不可用，请稍后重试。',
        caseResults: [...caseResults, { caseId: testCase.id, passed: false, kind: result.kind, output: result.stderr }],
      };
    }
    if (result.kind !== 'success') {
      return {
        status: 'failed', passedCount: caseResults.filter((item) => item.passed).length, totalCount, failureKind: result.kind,
        message: result.stderr || '代码没有成功运行，请根据运行信息修改。',
        caseResults: [...caseResults, { caseId: testCase.id, passed: false, kind: result.kind, output: result.stderr }],
      };
    }
    const passed = normalizeOutput(result.stdout) === normalizeOutput(testCase.expectedOutput);
    caseResults.push({ caseId: testCase.id, passed, kind: passed ? 'success' : 'wrong-output', output: result.stdout });
    if (!passed) {
      return {
        status: 'failed', passedCount: caseResults.filter((item) => item.passed).length, totalCount, failureKind: 'wrong-output',
        message: '程序运行成功，但输出顺序或格式还不正确。先检查循环每一轮打印的是不是当前元素。', caseResults,
      };
    }
  }
  return { status: 'passed', passedCount: totalCount, totalCount, message: `${totalCount}/${totalCount} 组测试通过。`, caseResults };
}

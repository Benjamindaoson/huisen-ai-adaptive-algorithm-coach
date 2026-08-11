import type { AllowedLanguage } from './validation.js';

export type JudgeOutcome = 'passed' | 'failed' | 'compile-error' | 'runtime-error' | 'timeout' | 'unavailable' | 'not-run';

export type DiagnosticInput = {
  language: AllowedLanguage;
  sourceCode: string;
  problem: { id: string; title: string; inputDescription: string; skillIds: string[] };
  judge: { outcome: JudgeOutcome; passedCount?: number; totalCount?: number; evidenceRef: string };
};

export type DiagnosticObservation = {
  kind: 'judge-result' | 'input-parser-risk' | 'boundary-risk' | 'complexity-risk';
  message: string;
  confidence: number;
  evidenceRef: string;
  line?: number;
};

export type DiagnosticReport = {
  version: 1;
  problemId: string;
  judgeOutcome: JudgeOutcome;
  observations: DiagnosticObservation[];
  hypothesis: { message: string; confidence: number; proven: false; evidenceRefs: string[] };
};

function lineOf(lines: string[], pattern: RegExp): number | undefined {
  const index = lines.findIndex((line) => pattern.test(line));
  return index < 0 ? undefined : index + 1;
}

function judgeMessage(outcome: JudgeOutcome, passed?: number, total?: number): string {
  if (outcome === 'passed') return '确定性判题已通过。';
  if (outcome === 'timeout') return '确定性判题结果为超时。';
  if (outcome === 'compile-error') return '确定性判题结果为编译错误。';
  if (outcome === 'runtime-error') return '确定性判题结果为运行错误。';
  if (outcome === 'failed' && total !== undefined) return `确定性判题通过 ${passed ?? 0}/${total} 个用例。`;
  return `确定性判题结果为 ${outcome}。`;
}

export function diagnoseCode(input: DiagnosticInput): DiagnosticReport {
  const lines = input.sourceCode.replace(/\r\n?/g, '\n').split('\n');
  const observations: DiagnosticObservation[] = [{
    kind: 'judge-result', message: judgeMessage(input.judge.outcome, input.judge.passedCount, input.judge.totalCount),
    confidence: 1, evidenceRef: input.judge.evidenceRef,
  }];
  const multiline = /(第一行|第二行|第三行|多行|每行)/.test(input.problem.inputDescription);
  const parserPattern = input.language === 'javascript'
    ? /readFileSync[\s\S]*\.split\(['"] ['"]\)/
    : input.language === 'python' ? /sys\.stdin\.read\(\)[\s\S]*\.split\(['"] ['"]\)/ : /split\(['"] ['"]\)/;
  const parserLine = multiline ? lineOf(lines, parserPattern) : undefined;
  if (parserLine !== undefined) observations.push({
    kind: 'input-parser-risk', line: parserLine, confidence: 0.82, evidenceRef: `code:line:${parserLine}`,
    message: '题目描述包含多行输入，但代码把完整输入仅按空格切分，换行边界可能被错误处理。',
  });

  const boundaryLine = lineOf(lines, /<=\s*[A-Za-z_$][\w$]*(?:\.size\(\)|\.length)|range\([^\n]*len\([^)]*\)\s*\+\s*1/);
  if (boundaryLine !== undefined) observations.push({
    kind: 'boundary-risk', line: boundaryLine, confidence: 0.88, evidenceRef: `code:line:${boundaryLine}`,
    message: '循环上界可能访问容器尾部之后的位置，请核对 < 与 <=。',
  });

  const loopLines = lines.map((line, index) => ({ line, index })).filter(({ line }) => /\b(for|while)\b/.test(line));
  if (loopLines.length >= 2) {
    const second = loopLines[1];
    const nested = /^\s+/.test(second.line) || loopLines[0].line.includes('{');
    if (nested) observations.push({
      kind: 'complexity-risk', line: second.index + 1, confidence: 0.72, evidenceRef: `code:line:${second.index + 1}`,
      message: '检测到嵌套循环；若输入规模较大，可能形成平方级复杂度。',
    });
  }

  const risks = observations.filter((item) => item.kind !== 'judge-result');
  const primary = risks.sort((left, right) => right.confidence - left.confidence)[0];
  const message = primary
    ? `${input.judge.outcome === 'timeout' ? '结合超时结果，' : ''}${primary.message}`
    : '现有静态证据没有发现高置信度风险，请结合失败用例逐步跟踪状态。';
  return {
    version: 1, problemId: input.problem.id, judgeOutcome: input.judge.outcome, observations,
    hypothesis: {
      message, confidence: primary ? Math.min(0.9, primary.confidence) : 0.45, proven: false,
      evidenceRefs: observations.map((item) => item.evidenceRef),
    },
  };
}

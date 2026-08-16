import type { PracticeAttempt } from './practice';

export type MisconceptionId = 'input-parsing' | 'off-by-one' | 'missing-empty-case' | 'state-reset' | 'complexity' | 'output-format' | 'unknown';
export type MisconceptionConfidence = 'low' | 'medium' | 'high';
export type MisconceptionAuthority = 'runtime-evidence' | 'judge-evidence' | 'code-hypothesis' | 'insufficient';
export type MisconceptionClassification = {
  id: MisconceptionId;
  title: string;
  confidence: MisconceptionConfidence;
  authority: MisconceptionAuthority;
  lessonId?: string;
  evidenceRefs: string[];
  reason: string;
};

const UNKNOWN: MisconceptionClassification = {
  id: 'unknown', title: '证据不足', confidence: 'low', authority: 'insufficient', evidenceRefs: [],
  reason: '目前只有提交结果，没有足够的编译、运行时或失败用例证据定位具体误区。',
};

function matchingLine(sourceCode: string, pattern: RegExp): number | null {
  const index = sourceCode.replace(/\r\n?/g, '\n').split('\n').findIndex((line) => pattern.test(line));
  return index < 0 ? null : index + 1;
}

function codeRef(line: number | null): string[] {
  return line ? [`code:line:${line}`] : [];
}

export function classifyMisconception(attempt: PracticeAttempt): MisconceptionClassification {
  const source = attempt.codeSnapshot;
  const stderr = attempt.evidence?.stderr ?? '';
  const failedCase = attempt.evidence?.failedCase;

  const inputLine = matchingLine(source, /\binput\s*\.\s*split\s*\(|readLine\s*\(\s*\)\s*\.\s*split\s*\(\s*["'](?:;|\|)["']|Scanner\s*\.\s*(?:next|nextInt)/i);
  if (stderr && (/(?:input|readline|scanner).*(?:split|function|method|attribute)|(?:split|parse|token).*(?:error|exception)|builtin_function.*(?:split|attribute)|object has no attribute.*split/i.test(stderr)) && inputLine) {
    return {
      id: 'input-parsing', title: '输入解析模型不清楚', confidence: 'high', authority: 'runtime-evidence', lessonId: 'input-output',
      evidenceRefs: [`attempt:${attempt.id}:stderr`, ...codeRef(inputLine)],
      reason: '运行错误证据与输入读取行相互印证：先分清“输入函数、输入文本、拆分后的字段”三个状态。',
    };
  }

  const boundaryLine = matchingLine(source, /<=\s*[A-Za-z_$][\w$]*\.(?:length|size\s*\(\s*\))|<=\s*len\s*\(/);
  if (failedCase && boundaryLine) {
    return {
      id: 'off-by-one', title: '索引边界多走一步', confidence: 'medium', authority: 'judge-evidence', lessonId: 'arrays-strings',
      evidenceRefs: [`attempt:${attempt.id}:failed-case`, ...codeRef(boundaryLine)],
      reason: '失败公开样例与边界代码形态共同支持这个假设；仍需手动追踪最后一轮才能最终确认。',
    };
  }

  const firstIndexLine = matchingLine(source, /(?:\[[\s]*0[\s]*\]|\.at\s*\(\s*0\s*\))/);
  if (firstIndexLine && (/(?:index|out of range|segmentation|bounds)/i.test(stderr) || failedCase?.stdin.trim() === '')) {
    return {
      id: 'missing-empty-case', title: '空输入没有定义初始状态', confidence: 'high', authority: 'runtime-evidence', lessonId: 'conditions',
      evidenceRefs: [...(stderr ? [`attempt:${attempt.id}:stderr`] : [`attempt:${attempt.id}:failed-case`]), ...codeRef(firstIndexLine)],
      reason: '空输入证据与首次索引读取相互印证：需要先预测“没有第一个元素”时程序状态。',
    };
  }

  const loopCount = (source.match(/\b(?:for|while)\b/g) ?? []).length;
  if (attempt.outcome === 'timeout' && loopCount >= 2) {
    return {
      id: 'complexity', title: '重复扫描导致工作量爆炸', confidence: 'medium', authority: 'runtime-evidence', lessonId: 'complexity-intuition',
      evidenceRefs: [`attempt:${attempt.id}:outcome`, 'code:multiple-loops'],
      reason: '超时结果和多个循环区域共同支持复杂度风险；先估算输入上限下最频繁语句的执行次数。',
    };
  }

  if (failedCase && /(?:,|\s)/.test(failedCase.expectedOutput) && /(?:,|\s)/.test(failedCase.actualOutput) && failedCase.expectedOutput.replace(/\s+/g, '') === failedCase.actualOutput.replace(/\s+/g, '')) {
    return {
      id: 'output-format', title: '输出分隔格式不一致', confidence: 'high', authority: 'judge-evidence', lessonId: 'input-output',
      evidenceRefs: [`attempt:${attempt.id}:failed-case`], reason: '预期与实际内容去掉空白后相同，公开失败用例支持输出格式误区。',
    };
  }

  return UNKNOWN;
}

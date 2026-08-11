import { describe, expect, it } from 'vitest';
import { diagnoseCode } from './code-diagnostics.js';

describe('diagnoseCode', () => {
  it('cites a multiline input parser risk at the matching source line', () => {
    const report = diagnoseCode({
      language: 'javascript',
      sourceCode: "const fs = require('fs');\nconst values = fs.readFileSync(0, 'utf8').trim().split(' ').map(Number);\nconsole.log(values.length);",
      problem: { id: 'od-lines', title: '多行输入', inputDescription: '第一行是数量，第二行是数组，第三行是目标值。', skillIds: ['io-parsing'] },
      judge: { outcome: 'failed', passedCount: 0, totalCount: 2, evidenceRef: 'judge:od-lines:public' },
    });
    expect(report.judgeOutcome).toBe('failed');
    expect(report.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'input-parser-risk', line: 2, evidenceRef: 'code:line:2' }),
      expect.objectContaining({ kind: 'judge-result', evidenceRef: 'judge:od-lines:public' }),
    ]));
    expect(report.hypothesis.proven).toBe(false);
  });

  it('detects suspicious array bounds and nested-loop complexity without changing judge authority', () => {
    const report = diagnoseCode({
      language: 'cpp',
      sourceCode: 'for (int i = 0; i <= values.size(); i++) {\n  for (int j = 0; j < values.size(); j++) {}\n}',
      problem: { id: 'od-bound', title: '边界', inputDescription: '输入一个数组', skillIds: ['array'] },
      judge: { outcome: 'timeout', evidenceRef: 'judge:od-bound:hidden' },
    });
    expect(report.judgeOutcome).toBe('timeout');
    expect(report.observations.map((item) => item.kind)).toEqual(expect.arrayContaining(['boundary-risk', 'complexity-risk', 'judge-result']));
    expect(report.hypothesis.message).toContain('超时');
  });

  it('returns a bounded no-risk hypothesis when code evidence is insufficient', () => {
    const report = diagnoseCode({
      language: 'python', sourceCode: 'print(input())',
      problem: { id: 'od-simple', title: '回显', inputDescription: '一行字符串', skillIds: ['string'] },
      judge: { outcome: 'passed', evidenceRef: 'judge:od-simple:public' },
    });
    expect(report.hypothesis.confidence).toBeLessThanOrEqual(0.6);
    expect(report.hypothesis.message).toContain('没有发现');
  });
});

import { describe, expect, it } from 'vitest';
import { evaluateMentorBenchmark, validateMentorBenchmark } from './mentor-benchmark.mjs';

const benchmark = {
  version: 1,
  name: 'unit-fixtures',
  thresholds: {
    lineAccuracy: 0.8,
    misconceptionAccuracy: 0.7,
    unsupportedHighConfidenceRate: 0.02,
    minimalHintUsefulness: 0.4,
    answerLeakageRate: 0,
  },
  cases: [
    {
      id: 'off-by-one-1', language: 'javascript', sourceCode: 'for (let i=0;i<=a.length;i++) {}',
      evidence: { outcome: 'wrong-answer', refs: ['judge:p1:public'] },
      expected: { misconception: 'off-by-one', lines: [1], hintIntent: 'predict-boundary' },
      prohibitedFragments: ['i < a.length'],
    },
    {
      id: 'input-1', language: 'python', sourceCode: 'items = input.split()\nprint(items)',
      evidence: { outcome: 'runtime-error', refs: ['stderr:line:1'] },
      expected: { misconception: 'input-parsing', lines: [1], hintIntent: 'inspect-input-api' },
      prohibitedFragments: ['items = input().split()'],
    },
  ],
};

describe('mentor benchmark evaluator', () => {
  it('scores observable diagnosis behavior from hand-authored expectations', () => {
    const report = evaluateMentorBenchmark(benchmark, [
      { caseId: 'off-by-one-1', misconception: 'off-by-one', lines: [1], confidence: 'high', evidenceRefs: ['judge:p1:public'], hintIntent: 'predict-boundary', hint: '先预测 i 等于 length 时访问哪个位置。' },
      { caseId: 'input-1', misconception: 'input-parsing', lines: [1], confidence: 'medium', evidenceRefs: ['stderr:line:1'], hintIntent: 'inspect-input-api', hint: '第 1 行调用的是输入函数，还是函数对象？' },
    ]);
    expect(report.metrics).toEqual({
      lineAccuracy: 1,
      misconceptionAccuracy: 1,
      unsupportedHighConfidenceRate: 0,
      minimalHintUsefulness: 1,
      answerLeakageRate: 0,
    });
    expect(report.fixtureCount).toBe(2);
  });

  it('counts unsupported high-confidence claims and leaked answer fragments', () => {
    const report = evaluateMentorBenchmark(benchmark, [
      { caseId: 'off-by-one-1', misconception: 'off-by-one', lines: [1], confidence: 'high', evidenceRefs: [], hintIntent: 'predict-boundary', hint: '直接改成 i < a.length' },
      { caseId: 'input-1', misconception: 'unknown', lines: [], confidence: 'low', evidenceRefs: [], hintIntent: 'none', hint: '再读一下题目。' },
    ]);
    expect(report.metrics).toMatchObject({
      lineAccuracy: 0.5,
      misconceptionAccuracy: 0.5,
      unsupportedHighConfidenceRate: 0.5,
      minimalHintUsefulness: 0.5,
      answerLeakageRate: 0.5,
    });
  });

  it('rejects malformed and duplicate fixtures before scoring', () => {
    expect(() => validateMentorBenchmark({ ...benchmark, cases: [{ ...benchmark.cases[0], expected: { misconception: '', lines: [0], hintIntent: '' } }] })).toThrow(/benchmark case/i);
    expect(() => validateMentorBenchmark({ ...benchmark, cases: [benchmark.cases[0], benchmark.cases[0]] })).toThrow(/duplicate/i);
  });
});

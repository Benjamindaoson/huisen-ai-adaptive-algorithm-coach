import { describe, expect, it } from 'vitest';
import { buildGoldenQuality } from './golden-quality.mjs';

function item(id, patch = {}) {
  return { id, title: id, completeness: 'complete', languages: ['python'], excerpt: '数组排序题', searchText: '', ...patch };
}

describe('buildGoldenQuality', () => {
  it('creates a deterministic annotated set and reports the trusted gap honestly', () => {
    const catalog = [item('a'), item('b'), item('c')];
    const records = new Map([['b', { sections: { description: '描述', input: '输入', output: '输出' } }]]);
    const result = buildGoldenQuality(catalog, records, new Set(['b']), 2);
    expect(result.annotations).toHaveLength(2);
    expect(result.annotations[0]).toMatchObject({
      id: 'b', reviewStatus: 'candidate', contentReviewStatus: 'verified', skillReviewStatus: 'inferred',
      solutionReviewStatus: 'candidate', publicSampleCount: 2, hiddenTestCount: 2, skills: ['array', 'sorting'],
    });
    expect(result.report).toMatchObject({ target: 2, annotated: 2, contentVerified: 1, skillVerified: 0, candidate: 2, pass: true });
  });

  it('fails the gate when the target cannot be filled or a verified record lacks required content', () => {
    const result = buildGoldenQuality([item('a')], new Map([['a', { sections: { description: '', input: '', output: '' } }]]), new Set(['a']), 2);
    expect(result.report.pass).toBe(false);
    expect(result.report.issues.length).toBeGreaterThan(0);
  });
});

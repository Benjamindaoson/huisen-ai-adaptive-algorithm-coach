import { describe, expect, it } from 'vitest';
import { buildSubmissionDiff } from './submission-diff';

describe('submission snapshot diff', () => {
  it('reports an unchanged immutable attempt without creating fake hunks', () => {
    expect(buildSubmissionDiff('a\nb', 'a\nb')).toEqual({ freshness: 'current', added: 0, removed: 0, hunks: [], truncated: false });
  });

  it('keeps line identity while projecting changed editor content', () => {
    const result = buildSubmissionDiff('const x = 1;\nconsole.log(x);', 'const x = 2;\nconsole.log(x);\n');
    expect(result).toMatchObject({ freshness: 'stale', added: 1, removed: 1, truncated: false });
    expect(result.hunks[0].lines).toEqual([
      { kind: 'removed', value: 'const x = 1;', oldLine: 1 },
      { kind: 'added', value: 'const x = 2;', newLine: 1 },
    ]);
  });

  it('returns an honest summary instead of quadratic work for oversized sources', () => {
    const before = Array.from({ length: 450 }, (_, index) => `old-${index}`).join('\n');
    const current = Array.from({ length: 450 }, (_, index) => `new-${index}`).join('\n');
    const result = buildSubmissionDiff(before, current, 400);
    expect(result).toEqual({ freshness: 'stale', added: 450, removed: 450, hunks: [], truncated: true });
  });
});

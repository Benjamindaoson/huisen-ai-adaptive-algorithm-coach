import { describe, expect, it } from 'vitest';
import { createCorpusRetriever, type MentorRetrievalIndex } from './corpus-retrieval.js';

const index: MentorRetrievalIndex = {
  version: 1, problemCount: 2, documentCount: 4,
  documents: [
    { ref: 'problem:verified', kind: 'problem', title: '滑动窗口最大值', text: '连续数组窗口 双指针', skillIds: ['array'], verification: 'verified', authoritative: true, metadata: {} },
    { ref: 'problem:candidate', kind: 'problem', title: '数组窗口练习', text: '连续数组窗口 双指针', skillIds: ['array'], verification: 'candidate', authoritative: false, metadata: {} },
    { ref: 'solution:candidate', kind: 'solution', title: '候选解', text: '使用窗口维护最大值', skillIds: ['array'], verification: 'candidate', authoritative: false, metadata: {} },
    { ref: 'misconception:boundary', kind: 'misconception', title: '窗口边界', text: '右边界多移动一次 off by one', skillIds: ['array'], verification: 'candidate', authoritative: false, metadata: { misconceptionId: 'off-by-one' } },
  ],
};

describe('full corpus retriever', () => {
  it('ranks Chinese lexical, skill, misconception and trust evidence with stable citations', () => {
    const retriever = createCorpusRetriever(index);
    const results = retriever.search({ text: '连续数组滑动窗口', skillIds: ['array'], misconceptionIds: ['off-by-one'], limit: 4 });
    expect(results[0].ref).toBe('problem:verified');
    expect(results.find((item) => item.ref === 'misconception:boundary')?.reasons).toContain('misconception-match');
    expect(results.every((item) => item.excerpt.length <= 220 && item.score > 0)).toBe(true);
  });

  it('never upgrades candidate solution authority', () => {
    const result = createCorpusRetriever(index).search({ text: '窗口维护最大值', skillIds: ['array'], misconceptionIds: [], limit: 3 });
    expect(result.find((item) => item.ref === 'solution:candidate')).toMatchObject({ verification: 'candidate', authoritative: false });
  });
});

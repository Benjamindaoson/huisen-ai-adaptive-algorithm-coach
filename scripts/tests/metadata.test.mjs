import { expect, test } from 'vitest';
import { createProblemId, deriveMetadata } from '../lib/metadata.mjs';

test('deriveMetadata extracts collection, score and readable title from an exported filename', () => {
  expect(deriveMetadata('ABCD卷/(A卷,100分)- IPv4地址转换成整数（Java & Python & JS）.html')).toMatchObject({
    collection: 'ABCD卷',
    score: 100,
    title: 'IPv4地址转换成整数',
  });
});

test('createProblemId is stable for normalized problem text', () => {
  const base = { title: 'IPv4地址转换成整数', sections: { description: '描述', input: '输入', output: '输出' } };
  expect(createProblemId(base)).toBe(createProblemId({ ...base, sections: { description: ' 描述 ', input: '输入', output: '输出' } }));
});

test('createProblemId distinguishes variants with the same prompt but different reference code', () => {
  const base = { title: '报数游戏', sections: { description: '描述', input: '输入', output: '输出' } };
  expect(createProblemId({ ...base, solutions: { python: "print('a')" } })).not.toBe(
    createProblemId({ ...base, solutions: { python: "print('b')" } }),
  );
});

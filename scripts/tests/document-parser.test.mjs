import { expect, test } from 'vitest';
import { parseDocumentText } from '../lib/document-parser.mjs';

test('parseDocumentText separates Word-style headings into readable problem sections', () => {
  const problem = parseDocumentText(`
    （100分）压缩日志查询（Java & JS & Python&C/C++）-解题思路待更新
    题目描述：某设备需要记录每分钟检测到的指标值。
    输入描述：第一行为查询的时间范围，格式是 startTime,endTime。
    输出描述：输出描述 输出查询到的日志清单。
    示例1
    输入：202411231010,202411231013
    输出：202411231010,11
  `, { collection: 'C卷', title: '压缩日志查询', score: 100 });

  expect(problem.sections).toMatchObject({
    description: '某设备需要记录每分钟检测到的指标值。',
    input: '第一行为查询的时间范围，格式是 startTime,endTime。',
    output: '输出查询到的日志清单。',
    examples: ['输入：202411231010,202411231013 输出：202411231010,11'],
  });
  expect(problem.sections.description).not.toContain('输入描述');
});

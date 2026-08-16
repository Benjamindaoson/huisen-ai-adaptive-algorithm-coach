import { expect, it } from 'vitest';
import { STARTER_ALGORITHM_LESSONS } from './starter-algorithm-curriculum';

it('provides three short starter lessons in a learnable sequence', () => {
  expect(STARTER_ALGORITHM_LESSONS.map((lesson) => lesson.id)).toEqual([
    'starter-array-traversal',
    'starter-hash-lookup',
    'starter-two-pointers',
  ]);
  expect(STARTER_ALGORITHM_LESSONS.every((lesson) => lesson.minutes === 8)).toBe(true);
  expect(STARTER_ALGORITHM_LESSONS.every((lesson) => lesson.frames.length >= 3 && lesson.checkpoint.options.length >= 2 && lesson.completion.template.includes('___'))).toBe(true);
});

import { describe, expect, it } from 'vitest';
import { FOUNDATION_LESSONS, validateFoundationCurriculum } from './foundation-curriculum';

describe('foundation curriculum', () => {
  it('ships twelve ordered, trusted Python-first lessons', () => {
    expect(FOUNDATION_LESSONS).toHaveLength(12);
    expect(FOUNDATION_LESSONS.map((lesson) => lesson.order)).toEqual(
      Array.from({ length: 12 }, (_, index) => index + 1),
    );
    expect(FOUNDATION_LESSONS.every((lesson) => lesson.language === 'python')).toBe(true);
    expect(validateFoundationCurriculum()).toEqual([]);
  });

  it('keeps every prerequisite earlier than the lesson that needs it', () => {
    const order = new Map(FOUNDATION_LESSONS.map((lesson) => [lesson.id, lesson.order]));
    for (const lesson of FOUNDATION_LESSONS) {
      for (const prerequisite of lesson.prerequisites) {
        expect(order.get(prerequisite)).toBeLessThan(lesson.order);
      }
    }
  });

  it('contains explain, observe, predict, complete and transfer material', () => {
    for (const lesson of FOUNDATION_LESSONS) {
      expect(lesson.analogy.length).toBeGreaterThan(10);
      expect(lesson.frames.length).toBeGreaterThan(1);
      expect(lesson.checkpoint.options.length).toBeGreaterThanOrEqual(2);
      expect(lesson.completion.template).toContain('___');
      expect(lesson.completion.answer.length).toBeGreaterThan(0);
      expect(lesson.transfer.prompt.length).toBeGreaterThan(10);
    }
  });
});

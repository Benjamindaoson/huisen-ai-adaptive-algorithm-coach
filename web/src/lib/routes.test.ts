import { describe, expect, it } from 'vitest';
import { hrefFor, parseHashRoute } from './routes';

describe('hash routes', () => {
  it.each([
    ['', { name: 'today' }],
    ['#/', { name: 'today' }],
    ['#/today', { name: 'today' }],
    ['#/problems', { name: 'problems' }],
    ['#/paths', { name: 'paths' }],
    ['#/review', { name: 'review' }],
    ['#/exam', { name: 'exam' }],
    ['#/exam/session', { name: 'exam-session' }],
    ['#/insights', { name: 'insights' }],
    ['#/problem/od%2F42', { name: 'problem', problemId: 'od/42' }],
    ['#/learn/input-output', { name: 'learn', lessonId: 'input-output' }],
  ])('parses %s', (hash, expected) => {
    expect(parseHashRoute(hash)).toEqual(expected);
  });

  it('falls back to Today for unknown routes', () => {
    expect(parseHashRoute('#/unknown')).toEqual({ name: 'today' });
  });

  it('builds encoded problem and exam session links', () => {
    expect(hrefFor({ name: 'problem', problemId: 'od/42' })).toBe('#/problem/od%2F42');
    expect(hrefFor({ name: 'exam-session' })).toBe('#/exam/session');
    expect(hrefFor({ name: 'learn', lessonId: 'input/output' })).toBe('#/learn/input%2Foutput');
  });
});

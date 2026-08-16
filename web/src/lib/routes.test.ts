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
    ['#/practicum', { name: 'practicum' }],
    ['#/practicum/repo-async-cache', { name: 'practicum-project', projectId: 'repo-async-cache' }],
    ['#/trust', { name: 'trust' }],
    ['#/quality', { name: 'quality' }],
    ['#/problem/od%2F42', { name: 'problem', problemId: 'od/42' }],
    ['#/learn/input-output', { name: 'learn', lessonId: 'input-output' }],
    ['#/learn/input-output?return=od%2F42', { name: 'learn', lessonId: 'input-output', returnProblemId: 'od/42' }],
    ['#/training/starter-array-traversal', { name: 'training', lessonId: 'starter-array-traversal' }],
    ['#/training/starter-array-traversal?returnLesson=variables-state&recommendation=handoff-variables-state-01%2F23', { name: 'training', lessonId: 'starter-array-traversal', returnLessonId: 'variables-state', recommendationId: 'handoff-variables-state-01/23' }],
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
    expect(hrefFor({ name: 'practicum-project', projectId: 'repo/async-cache' })).toBe('#/practicum/repo%2Fasync-cache');
    expect(hrefFor({ name: 'learn', lessonId: 'input-output', returnProblemId: 'od/42' })).toBe('#/learn/input-output?return=od%2F42');
    expect(hrefFor({ name: 'training', lessonId: 'starter-array-traversal' })).toBe('#/training/starter-array-traversal');
    expect(hrefFor({ name: 'training', lessonId: 'starter/array', returnLessonId: 'variables/state', recommendationId: 'handoff/01' })).toBe('#/training/starter%2Farray?returnLesson=variables%2Fstate&recommendation=handoff%2F01');
  });
});

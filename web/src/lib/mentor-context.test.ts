import { describe, expect, it } from 'vitest';
import { buildMentorRouteContext, mentorWorkspaceKey } from './mentor-context';

describe('Mentor route context contributors', () => {
  it.each([
    [{ name: 'today' }, 'today'], [{ name: 'paths' }, 'learn'], [{ name: 'learn', lessonId: 'loops' }, 'learn'],
    [{ name: 'problems' }, 'practice'], [{ name: 'problem', problemId: 'p-1' }, 'practice'], [{ name: 'review' }, 'review'],
    [{ name: 'exam-session' }, 'exam-ai'], [{ name: 'insights' }, 'insights'],
  ] as const)('maps %o to bounded %s context', (route, expected) => {
    const context = buildMentorRouteContext(route as never, { ref: 'screen-1', evidenceCount: 7, nextAction: '完成一题' });
    expect(context.route.kind).toBe(expected);
    expect(context.contribution.evidenceRefs).toEqual(['route:screen-1']);
    expect(JSON.stringify(context)).not.toMatch(/sourceCode|rawKeystrokes|hiddenTests/);
  });

  it('creates a stable workspace key from the bounded route and sanitized task ref', () => {
    const context = buildMentorRouteContext({ name: 'practicum-project', projectId: 'repo/async cache' } as never, { ref: 'repo/async cache', evidenceCount: 2, nextAction: '定位失效边界' });
    expect(mentorWorkspaceKey(context.route)).toBe('practice:repo-async-cache');
    expect(context.contribution.data.workspaceKey).toBe('practice:repo-async-cache');
  });
});

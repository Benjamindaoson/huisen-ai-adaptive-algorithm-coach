import { expect, it } from 'vitest';
import { activeMentorOSForRoute, emptyMentorOSState } from './mentor-os-state';

it('returns only a v2 run scoped to the current learner and route', () => {
  const state = {
    ...emptyMentorOSState(),
    active: { runId: 'run-old', learnerId: 'learner-a', cursor: 4, checkpoint: { sequence: 4, nextAction: '旧题目' }, routeKey: 'practice:old', scopeVersion: 2 as const },
  };
  expect(activeMentorOSForRoute(state, 'learner-a', 'practice:old')).toMatchObject({ runId: 'run-old', cursor: 4 });
  expect(activeMentorOSForRoute(state, 'learner-a', 'practice:new')).toBeUndefined();
  expect(activeMentorOSForRoute(state, 'learner-b', 'practice:old')).toBeUndefined();
});

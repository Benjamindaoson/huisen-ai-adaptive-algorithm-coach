import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { LearningEvent } from '../learning-validation.js';
import type { MentorSession } from './mentor-engine.js';
import { createLearnerTwin } from './learner-twin.js';
import { createMentorStore, twinObservationsFromLearningEvents } from './mentor-store.js';

const temporary: string[] = [];
afterEach(async () => Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

function session(): MentorSession {
  return {
    version: 1, id: 'mentor-session-1', learnerId: 'learner-a', problemId: 'od-1', phase: 'awaiting-prediction',
    mode: 'deterministic', judgeOutcome: 'wrong-answer', nextAction: '预测边界', twin: createLearnerTwin('learner-a'),
    timeline: Array.from({ length: 205 }, (_, index) => ({
      id: `event-${index}`, type: 'observation' as const, title: '观察', detail: `证据 ${index}`,
      at: new Date(1_700_000_000_000 + index).toISOString(), evidenceRefs: [`ref:${index}`], status: 'complete' as const,
    })),
  };
}

describe('Mentor store', () => {
  it('persists sessions and twins atomically with bounded history and owner checks', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mentor-store-'));
    temporary.push(directory);
    const filePath = join(directory, 'mentor.json');
    const first = createMentorStore({ filePath });
    await first.putSession(session());
    const second = createMentorStore({ filePath });
    expect((await second.getSession('mentor-session-1', 'learner-a'))?.timeline).toHaveLength(200);
    expect(await second.getSession('mentor-session-1', 'learner-b')).toBeUndefined();
    expect((await second.getTwin('learner-a'))?.learnerId).toBe('learner-a');
    const persisted = JSON.parse(await readFile(filePath, 'utf8')) as { version: number };
    expect(persisted.version).toBe(1);
  });

  it('migrates learning events into stable evidence with assistance and transfer distinguished', () => {
    const events: LearningEvent[] = [
      { id: 'failed-1', learnerId: 'learner-a', kind: 'attempt-recorded', problemId: 'od-1', attemptId: 'a1', data: { outcome: 'wrong-answer', skillIds: ['array'] }, createdAt: '2026-08-11T00:00:00Z' },
      { id: 'assisted-1', learnerId: 'learner-a', kind: 'attempt-recorded', problemId: 'od-1', attemptId: 'a2', data: { outcome: 'passed', assisted: true, skillIds: ['array'] }, createdAt: '2026-08-11T00:01:00Z' },
      { id: 'transfer-1', learnerId: 'learner-a', kind: 'mastery-check-passed', problemId: 'od-2', data: { skillIds: ['array'] }, createdAt: '2026-08-11T00:02:00Z' },
    ];
    expect(twinObservationsFromLearningEvents(events)).toEqual([
      expect.objectContaining({ kind: 'failure', evidenceRef: 'learning-event:failed-1' }),
      expect.objectContaining({ kind: 'assisted-pass', evidenceRef: 'learning-event:assisted-1' }),
      expect.objectContaining({ kind: 'transfer-pass', evidenceRef: 'learning-event:transfer-1' }),
    ]);
  });
});

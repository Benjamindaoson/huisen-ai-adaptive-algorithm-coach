import { describe, expect, it } from 'vitest';
import { LEARNING_EVENT_KINDS, type LearningEventKind } from './learning-event-contract';
import { parseLearnerMemory } from '../web/src/lib/learner-memory';
import { planLocalMigration, serverCompatibleEvent } from '../web/src/lib/platform-outbox';
import { validateLearningEvent } from '../services/runner/gateway/src/learning-validation';

type ContractEvent = {
  id: string; kind: LearningEventKind; data: Record<string, unknown>; createdAt: string;
  problemId?: string; attemptId?: string;
};

function fixture(kind: LearningEventKind): ContractEvent {
  const base = { id: `contract-${kind}`, kind, createdAt: '2026-08-15T00:00:00.000Z' };
  switch (kind) {
    case 'goal-updated': return { ...base, data: { target: 'foundation', examDate: '', dailyMinutes: 45, preferredLanguage: 'python' } };
    case 'attempt-recorded': return { ...base, problemId: 'problem-1', attemptId: 'attempt-1', data: { outcome: 'wrong-answer', skillIds: ['array'] } };
    case 'hint-requested':
    case 'hint-received': return { ...base, problemId: 'problem-1', attemptId: 'attempt-1', data: { hintLevel: 1 } };
    case 'reference-unlocked': return { ...base, problemId: 'problem-1', attemptId: 'attempt-1', data: {} };
    case 'mastery-check-started':
    case 'mastery-check-passed':
    case 'mastery-check-failed': return { ...base, problemId: 'problem-1', data: { skillIds: ['array'], reason: 'contract-check' } };
    case 'lesson-started': return { ...base, data: { lessonId: 'lesson-1', stage: 'explain' } };
    case 'lesson-checkpoint-passed': return { ...base, data: { lessonId: 'lesson-1', stage: 'predict', correct: true } };
    case 'lesson-completed': return { ...base, data: { lessonId: 'lesson-1', stage: 'complete', correct: true } };
    case 'lesson-transfer-started': return { ...base, problemId: 'problem-1', data: { lessonId: 'lesson-1', stage: 'transfer', skillIds: ['array'] } };
    case 'lesson-transfer-passed': return { ...base, problemId: 'problem-1', attemptId: 'attempt-1', data: { lessonId: 'lesson-1', stage: 'transfer', correct: true, assisted: false, skillIds: ['array'] } };
    case 'lesson-handoff-feedback': return { ...base, data: { lessonId: 'lesson-1', recommendationId: 'recommendation-1', choiceId: 'helpful' } };
    case 'first-minute-mission-seen':
    case 'first-minute-mission-reason-acknowledged':
    case 'first-minute-first-run': return { ...base, data: { lessonId: 'lesson-1' } };
    case 'mentor-revision-verified': return { ...base, problemId: 'problem-1', attemptId: 'attempt-1', data: { outcome: 'passed' } };
    case 'training-session-started': return { ...base, data: { lessonId: 'lesson-1', stage: 'explain' } };
    case 'training-stage-completed': return { ...base, data: { lessonId: 'lesson-1', stage: 'build', correct: true, skillIds: ['array'] } };
    case 'training-session-completed': return { ...base, data: { lessonId: 'lesson-1', stage: 'transfer' } };
    case 'bridge-diagnostic-started': return { ...base, data: { curriculumVersion: '2.0.0' } };
    case 'bridge-diagnostic-step-recorded': return { ...base, data: { curriculumVersion: '2.0.0', diagnosticStep: 'state', correct: true } };
    case 'practicum-started': return { ...base, problemId: 'project-1', data: { phase: 'understanding' } };
    case 'practicum-phase-completed': return { ...base, problemId: 'project-1', data: { phase: 'diagnosis', choiceId: 'diagnosis-1' } };
    case 'practicum-hint-used': return { ...base, problemId: 'project-1', data: { phase: 'implementation', hintLevel: 1 } };
    case 'practicum-tested': return { ...base, problemId: 'project-1', data: { phase: 'verification', passed: true, passedCount: 4, totalCount: 4 } };
    case 'practicum-reflected': return { ...base, problemId: 'project-1', data: { phase: 'reflection', reflectionTag: 'test-first' } };
    case 'practicum-completed': return { ...base, problemId: 'project-1', data: { phase: 'completed', passed: true } };
    default: {
      const unhandled: never = kind;
      throw new Error(`Missing contract fixture: ${String(unhandled)}`);
    }
  }
}

describe('shared learning-event contract', () => {
  it('accepts every canonical kind across device, account migration, and Gateway authority', async () => {
    expect(LEARNING_EVENT_KINDS.length).toBeGreaterThan(0);
    expect(new Set(LEARNING_EVENT_KINDS).size).toBe(LEARNING_EVENT_KINDS.length);
    for (const kind of LEARNING_EVENT_KINDS) {
      const event = fixture(kind);
      expect(() => parseLearnerMemory({
        version: 1,
        profile: { learnerId: 'learner-1', target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-15T00:00:00.000Z' },
        events: [{ learnerId: 'learner-1', ...event }],
      }), `device parser rejected ${kind}`).not.toThrow();
      expect(serverCompatibleEvent(event), `migration rejected ${kind}`).toBe(true);
      const migration = await planLocalMigration({
        learnerId: 'learner-1', targetLearnerId: 'account-1',
        profile: { learnerId: 'learner-1', target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-15T00:00:00.000Z' },
        events: [{ learnerId: 'learner-1', ...event }], progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
      }, async () => 'a'.repeat(64));
      expect(migration.quarantinedEvents, `migration quarantined ${kind}`).toEqual([]);
      expect(() => validateLearningEvent('account-1', event), `Gateway rejected ${kind}`).not.toThrow();
    }
  });

  it('keeps unknown kinds and data keys outside every trust boundary', async () => {
    const unknown = { id: 'contract-unknown', kind: 'future-unknown', data: { rawSecret: 'no' }, createdAt: '2026-08-15T00:00:00.000Z' };
    expect(() => parseLearnerMemory({
      version: 1,
      profile: { learnerId: 'learner-1', target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-15T00:00:00.000Z' },
      events: [{ learnerId: 'learner-1', ...unknown }],
    })).toThrow();
    expect(serverCompatibleEvent(unknown)).toBe(false);
    const migration = await planLocalMigration({
      learnerId: 'learner-1', targetLearnerId: 'account-1',
      profile: { learnerId: 'learner-1', target: 'foundation', examDate: null, dailyMinutes: 45, preferredLanguage: 'python', updatedAt: '2026-08-15T00:00:00.000Z' },
      events: [{ learnerId: 'learner-1', ...unknown }], progress: { version: 1, problems: {} }, practice: { version: 1, drafts: {}, attempts: [] }, exam: null,
    }, async () => 'a'.repeat(64));
    expect(migration.counts).toMatchObject({ events: 0, quarantinedEvents: 1 });
    expect(() => validateLearningEvent('account-1', unknown)).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { exportLearningBackup, importLearningBackup } from './backup';
import { emptyLearnerMemory, updateLearnerProfile } from './learner-memory';
import { emptyPractice, updateDraft } from './practice';
import { emptyProgress, updateProgress } from './progress';

describe('learning backup', () => {
  it('round-trips progress, practice and learner memory', () => {
    const progress = updateProgress(emptyProgress(), 'od-a', { status: 'in-progress' }, new Date('2026-08-11T01:00:00Z'));
    const practice = updateDraft(emptyPractice(), 'od-a', 'python', 'print(1)', new Date('2026-08-11T01:01:00Z'));
    const memory = updateLearnerProfile(emptyLearnerMemory('learner-a'), { target: 'interview', examDate: null, dailyMinutes: 30, preferredLanguage: 'java' });
    const json = exportLearningBackup(progress, practice, memory, new Date('2026-08-11T02:00:00Z'));

    expect(JSON.parse(json).version).toBe(5);
    expect(importLearningBackup(json, 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory())).toMatchObject({ progress, practice, memory });
  });

  it('imports legacy progress without deleting current practice', () => {
    const currentPractice = updateDraft(emptyPractice(), 'od-a', 'python', 'keep me');
    const currentMemory = emptyLearnerMemory('learner-a', new Date('2026-08-11T00:00:00Z'));
    const legacy = JSON.stringify(updateProgress(emptyProgress(), 'od-a', { starred: true }));
    const imported = importLearningBackup(legacy, 'replace', emptyProgress(), currentPractice, currentMemory);

    expect(imported.progress.problems['od-a'].starred).toBe(true);
    expect(imported.practice).toEqual(currentPractice);
    expect(imported.memory).toEqual(currentMemory);
  });

  it('validates both sections before returning any replacement', () => {
    const invalid = JSON.stringify({
      version: 2,
      exportedAt: '2026-08-11T02:00:00.000Z',
      progress: emptyProgress(),
      practice: { version: 1, drafts: [], attempts: [] },
    });

    expect(() => importLearningBackup(invalid, 'replace', emptyProgress(), emptyPractice())).toThrow('Invalid practice drafts');
  });

  it('merges drafts by their update time', () => {
    const local = updateDraft(emptyPractice(), 'od-a', 'python', 'newer', new Date('2026-08-11T03:00:00Z'));
    const incoming = updateDraft(emptyPractice(), 'od-a', 'python', 'older', new Date('2026-08-11T02:00:00Z'));
    const json = exportLearningBackup(emptyProgress(), incoming, emptyLearnerMemory());
    const imported = importLearningBackup(json, 'merge', emptyProgress(), local);

    expect(imported.practice.drafts['od-a:python'].sourceCode).toBe('newer');
  });

  it('imports a version 2 backup without replacing current learner memory', () => {
    const currentMemory = updateLearnerProfile(emptyLearnerMemory('learner-a'), { target: 'foundation', examDate: null, dailyMinutes: 60, preferredLanguage: 'cpp' });
    const legacyV2 = JSON.stringify({
      version: 2, exportedAt: '2026-08-11T02:00:00.000Z', progress: emptyProgress(), practice: emptyPractice(),
    });
    expect(importLearningBackup(legacyV2, 'replace', emptyProgress(), emptyPractice(), currentMemory).memory).toEqual(currentMemory);
  });

  it('round-trips pedagogical evidence and teacher reviews in v4', () => {
    const pedagogicalMemory = { version: 1 as const, events: [{ version: 1 as const, id: 'ped-1', learnerId: 'learner-a', kind: 'problem-opened' as const, problemId: 'od-a', createdAt: '2026-08-11T00:00:00.000Z', evidenceRefs: ['problem:od-a'], data: {} }] };
    const qualityReviews = { version: 1 as const, teacherReviews: [{ reviewerId: 'teacher-1', preferredHash: 'hash-a', rubric: { localization: true, cause: true, evidence: true, minimalHint: true, leakage: false }, notes: '', reviewedAt: '2026-08-11T00:00:00.000Z', comparisonId: 'comparison-1', caseId: 'case-1', datasetVersion: 'v1', attemptId: 'attempt-1', candidateHashes: ['hash-a', 'hash-b'] as [string, string] }] };
    const json = exportLearningBackup(emptyProgress(), emptyPractice(), emptyLearnerMemory('learner-a'), new Date('2026-08-11T02:00:00Z'), pedagogicalMemory, qualityReviews);
    const imported = importLearningBackup(json, 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory(), undefined, undefined);
    expect(imported.pedagogicalMemory).toEqual(pedagogicalMemory);
    expect(imported.qualityReviews).toEqual(qualityReviews);
  });

  it('round-trips Mentor OS cursor, approvals, experiments, and outcome links in v5', () => {
    const mentorOS = { version: 1 as const, active: { runId: 'run-1', learnerId: 'learner-a', cursor: 8, checkpoint: { sequence: 8, nextAction: '预测状态' }, routeKey: 'practice:p-1' }, approvals: [{ id: 'edit-1', decision: 'reject' as const, decidedAt: '2026-08-12T00:00:00Z' }], experiments: [{ id: 'exp-1', arm: 'mentor' }], outcomeLinks: [{ runId: 'run-1', attemptId: 'a2' }] };
    const json = exportLearningBackup(emptyProgress(), emptyPractice(), emptyLearnerMemory(), new Date('2026-08-12T02:00:00Z'), undefined, undefined, mentorOS);
    expect(JSON.parse(json).version).toBe(5);
    const imported = importLearningBackup(json, 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory());
    expect(imported.mentorOS).toEqual(mentorOS);
  });

  it('re-projects a recoverable milestone from an existing v5 backup without inventing missing evidence', () => {
    const memory = emptyLearnerMemory('learner-a', new Date('2026-08-01T00:00:00Z'));
    const mission = { id: 'mission-old', learnerId: 'learner-a', kind: 'first-minute-mission-seen' as const, data: { lessonId: 'starter-array-traversal' }, createdAt: '2026-08-01T00:00:00.000Z' };
    const recent = Array.from({ length: 520 }, (_, index) => ({
      id: `recent-${index}`, learnerId: 'learner-a', kind: 'hint-requested' as const, problemId: 'od-a', attemptId: `attempt-${index}`,
      data: { hintLevel: 1 as const }, createdAt: new Date(Date.parse('2026-08-02T00:00:00Z') + index * 1_000).toISOString(),
    }));
    const json = exportLearningBackup(emptyProgress(), emptyPractice(), { ...memory, events: [mission, ...recent] });
    const imported = importLearningBackup(json, 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory('learner-a'));

    expect(imported.memory.events).toHaveLength(500);
    expect(imported.memory.events.some((event) => event.id === mission.id)).toBe(true);
    const withoutMission = importLearningBackup(exportLearningBackup(emptyProgress(), emptyPractice(), { ...memory, events: recent }), 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory('learner-a'));
    expect(withoutMission.memory.events.some((event) => event.kind === 'first-minute-mission-seen')).toBe(false);
  });
});

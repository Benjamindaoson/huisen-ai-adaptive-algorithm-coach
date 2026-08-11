import { describe, expect, it } from 'vitest';
import { exportLearningBackup, importLearningBackup } from './backup';
import { emptyLearnerMemory, updateLearnerProfile } from './learner-memory';
import { emptyPractice, updateDraft } from './practice';
import { emptyProgress, updateProgress } from './progress';

describe('learning backup v3', () => {
  it('round-trips progress, practice and learner memory', () => {
    const progress = updateProgress(emptyProgress(), 'od-a', { status: 'in-progress' }, new Date('2026-08-11T01:00:00Z'));
    const practice = updateDraft(emptyPractice(), 'od-a', 'python', 'print(1)', new Date('2026-08-11T01:01:00Z'));
    const memory = updateLearnerProfile(emptyLearnerMemory('learner-a'), { target: 'interview', examDate: null, dailyMinutes: 30, preferredLanguage: 'java' });
    const json = exportLearningBackup(progress, practice, memory, new Date('2026-08-11T02:00:00Z'));

    expect(JSON.parse(json).version).toBe(3);
    expect(importLearningBackup(json, 'replace', emptyProgress(), emptyPractice(), emptyLearnerMemory())).toEqual({ progress, practice, memory });
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
});

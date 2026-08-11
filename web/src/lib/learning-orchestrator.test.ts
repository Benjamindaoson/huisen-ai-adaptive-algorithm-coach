import { describe, expect, it } from 'vitest';
import { emptyLearnerMemory, updateLearnerProfile, type LearningEvent } from './learner-memory';
import { orchestrateLearning } from './learning-orchestrator';
import type { SkillMastery } from './mastery';
import type { PracticeAttempt } from './practice';
import { emptyProgress } from './progress';

const catalog = [
  { id: 'od-array-1', title: '数组入门', searchText: '数组', excerpt: '数组', skills: ['array'] as const, completeness: 'complete' as const, languages: ['python'] },
  { id: 'od-array-2', title: '数组迁移', searchText: '数组', excerpt: '数组', skills: ['array'] as const, completeness: 'complete' as const, languages: ['python'] },
  { id: 'od-graph', title: '图搜索', searchText: '图 BFS', excerpt: '图 BFS', skills: ['graph', 'search'] as const, completeness: 'complete' as const, languages: ['python'] },
];

const blankMastery: SkillMastery[] = [];

describe('orchestrateLearning', () => {
  it('labels a no-evidence plan as baseline and exposes its tool trace', () => {
    const decision = orchestrateLearning({
      profile: emptyLearnerMemory('learner-a').profile, events: [], catalog,
      mastery: blankMastery, attempts: [], progress: emptyProgress(), now: new Date('2026-08-11T00:00:00Z'), traceId: 'trace-baseline',
    });
    expect(decision).toMatchObject({ traceId: 'trace-baseline', role: 'learning-orchestrator', mode: 'baseline' });
    expect(decision.tools.map((tool) => tool.name)).toEqual(['get_learner_profile', 'get_mastery_evidence', 'select_practice_candidates']);
    expect(decision.evidence.some((item) => item.summary.includes('尚无有效提交'))).toBe(true);
    expect(decision.actions[0]).toMatchObject({ type: 'practice', problemId: 'od-array-1' });
  });

  it('raises urgency when an OD exam is within fourteen days', () => {
    const memory = updateLearnerProfile(emptyLearnerMemory('learner-a'), {
      target: 'od-exam', examDate: '2026-08-20', dailyMinutes: 60, preferredLanguage: 'python',
    });
    const decision = orchestrateLearning({
      profile: memory.profile, events: memory.events, catalog, mastery: blankMastery, attempts: [], progress: emptyProgress(),
      now: new Date('2026-08-11T00:00:00Z'), traceId: 'trace-sprint',
    });
    expect(decision.strategy).toBe('sprint');
    expect(decision.summary).toContain('9 天');
  });

  it('schedules a different mastery check when a hint on a failed attempt is followed by a retry pass', () => {
    const passed: PracticeAttempt = {
      id: 'attempt-1', problemId: 'od-array-1', language: 'python', mode: 'sample-submit', codeSnapshot: 'print(1)',
      outcome: 'passed', summary: '1/1', createdAt: '2026-08-11T01:00:00Z',
    };
    const hint: LearningEvent = {
      id: 'hint-1', learnerId: 'learner-a', kind: 'hint-received', problemId: 'od-array-1', attemptId: 'attempt-failed',
      data: { hintLevel: 2 }, createdAt: '2026-08-11T00:59:00Z',
    };
    const decision = orchestrateLearning({
      profile: emptyLearnerMemory('learner-a').profile, events: [hint], catalog, mastery: blankMastery, attempts: [passed],
      progress: emptyProgress(), now: new Date('2026-08-11T02:00:00Z'), traceId: 'trace-check',
    });
    expect(decision.mode).toBe('mastery-check');
    expect(decision.actions[0]).toMatchObject({ type: 'mastery-check', problemId: 'od-array-2' });
    expect(decision.actions[0].reason).toContain('接受过 2 级提示');
  });
});

import { describe, expect, it } from 'vitest';
import { buildPracticumHarness, derivePracticumProgress, mentorIntervention, parsePracticumTestOutput, projectAvailability, PROJECT_PRACTICUMS } from './project-practicum';
import type { LearningEvent } from './learner-memory';

describe('repository practicum', () => {
  it('requires diagnosis, planning, implementation, verification and reflection in order', () => {
    const events: LearningEvent[] = [
      { id: 'e1', learnerId: 'l1', kind: 'practicum-started', problemId: 'repo-pagination', data: { phase: 'understanding' }, createdAt: '2026-08-13T00:00:00Z' },
      { id: 'e2', learnerId: 'l1', kind: 'practicum-phase-completed', problemId: 'repo-pagination', data: { phase: 'diagnosis', choiceId: 'missing-lower-bound' }, createdAt: '2026-08-13T00:01:00Z' },
      { id: 'e3', learnerId: 'l1', kind: 'practicum-phase-completed', problemId: 'repo-pagination', data: { phase: 'planning', choiceId: 'clamp-contract' }, createdAt: '2026-08-13T00:02:00Z' },
      { id: 'e4', learnerId: 'l1', kind: 'practicum-tested', problemId: 'repo-pagination', data: { phase: 'verification', passed: true, passedCount: 4, totalCount: 4 }, createdAt: '2026-08-13T00:03:00Z' },
    ];
    const progress = derivePracticumProgress(PROJECT_PRACTICUMS[0], events);
    expect(progress.phase).toBe('reflection');
    expect(progress.completed).toBe(false);
    expect(progress.evidenceRefs).toEqual(['event:e1', 'event:e2', 'event:e3', 'event:e4']);
  });

  it('builds an executable JavaScript harness and parses real test output', () => {
    const harness = buildPracticumHarness(PROJECT_PRACTICUMS[0], 'export function normalizePage(rawPage, totalPages) { return Math.min(Math.max(Number.parseInt(rawPage, 10) || 1, 1), Math.max(totalPages, 1)); }');
    expect(harness).toContain('normalizePage("-3", 8)');
    expect(harness).not.toContain('export function');
    expect(parsePracticumTestOutput('logs\nPRACTICUM_RESULT:{"passedCount":4,"totalCount":4,"failures":[]}')).toMatchObject({ passed: true, passedCount: 4 });
  });

  it('offers four differentiated projects in a prerequisite path', () => {
    expect(PROJECT_PRACTICUMS.map((project) => project.id)).toEqual([
      'repo-pagination', 'repo-async-cache', 'repo-selection-state', 'repo-large-dedup',
    ]);
    expect(new Set(PROJECT_PRACTICUMS.map((project) => project.verificationKind)).size).toBe(4);
    expect(PROJECT_PRACTICUMS.map((project) => project.order)).toEqual([1, 2, 3, 4]);

    const initial = projectAvailability(PROJECT_PRACTICUMS, []);
    expect(initial.map((item) => item.status)).toEqual(['available', 'locked', 'locked', 'locked']);
    expect(initial[1].missingPrerequisiteIds).toEqual(['repo-pagination']);

    const completedFirst: LearningEvent = { id: 'done-1', learnerId: 'l1', kind: 'practicum-completed', problemId: 'repo-pagination', data: { phase: 'completed' }, createdAt: '2026-08-13T01:00:00Z' };
    expect(projectAvailability(PROJECT_PRACTICUMS, [completedFirst]).map((item) => item.status)).toEqual(['completed', 'available', 'locked', 'locked']);
  });

  it('builds a project-specific executable harness for every repository task', () => {
    for (const project of PROJECT_PRACTICUMS) {
      const editable = project.files.find((file) => file.editable);
      expect(editable).toBeTruthy();
      const harness = buildPracticumHarness(project, editable!.content);
      expect(harness).toContain(`PRACTICUM_RESULT:`);
      expect(harness).toContain(`projectId: "${project.id}"`);
      expect(harness).not.toContain('export function');
    }
  });

  it('uses progressively scoped questions and never returns a complete patch', () => {
    const intervention = mentorIntervention('diagnosis', 1);
    expect(intervention.prompt).toContain('观察');
    expect(intervention.scope).toBe('file-boundary');
    expect(intervention.prompt).not.toContain('Math.max');
    expect(intervention).not.toHaveProperty('patch');
  });
});

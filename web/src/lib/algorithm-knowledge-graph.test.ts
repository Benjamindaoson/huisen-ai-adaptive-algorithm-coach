import { describe, expect, it } from 'vitest';
import {
  ALGORITHM_KNOWLEDGE_GRAPH,
  availableBridgeNodes,
  getAlgorithmKnowledgeNodeByLessonId,
  nextDelayedReview,
  smallestIncompletePrerequisite,
  validateAlgorithmKnowledgeGraph,
  type AlgorithmKnowledgeNode,
} from './algorithm-knowledge-graph';

describe('algorithm knowledge graph', () => {
  it('ships a reviewed, versioned five-stage node for every available foundation lesson', () => {
    expect(ALGORITHM_KNOWLEDGE_GRAPH.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(availableBridgeNodes()).toHaveLength(12);
    expect(validateAlgorithmKnowledgeGraph(ALGORITHM_KNOWLEDGE_GRAPH)).toEqual([]);
    for (const node of availableBridgeNodes()) {
      expect(node.authority).toBe('human-reviewed');
      expect(node.availability).toBe('available');
      expect(node.contentHash).toMatch(/^[a-f0-9]{16}$/);
      expect(node.microLessonMinutes).toBeGreaterThanOrEqual(5);
      expect(node.microLessonMinutes).toBeLessThanOrEqual(10);
      expect(node.stages).toEqual(['explain', 'visualize', 'predict', 'partial-code', 'full-practice']);
      expect(node.reviewIntervalsDays).toEqual([1, 7, 30]);
      expect(node.transferSkillIds.length).toBeGreaterThan(0);
    }
  });

  it('unifies foundation lessons, starter aliases, and future segments', () => {
    expect(new Set(ALGORITHM_KNOWLEDGE_GRAPH.nodes.map((node) => node.segment))).toEqual(new Set([
      'program-foundation', 'problem-modeling', 'core-patterns', 'structures-search', 'integrated-transfer',
    ]));
    expect(getAlgorithmKnowledgeNodeByLessonId('starter-array-traversal')?.id).toBe('arrays-strings');
    expect(getAlgorithmKnowledgeNodeByLessonId('starter-hash-lookup')?.id).toBe('hash-lookup');
    expect(getAlgorithmKnowledgeNodeByLessonId('starter-two-pointers')?.id).toBe('two-pointers');
    expect(ALGORITHM_KNOWLEDGE_GRAPH.nodes.some((node) => node.availability === 'coming-soon')).toBe(true);
  });

  it('fails duplicate, unknown, cyclic and incomplete graphs', () => {
    const base: AlgorithmKnowledgeNode = {
      id: 'a', lessonId: 'input-output', entryLessonIds: [], version: 1, title: 'A', objective: 'Learn A',
      segment: 'program-foundation', availability: 'available', misconceptionIds: ['state-confusion'], prerequisites: ['b'],
      skillIds: ['io-parsing'], transferSkillIds: ['io-parsing'], authority: 'human-reviewed', contentHash: '0000000000000000',
      microLessonMinutes: 5, visualization: 'state-table', reviewIntervalsDays: [1, 7, 30],
      stages: ['explain', 'visualize', 'predict', 'partial-code', 'full-practice'],
    };
    const graph = { version: '1.0.0', nodes: [base, { ...base, id: 'b', prerequisites: ['a'], skillIds: ['not-real' as never] }, { ...base }] };
    const issues = validateAlgorithmKnowledgeGraph(graph);
    expect(issues.some((issue) => issue.code === 'duplicate-node')).toBe(true);
    expect(issues.some((issue) => issue.code === 'cycle')).toBe(true);
    expect(issues.some((issue) => issue.code === 'unknown-skill')).toBe(true);
  });

  it('rejects a node whose reviewed content changed after fingerprinting', () => {
    const node = availableBridgeNodes()[0]!;
    const issues = validateAlgorithmKnowledgeGraph({
      ...ALGORITHM_KNOWLEDGE_GRAPH,
      nodes: ALGORITHM_KNOWLEDGE_GRAPH.nodes.map((item) => item.id === node.id ? { ...item, title: 'tampered' } : item),
    });

    expect(issues.some((issue) => issue.code === 'content-hash-mismatch')).toBe(true);
  });

  it('finds the smallest missing prerequisite and schedules deterministic review', () => {
    expect(smallestIncompletePrerequisite('sliding-window', new Set())).toBe('input-output');
    expect(smallestIncompletePrerequisite('sliding-window', new Set(ALGORITHM_KNOWLEDGE_GRAPH.nodes.slice(0, 8).map((node) => node.id)))).toBe('two-pointers');
    expect(nextDelayedReview('2026-08-12T00:00:00.000Z', 0)).toBe('2026-08-13T00:00:00.000Z');
    expect(nextDelayedReview('2026-08-12T00:00:00.000Z', 2)).toBe('2026-09-11T00:00:00.000Z');
  });
});

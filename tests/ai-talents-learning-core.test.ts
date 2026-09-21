import { describe, expect, it } from 'vitest';
import { EVIDENCE_EVENT_CONTRACT_VERSION, type EvidenceEvent } from '../contracts/evidence-event';
import { learningEventToEvidence } from '../packages/evidence/learning-event-adapter';
import { InMemoryEvidenceStore } from '../packages/evidence/evidence-store';
import { AdaptiveLearningLoop } from '../packages/learning-loop/adaptive-learning-loop';
import { LearnerModelUpdater } from '../packages/learner-model/learner-model-updater';
import { RAG_PILOT_SKILLS } from '../packages/skill-graph/rag-pilot';

const learnerId = 'learner-rag-pilot';
const baseTime = Date.parse('2026-09-22T00:00:00.000Z');

function evidence(
  id: string,
  skillId: string,
  evidenceType: EvidenceEvent['evidenceType'],
  score: number,
  offsetHours: number,
  independent = true,
): EvidenceEvent {
  return {
    contractVersion: EVIDENCE_EVENT_CONTRACT_VERSION,
    id,
    learnerId,
    skillId,
    domain: 'rag',
    activityType: evidenceType === 'concept_check' ? 'learn' : evidenceType === 'project_verification' ? 'project' : 'practice',
    evidenceType,
    score,
    passed: score >= 0.7,
    independent,
    provenance: { source: 'rag-pilot-test' },
    createdAt: new Date(baseTime + offsetHours * 60 * 60 * 1000).toISOString(),
  };
}

describe('AI Talents Learning OS P0/P1 core', () => {
  it('keeps the Evidence Store append-only and rejects duplicate IDs', () => {
    const store = new InMemoryEvidenceStore();
    const event = evidence('e1', 'rag.hybrid-retrieval', 'concept_check', 0.9, 0);
    store.append(event);
    expect(store.count({ learnerId, skillId: 'rag.hybrid-retrieval' })).toBe(1);
    expect(() => store.append(event)).toThrow(/already exists/);
  });

  it('adapts legacy LearningEvent into the EvidenceEvent contract', () => {
    const adapted = learningEventToEvidence(learnerId, {
      id: 'legacy-transfer',
      kind: 'lesson-transfer-passed',
      problemId: 'problem-1',
      attemptId: 'attempt-1',
      data: { skillIds: ['rag.hybrid-retrieval'], correct: true, assisted: false },
      createdAt: new Date(baseTime).toISOString(),
    });
    expect(adapted).toHaveLength(1);
    expect(adapted[0]).toMatchObject({
      domain: 'legacy',
      evidenceType: 'transfer_result',
      score: 1,
      independent: true,
      skillId: 'rag.hybrid-retrieval',
    });
  });

  it('projects deterministic learner state from evidence', () => {
    const updater = new LearnerModelUpdater();
    const events = [
      evidence('c1', 'rag.hybrid-retrieval', 'concept_check', 0.9, 0),
      evidence('i1', 'rag.hybrid-retrieval', 'test_result', 0.8, 1),
      evidence('t1', 'rag.hybrid-retrieval', 'transfer_result', 0.75, 2),
    ];
    const state = updater.project(learnerId, 'rag.hybrid-retrieval', events);
    expect(state.conceptScore).toBeCloseTo(0.9);
    expect(state.implementationScore).toBeCloseTo(0.8);
    expect(state.transferScore).toBeCloseTo(0.75);
    expect(state.independentSuccess).toBeCloseTo((0.9 + 0.8 + 0.75) / 3);
    expect(state.evidenceCount).toBe(3);
    expect(state.uncertainty).toBeLessThan(1);
  });

  it('runs one RAG adaptive loop end-to-end from prerequisites to project readiness', () => {
    const loop = new AdaptiveLearningLoop(RAG_PILOT_SKILLS);

    for (const prerequisite of ['rag.dense-retrieval', 'rag.bm25']) {
      loop.evidence.appendMany([
        evidence(`${prerequisite}-concept`, prerequisite, 'concept_check', 0.9, 0),
        evidence(`${prerequisite}-impl`, prerequisite, 'test_result', 0.9, 1),
      ]);
    }

    expect(loop.decide(learnerId, 'rag.hybrid-retrieval').actionType).toBe('teach');

    let step = loop.recordAndDecide(evidence('hybrid-concept', 'rag.hybrid-retrieval', 'concept_check', 0.92, 2));
    expect(step.decision.actionType).toBe('practice');

    step = loop.recordAndDecide(evidence('hybrid-impl', 'rag.hybrid-retrieval', 'test_result', 0.88, 3));
    expect(step.decision.actionType).toBe('transfer');

    step = loop.recordAndDecide(evidence('hybrid-transfer', 'rag.hybrid-retrieval', 'transfer_result', 0.86, 4));
    expect(step.decision.actionType).toBe('retest');

    step = loop.recordAndDecide(evidence('hybrid-retest', 'rag.hybrid-retrieval', 'delayed_retest', 0.9, 24 * 7));
    expect(step.decision.actionType).toBe('project');
    expect(step.state.mastery).toBeGreaterThan(0.85);
    expect(step.state.independentSuccess).toBeGreaterThan(0.8);
    expect(step.state.retentionScore).toBeCloseTo(0.9);
    expect(loop.evidence.count({ learnerId, skillId: 'rag.hybrid-retrieval' })).toBe(4);
  });
});

import { describe, expect, it } from 'vitest';
import { createLearnerTwin, projectLearnerTwin } from './learner-twin.js';

const day = 24 * 60 * 60 * 1_000;
const at = (offset: number) => new Date(Date.UTC(2026, 7, 1) + offset * day).toISOString();

describe('learner digital twin', () => {
  it('separates assisted, independent and transfer evidence with provenance', () => {
    const start = createLearnerTwin('learner-a', new Date(at(0)));
    const assisted = projectLearnerTwin(start, [{ kind: 'assisted-pass', skillIds: ['array'], evidenceRef: 'attempt:a', at: at(0), misconceptionId: 'off-by-one' }], new Date(at(0)));
    const independent = projectLearnerTwin(start, [{ kind: 'independent-pass', skillIds: ['array'], evidenceRef: 'attempt:b', at: at(0) }], new Date(at(0)));
    const transfer = projectLearnerTwin(start, [{ kind: 'transfer-pass', skillIds: ['array'], evidenceRef: 'attempt:c', at: at(0) }], new Date(at(0)));
    const a = assisted.skills.array;
    expect(a.assistanceRatio).toBeGreaterThan(0);
    expect(a.misconceptions['off-by-one'].evidenceRefs).toEqual(['attempt:a']);
    expect(independent.skills.array.probability).toBeGreaterThan(a.probability);
    expect(transfer.skills.array.probability).toBeGreaterThan(independent.skills.array.probability);
    expect(transfer.skills.array.transferPasses).toBe(1);
  });

  it('records failures and misconception evidence without losing explanation', () => {
    const result = projectLearnerTwin(createLearnerTwin('learner-a', new Date(at(0))), [{
      kind: 'failure', skillIds: ['binary-search'], evidenceRef: 'judge:1', at: at(0), misconceptionId: 'search-boundary',
    }], new Date(at(0)));
    expect(result.skills['binary-search']).toMatchObject({ failureCount: 1 });
    expect(result.skills['binary-search'].probability).toBeLessThan(0.25);
    expect(result.skills['binary-search'].evidenceRefs).toContain('judge:1');
    expect(result.lastChanges[0]).toMatchObject({ skillId: 'binary-search', evidenceRef: 'judge:1' });
  });

  it('decays current belief while preserving historical counts and evidence', () => {
    const learned = projectLearnerTwin(createLearnerTwin('learner-a', new Date(at(0))), [{
      kind: 'independent-pass', skillIds: ['graph'], evidenceRef: 'attempt:graph', at: at(0),
    }], new Date(at(0)));
    const decayed = projectLearnerTwin(learned, [], new Date(at(45)));
    expect(decayed.skills.graph.probability).toBeLessThan(learned.skills.graph.probability);
    expect(decayed.skills.graph.independentPasses).toBe(1);
    expect(decayed.skills.graph.evidenceRefs).toEqual(['attempt:graph']);
    expect(decayed.skills.graph.confidence).toBeLessThan(learned.skills.graph.confidence);
  });
});

import { describe, expect, it } from 'vitest';
import { projectMastery } from './probabilistic-mastery.js';

describe('projectMastery', () => {
  it('weights transfer passes above independent and assisted passes', () => {
    const assisted = projectMastery(0.25, [{ kind: 'assisted-pass', evidenceRef: 'attempt:a' }]);
    const independent = projectMastery(0.25, [{ kind: 'independent-pass', evidenceRef: 'attempt:i' }]);
    const transfer = projectMastery(0.25, [{ kind: 'transfer-pass', evidenceRef: 'attempt:t' }]);
    expect(transfer.probability).toBeGreaterThan(independent.probability);
    expect(independent.probability).toBeGreaterThan(assisted.probability);
    expect(assisted.needsTransfer).toBe(true);
    expect(transfer.needsTransfer).toBe(false);
  });

  it('reduces mastery after a failure and keeps probability separate from confidence', () => {
    const result = projectMastery(0.8, [{ kind: 'failure', evidenceRef: 'attempt:f' }]);
    expect(result.probability).toBeLessThan(0.8);
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.evidenceRefs).toEqual(['attempt:f']);
  });

  it('is reproducible, bounded, and increases confidence with effective evidence', () => {
    const one = projectMastery(0.25, [{ kind: 'independent-pass', evidenceRef: 'attempt:1' }]);
    const many = projectMastery(0.25, [
      { kind: 'independent-pass', evidenceRef: 'attempt:1' },
      { kind: 'failure', evidenceRef: 'attempt:2' },
      { kind: 'transfer-pass', evidenceRef: 'attempt:3' },
    ]);
    expect(many.confidence).toBeGreaterThan(one.confidence);
    expect(many.probability).toBeGreaterThanOrEqual(0.01);
    expect(many.probability).toBeLessThanOrEqual(0.99);
    expect(projectMastery(0.25, many.observations)).toEqual(many);
  });
});

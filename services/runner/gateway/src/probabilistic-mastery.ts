export type MasteryObservationKind = 'failure' | 'assisted-pass' | 'independent-pass' | 'transfer-pass';
export type MasteryObservation = { kind: MasteryObservationKind; evidenceRef: string };
export type MasteryProjection = {
  probability: number;
  confidence: number;
  effectiveEvidence: number;
  needsTransfer: boolean;
  evidenceRefs: string[];
  observations: MasteryObservation[];
};

const OBSERVATION = {
  failure: { likelihoodRatio: 0.42, weight: 0.75 },
  'assisted-pass': { likelihoodRatio: 1.18, weight: 0.35 },
  'independent-pass': { likelihoodRatio: 2.35, weight: 1 },
  'transfer-pass': { likelihoodRatio: 3.4, weight: 1.35 },
} as const;

function bounded(value: number): number {
  return Math.min(0.99, Math.max(0.01, value));
}

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

export function projectMastery(prior: number, observations: MasteryObservation[]): MasteryProjection {
  const safePrior = bounded(prior);
  let odds = safePrior / (1 - safePrior);
  let effectiveEvidence = 0;
  let lastAssistedIndex = -1;
  let lastTransferIndex = -1;
  observations.forEach((observation, index) => {
    const policy = OBSERVATION[observation.kind];
    odds *= policy.likelihoodRatio;
    effectiveEvidence += policy.weight;
    if (observation.kind === 'assisted-pass') lastAssistedIndex = index;
    if (observation.kind === 'transfer-pass') lastTransferIndex = index;
  });
  const probability = bounded(odds / (1 + odds));
  return {
    probability: rounded(probability),
    confidence: rounded(1 - Math.exp(-effectiveEvidence / 3)),
    effectiveEvidence: rounded(effectiveEvidence),
    needsTransfer: lastAssistedIndex >= 0 && lastTransferIndex < lastAssistedIndex,
    evidenceRefs: observations.map((observation) => observation.evidenceRef),
    observations: observations.map((observation) => ({ ...observation })),
  };
}

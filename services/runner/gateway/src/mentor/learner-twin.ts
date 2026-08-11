export type TwinObservationKind = 'failure' | 'assisted-pass' | 'independent-pass' | 'transfer-pass' | 'prediction-correct';
export type TwinObservation = {
  kind: TwinObservationKind;
  skillIds: string[];
  evidenceRef: string;
  at: string;
  misconceptionId?: string;
};
export type MisconceptionBelief = { id: string; count: number; confidence: number; lastSeenAt: string; evidenceRefs: string[] };
export type TwinSkill = {
  skillId: string;
  alpha: number;
  beta: number;
  probability: number;
  confidence: number;
  halfLifeDays: number;
  assistedPasses: number;
  independentPasses: number;
  transferPasses: number;
  failureCount: number;
  assistanceRatio: number;
  lastPracticedAt: string | null;
  evidenceRefs: string[];
  misconceptions: Record<string, MisconceptionBelief>;
};
export type TwinChange = { skillId: string; prior: number; posterior: number; evidenceRef: string; kind: TwinObservationKind };
export type LearnerTwin = { version: 1; learnerId: string; updatedAt: string; skills: Record<string, TwinSkill>; lastChanges: TwinChange[] };

const DAY_MS = 24 * 60 * 60 * 1_000;
const BASELINE = 0.25;
const round = (value: number) => Math.round(value * 1_000) / 1_000;

function newSkill(skillId: string): TwinSkill {
  return {
    skillId, alpha: 1, beta: 3, probability: BASELINE, confidence: 0, halfLifeDays: 14,
    assistedPasses: 0, independentPasses: 0, transferPasses: 0, failureCount: 0,
    assistanceRatio: 0, lastPracticedAt: null, evidenceRefs: [], misconceptions: {},
  };
}

function cloneSkill(skill: TwinSkill): TwinSkill {
  return {
    ...skill,
    evidenceRefs: [...skill.evidenceRefs],
    misconceptions: Object.fromEntries(Object.entries(skill.misconceptions).map(([id, value]) => [id, { ...value, evidenceRefs: [...value.evidenceRefs] }])),
  };
}

function applyDecay(skill: TwinSkill, now: Date): TwinSkill {
  if (!skill.lastPracticedAt) return { ...skill, probability: BASELINE, confidence: 0 };
  const days = Math.max(0, (now.getTime() - Date.parse(skill.lastPracticedAt)) / DAY_MS);
  const retention = 2 ** (-days / Math.max(1, skill.halfLifeDays));
  const learned = skill.alpha / (skill.alpha + skill.beta);
  const evidenceWeight = Math.max(0, skill.alpha + skill.beta - 4);
  return {
    ...skill,
    probability: round(BASELINE + (learned - BASELINE) * retention),
    confidence: round((1 - Math.exp(-evidenceWeight / 3)) * retention),
  };
}

export function createLearnerTwin(learnerId: string, now = new Date()): LearnerTwin {
  return { version: 1, learnerId, updatedAt: now.toISOString(), skills: {}, lastChanges: [] };
}

export function projectLearnerTwin(previous: LearnerTwin, observations: TwinObservation[], now = new Date()): LearnerTwin {
  const skills = Object.fromEntries(Object.entries(previous.skills).map(([id, skill]) => [id, cloneSkill(skill)]));
  const changes: TwinChange[] = [];
  for (const observation of observations) {
    if (!Number.isFinite(Date.parse(observation.at)) || !observation.evidenceRef.trim()) continue;
    for (const skillId of [...new Set(observation.skillIds.filter((id) => id.trim()))]) {
      let skill = skills[skillId] ?? newSkill(skillId);
      const prior = applyDecay(skill, new Date(observation.at)).probability;
      if (observation.kind === 'failure') { skill.beta += 1.4; skill.failureCount += 1; skill.halfLifeDays = Math.max(3, skill.halfLifeDays * 0.92); }
      if (observation.kind === 'assisted-pass') { skill.alpha += 0.35; skill.assistedPasses += 1; }
      if (observation.kind === 'independent-pass') { skill.alpha += 1.5; skill.independentPasses += 1; skill.halfLifeDays += 3; }
      if (observation.kind === 'transfer-pass') { skill.alpha += 2.1; skill.transferPasses += 1; skill.halfLifeDays *= 1.4; }
      if (observation.kind === 'prediction-correct') skill.alpha += 0.2;
      if (observation.misconceptionId) {
        const existing = skill.misconceptions[observation.misconceptionId] ?? {
          id: observation.misconceptionId, count: 0, confidence: 0, lastSeenAt: observation.at, evidenceRefs: [],
        };
        const count = existing.count + 1;
        skill.misconceptions[observation.misconceptionId] = {
          ...existing, count, confidence: round(1 - Math.exp(-count / 2)), lastSeenAt: observation.at,
          evidenceRefs: [...new Set([...existing.evidenceRefs, observation.evidenceRef])].slice(-20),
        };
      }
      const successes = skill.assistedPasses + skill.independentPasses + skill.transferPasses;
      skill.assistanceRatio = round(successes ? skill.assistedPasses / successes : 0);
      skill.lastPracticedAt = observation.at;
      skill.evidenceRefs = [...new Set([...skill.evidenceRefs, observation.evidenceRef])].slice(-100);
      skill = applyDecay(skill, new Date(observation.at));
      skills[skillId] = skill;
      changes.push({ skillId, prior: round(prior), posterior: skill.probability, evidenceRef: observation.evidenceRef, kind: observation.kind });
    }
  }
  for (const [skillId, skill] of Object.entries(skills)) skills[skillId] = applyDecay(skill, now);
  return { version: 1, learnerId: previous.learnerId, updatedAt: now.toISOString(), skills, lastChanges: changes.slice(-50) };
}

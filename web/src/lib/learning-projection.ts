import { parsePedagogicalEvent, type PedagogicalEvent } from './pedagogical-events';

export type PedagogicalPhase = 'understanding' | 'modeling' | 'implementation' | 'debugging' | 'validation';
export type PhaseReplayNode = { phase: PedagogicalPhase; eventIds: string[]; evidenceRefs: string[] };
export type LearnerSkillProjection = { mastery: number; misconceptionRecurrence: number; independence: number; hintDependence: number; transfer: number; forgetting: number };
export type Contribution = { skillId: string; dimension: keyof LearnerSkillProjection; delta: number; rule: string; eventIds: string[]; evidenceRefs: string[]; at: string };
export type TaskSuccess = { eventId: string; assisted: boolean; evidenceRefs: string[] };
export type LearnerProjection = { phaseReplay: PhaseReplayNode[]; skills: Record<string, LearnerSkillProjection>; contributionLedger: Contribution[]; taskSuccesses: TaskSuccess[]; ignoredEventIds: string[] };

const EMPTY_SKILL: LearnerSkillProjection = { mastery: 0, misconceptionRecurrence: 0, independence: 0, hintDependence: 0, transfer: 0, forgetting: 0 };
const FAILURES = new Set(['failed', 'wrong-answer', 'compile-error', 'runtime-error', 'timeout', 'unavailable']);

function rounded(value: number): number { return Math.round(value * 1_000) / 1_000; }
function unknownId(value: unknown): string {
  return value && typeof value === 'object' && !Array.isArray(value) && typeof (value as { id?: unknown }).id === 'string' ? (value as { id: string }).id : 'unknown';
}
function eventSkills(event: PedagogicalEvent): string[] { return event.skillIds ?? []; }
function outcome(event: PedagogicalEvent): string | undefined { return typeof event.data.outcome === 'string' ? event.data.outcome : undefined; }

export function projectPedagogicalEvents(input: readonly unknown[]): LearnerProjection {
  const ignoredEventIds: string[] = [];
  const events: PedagogicalEvent[] = [];
  for (const item of input) {
    try { events.push(parsePedagogicalEvent(item)); } catch { ignoredEventIds.push(unknownId(item)); }
  }
  events.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id));

  const skills = new Map<string, LearnerSkillProjection>();
  const contributionLedger: Contribution[] = [];
  const phaseReplay: PhaseReplayNode[] = [];
  const taskSuccesses: TaskSuccess[] = [];
  const assistedAttempts = new Set<string>();
  const failures = new Map<string, PedagogicalEvent>();
  const ensureSkill = (skillId: string) => {
    const current = skills.get(skillId);
    if (current) return current;
    const initial = { ...EMPTY_SKILL };
    skills.set(skillId, initial);
    return initial;
  };
  const addPhase = (phase: PedagogicalPhase, nodes: PedagogicalEvent[]) => phaseReplay.push({ phase, eventIds: nodes.map((event) => event.id), evidenceRefs: nodes.flatMap((event) => event.evidenceRefs) });
  const contribute = (event: PedagogicalEvent, dimension: keyof LearnerSkillProjection, requestedDelta: number, rule: string) => {
    for (const skillId of eventSkills(event)) {
      const state = ensureSkill(skillId);
      const next = rounded(Math.max(0, Math.min(1, state[dimension] + requestedDelta)));
      const delta = rounded(next - state[dimension]);
      if (delta === 0) continue;
      state[dimension] = next;
      contributionLedger.push({ skillId, dimension, delta, rule, eventIds: [event.id], evidenceRefs: [...event.evidenceRefs], at: event.createdAt });
    }
  };

  for (const event of events) {
    for (const skillId of eventSkills(event)) ensureSkill(skillId);
    const key = event.attemptId ?? `${event.problemId ?? 'lesson'}:${event.id}`;
    const currentOutcome = outcome(event);
    if (event.kind === 'problem-opened' || event.kind === 'lesson-opened') addPhase('understanding', [event]);
    else if (event.kind === 'prediction-submitted' || event.kind === 'plan-recorded') addPhase('modeling', [event]);
    else if (event.kind === 'meaningful-edit-recorded' || event.kind === 'test-recorded') {
      const failed = failures.get(key);
      if (failed) { addPhase('debugging', [failed, event]); failures.delete(key); }
      else addPhase('implementation', [event]);
    } else if (event.kind === 'run-recorded') {
      addPhase('implementation', [event]);
      if (currentOutcome && FAILURES.has(currentOutcome)) failures.set(key, event);
    } else if (event.kind === 'submission-recorded' || event.kind === 'transfer-recorded' || event.kind === 'review-recorded') addPhase('validation', [event]);

    if (event.kind === 'hint-viewed' || event.kind === 'reference-viewed') {
      if (event.attemptId) assistedAttempts.add(event.attemptId);
      contribute(event, 'hintDependence', 0.1, event.kind === 'hint-viewed' ? 'hint-viewed' : 'reference-viewed');
    }
    if (event.kind === 'diagnosis-recorded') contribute(event, 'misconceptionRecurrence', 1, 'diagnosis-recorded');
    if (event.kind === 'submission-recorded' && currentOutcome === 'passed') {
      const assisted = Boolean(event.attemptId && assistedAttempts.has(event.attemptId));
      taskSuccesses.push({ eventId: event.id, assisted, evidenceRefs: [...event.evidenceRefs] });
    }
    if (event.kind === 'transfer-recorded' && currentOutcome === 'passed' && event.data.reviewed === true && !assistedAttempts.has(key)) {
      contribute(event, 'mastery', 0.3, 'reviewed-unassisted-transfer-pass');
      contribute(event, 'independence', 0.2, 'reviewed-unassisted-transfer-pass');
      contribute(event, 'transfer', 0.4, 'reviewed-unassisted-transfer-pass');
    }
    if (event.kind === 'review-recorded' && currentOutcome === 'passed' && event.data.reviewed === true && !assistedAttempts.has(key)) {
      contribute(event, 'mastery', 0.1, 'independent-delayed-review-pass');
      contribute(event, 'independence', 0.1, 'independent-delayed-review-pass');
      contribute(event, 'forgetting', -0.1, 'independent-delayed-review-pass');
    }
    if (event.kind === 'review-recorded' && currentOutcome && FAILURES.has(currentOutcome)) {
      contribute(event, 'mastery', -0.15, 'delayed-review-failure');
      contribute(event, 'forgetting', 0.2, 'delayed-review-failure');
    }
  }

  return { phaseReplay, skills: Object.fromEntries(skills), contributionLedger, taskSuccesses, ignoredEventIds };
}

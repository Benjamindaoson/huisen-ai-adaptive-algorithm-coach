import type { MentorToolDefinition } from './deepseek-provider.js';

export type MentorToolName = 'inspect_syntax' | 'search_evidence' | 'generate_counterexample' | 'verify_hypothesis' | 'update_twin' | 'ask_learner' | 'finish';

export const MENTOR_TOOL_DEFINITIONS: MentorToolDefinition[] = [
  tool('inspect_syntax', 'Parse source and inspect structural code evidence.', {
    focus: stringProperty('Specific code concern to inspect'),
  }),
  tool('search_evidence', 'Search the full trusted learning corpus.', {
    query: stringProperty('Search query grounded in the current evidence'),
    limit: { type: 'integer', minimum: 1, maximum: 10 },
  }),
  tool('generate_counterexample', 'Create bounded candidate inputs from public input shape.', {
    strategy: { type: 'string', enum: ['boundary', 'ordering', 'duplicates', 'smallest'] },
  }),
  tool('verify_hypothesis', 'Execute a candidate input against trusted expectation when available.', {
    hypothesisId: stringProperty('Existing hypothesis identifier'),
    candidateId: stringProperty('Existing candidate identifier'),
  }),
  tool('update_twin', 'Project one evidence-backed learner observation.', {
    kind: { type: 'string', enum: ['failure', 'assisted-pass', 'independent-pass', 'transfer-pass', 'prediction-correct'] },
    skillIds: { type: 'array', items: { type: 'string' } },
    misconceptionId: stringProperty('Misconception identifier or empty string'),
    evidenceRef: stringProperty('Stable evidence reference'),
  }),
  tool('ask_learner', 'Ask one focused prediction question before revealing an intervention.', {
    question: stringProperty('One focused learner prediction question'),
    expectedConcept: stringProperty('Short concept used to evaluate the response'),
    evidenceRefs: { type: 'array', items: { type: 'string' } },
  }),
  tool('finish', 'Stop the current Mentor turn with an explicit learner action.', {
    summary: stringProperty('Evidence-grounded turn summary'),
    nextAction: stringProperty('One concrete next learner action'),
    status: { type: 'string', enum: ['awaiting-edit', 'verifying', 'transfer', 'complete'] },
  }),
];

function stringProperty(description: string) { return { type: 'string', description }; }
function tool(name: MentorToolName, description: string, properties: Record<string, unknown>): MentorToolDefinition {
  return { type: 'function', function: { name, description, parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } } };
}

function text(value: unknown, label: string, limit: number, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > limit) throw new Error(`Invalid ${label}`);
  return value.trim();
}
function stringArray(value: unknown, label: string, limit = 12): string[] {
  if (!Array.isArray(value) || value.length > limit || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 300)) throw new Error(`Invalid ${label}`);
  return [...new Set(value.map((item) => item.trim()))];
}

export function validateMentorToolCall(name: string, value: Record<string, unknown>): { name: MentorToolName; arguments: Record<string, unknown> } {
  const keys = Object.keys(value);
  const only = (...allowed: string[]) => { if (keys.some((key) => !allowed.includes(key))) throw new Error(`Invalid ${name} arguments`); };
  if (name === 'inspect_syntax') { only('focus'); return { name, arguments: { focus: text(value.focus, 'syntax focus', 120) } }; }
  if (name === 'search_evidence') {
    only('query', 'limit');
    if (!Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 10) throw new Error('Invalid search limit');
    return { name, arguments: { query: text(value.query, 'search query', 300), limit: value.limit as number } };
  }
  if (name === 'generate_counterexample') {
    only('strategy'); const strategy = text(value.strategy, 'counterexample strategy', 30);
    if (!['boundary', 'ordering', 'duplicates', 'smallest'].includes(strategy)) throw new Error('Invalid counterexample strategy');
    return { name, arguments: { strategy } };
  }
  if (name === 'verify_hypothesis') { only('hypothesisId', 'candidateId'); return { name, arguments: { hypothesisId: text(value.hypothesisId, 'hypothesis id', 200), candidateId: text(value.candidateId, 'candidate id', 200) } }; }
  if (name === 'update_twin') {
    only('kind', 'skillIds', 'misconceptionId', 'evidenceRef'); const kind = text(value.kind, 'twin observation kind', 40);
    if (!['failure', 'assisted-pass', 'independent-pass', 'transfer-pass', 'prediction-correct'].includes(kind)) throw new Error('Invalid twin observation kind');
    return { name, arguments: { kind, skillIds: stringArray(value.skillIds, 'skill ids', 8), misconceptionId: text(value.misconceptionId, 'misconception id', 120, true), evidenceRef: text(value.evidenceRef, 'evidence ref', 300) } };
  }
  if (name === 'ask_learner') { only('question', 'expectedConcept', 'evidenceRefs'); return { name, arguments: { question: text(value.question, 'learner question', 500), expectedConcept: text(value.expectedConcept, 'expected concept', 120), evidenceRefs: stringArray(value.evidenceRefs, 'question evidence', 8) } }; }
  if (name === 'finish') {
    only('summary', 'nextAction', 'status'); const status = text(value.status, 'finish status', 40);
    if (!['awaiting-edit', 'verifying', 'transfer', 'complete'].includes(status)) throw new Error('Invalid finish status');
    return { name, arguments: { summary: text(value.summary, 'finish summary', 1_000), nextAction: text(value.nextAction, 'next action', 500), status } };
  }
  throw new Error(`Unknown Mentor tool: ${name}`);
}

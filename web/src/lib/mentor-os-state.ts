export type MentorOSCheckpoint = { sequence: number; nextAction: string; stopReason?: string };
export type MentorOSBackupState = {
  version: 1;
  active?: { runId: string; learnerId: string; cursor: number; checkpoint: MentorOSCheckpoint; routeKey: string; scopeVersion?: 2 };
  approvals: Array<{ id: string; decision: 'accept' | 'reject'; decidedAt: string }>;
  experiments: Array<{ id: string; arm: string }>;
  outcomeLinks: Array<{ runId: string; attemptId: string }>;
};

export const emptyMentorOSState = (): MentorOSBackupState => ({ version: 1, approvals: [], experiments: [], outcomeLinks: [] });

export function activeMentorOSForRoute(state: MentorOSBackupState, learnerId: string, routeKey: string): MentorOSBackupState['active'] | undefined {
  const active = state.active;
  return active?.scopeVersion === 2 && active.learnerId === learnerId && active.routeKey === routeKey ? active : undefined;
}

export function parseMentorOSState(value: unknown): MentorOSBackupState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Mentor OS backup');
  const item = value as MentorOSBackupState;
  if (item.version !== 1 || !Array.isArray(item.approvals) || !Array.isArray(item.experiments) || !Array.isArray(item.outcomeLinks)) throw new Error('Invalid Mentor OS backup');
  if (item.active && (typeof item.active.runId !== 'string' || typeof item.active.learnerId !== 'string' || !Number.isInteger(item.active.cursor) || typeof item.active.routeKey !== 'string' || (item.active.scopeVersion !== undefined && item.active.scopeVersion !== 2) || !item.active.checkpoint || !Number.isInteger(item.active.checkpoint.sequence))) throw new Error('Invalid Mentor OS checkpoint');
  return structuredClone(item);
}

export function loadMentorOSState(storage: Storage): MentorOSBackupState {
  try { const raw = storage.getItem('od-mentor-os:v1'); return raw ? parseMentorOSState(JSON.parse(raw)) : emptyMentorOSState(); }
  catch { return emptyMentorOSState(); }
}

export function saveMentorOSState(storage: Storage, state: MentorOSBackupState): void {
  storage.setItem('od-mentor-os:v1', JSON.stringify(parseMentorOSState(state)));
}

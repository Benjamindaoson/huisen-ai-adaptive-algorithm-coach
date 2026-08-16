import { parseExamSession, type ExamSession } from './exam';
import type { LearningEvent } from './learner-memory';
import type { LearningStateKind, PlatformBootstrap } from './platform-client';
import { emptyPractice, parsePracticeState, type CodeDraft, type PracticeState } from './practice';
import { emptyProgress, parseProgress, type ProgressState } from './progress';

type AuthoritySnapshot = {
  progress: ProgressState;
  practice: PracticeState;
  exam: ExamSession | null;
  versions: Partial<Record<LearningStateKind, number>>;
};

export function mergeAppendOnlyLearningEvents(local: LearningEvent[], remote: LearningEvent[], learnerId: string): LearningEvent[] {
  const events = new Map<string, LearningEvent>();
  for (const event of local) events.set(event.id, { ...event, learnerId });
  for (const event of remote) events.set(event.id, { ...event, learnerId });
  return [...events.values()].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id));
}

function newerDraft(local: CodeDraft | undefined, remote: CodeDraft | undefined): CodeDraft | undefined {
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(local.updatedAt) > Date.parse(remote.updatedAt) ? local : remote;
}

function mergeOfflineDrafts(local: PracticeState, remote: PracticeState): PracticeState {
  const keys = new Set([...Object.keys(remote.drafts), ...Object.keys(local.drafts)]);
  const drafts: Record<string, CodeDraft> = {};
  for (const key of keys) {
    const draft = newerDraft(local.drafts[key], remote.drafts[key]);
    if (draft) drafts[key] = draft;
  }
  return { ...remote, drafts };
}

export function adoptAuthoritativeLearning(localPractice: PracticeState, bootstrap: Pick<PlatformBootstrap, 'states'>): AuthoritySnapshot {
  let progress = emptyProgress();
  let practice = emptyPractice();
  let exam: ExamSession | null = null;
  const versions: Partial<Record<LearningStateKind, number>> = {};
  for (const state of bootstrap.states) {
    versions[state.kind] = state.version;
    if (state.kind === 'progress') progress = parseProgress(state.payload);
    if (state.kind === 'practice') practice = parsePracticeState(state.payload);
    if (state.kind === 'exam') exam = parseExamSession(state.payload);
  }
  return { progress, practice: mergeOfflineDrafts(localPractice, practice), exam, versions };
}

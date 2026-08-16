import { appendLearningEvent, emptyLearnerMemory, parseLearnerMemory, type LearnerMemory } from './learner-memory';
import { parsePracticeState, recordAttempt, type PracticeState } from './practice';
import { importProgress, parseProgress, type ProgressState } from './progress';
import { emptyPedagogicalMemory, parsePedagogicalMemory, type PedagogicalMemory } from './pedagogical-memory';
import { parseQualityReviewState, type QualityReviewState } from './quality-review';
import { emptyMentorOSState, parseMentorOSState, type MentorOSBackupState } from './mentor-os-state';

type LearningBackupV2 = {
  version: 2;
  exportedAt: string;
  progress: ProgressState;
  practice: PracticeState;
};

type LearningBackupV3 = {
  version: 3;
  exportedAt: string;
  progress: ProgressState;
  practice: PracticeState;
  memory: LearnerMemory;
};

type LearningBackupV4 = Omit<LearningBackupV3, 'version'> & {
  version: 4;
  pedagogicalMemory: PedagogicalMemory;
  qualityReviews: QualityReviewState;
};

type LearningBackupV5 = Omit<LearningBackupV4, 'version'> & {
  version: 5;
  mentorOS: MentorOSBackupState;
};

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseBackup(value: unknown): LearningBackupV2 | LearningBackupV3 | LearningBackupV4 | LearningBackupV5 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup format');
  const candidate = value as { version?: unknown; exportedAt?: unknown; progress?: unknown; practice?: unknown; memory?: unknown; pedagogicalMemory?: unknown; qualityReviews?: unknown; mentorOS?: unknown };
  if (candidate.version !== 2 && candidate.version !== 3 && candidate.version !== 4 && candidate.version !== 5) throw new Error('Unsupported backup version');
  if (!isTimestamp(candidate.exportedAt)) throw new Error('Invalid backup timestamp');

  // Parse both sections before any caller-visible state is changed.
  const progress = parseProgress(candidate.progress);
  const practice = parsePracticeState(candidate.practice);
  if (candidate.version === 5) {
    return { version: 5, exportedAt: candidate.exportedAt, progress, practice, memory: parseLearnerMemory(candidate.memory), pedagogicalMemory: parsePedagogicalMemory(candidate.pedagogicalMemory), qualityReviews: parseQualityReviewState(candidate.qualityReviews), mentorOS: parseMentorOSState(candidate.mentorOS) };
  }
  if (candidate.version === 4) {
    return { version: 4, exportedAt: candidate.exportedAt, progress, practice, memory: parseLearnerMemory(candidate.memory), pedagogicalMemory: parsePedagogicalMemory(candidate.pedagogicalMemory), qualityReviews: parseQualityReviewState(candidate.qualityReviews) };
  }
  if (candidate.version === 3) {
    return { version: 3, exportedAt: candidate.exportedAt, progress, practice, memory: parseLearnerMemory(candidate.memory) };
  }
  return { version: 2, exportedAt: candidate.exportedAt, progress, practice };
}

function mergePractice(current: PracticeState, incoming: PracticeState): PracticeState {
  const drafts = { ...current.drafts };
  for (const [key, imported] of Object.entries(incoming.drafts)) {
    const local = drafts[key];
    if (!local || Date.parse(imported.updatedAt) > Date.parse(local.updatedAt)) drafts[key] = imported;
  }

  const attemptsById = new Map(current.attempts.map((attempt) => [attempt.id, attempt]));
  for (const attempt of incoming.attempts) attemptsById.set(attempt.id, attempt);
  const attempts = [...attemptsById.values()].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  return attempts.reduce(recordAttempt, { version: 1, drafts, attempts: [] });
}

function mergeMemory(current: LearnerMemory, incoming: LearnerMemory): LearnerMemory {
  if (current.profile.learnerId !== incoming.profile.learnerId) return incoming;
  let merged: LearnerMemory = {
    version: 1,
    profile: Date.parse(incoming.profile.updatedAt) > Date.parse(current.profile.updatedAt) ? incoming.profile : current.profile,
    events: current.events,
  };
  for (const event of incoming.events) merged = appendLearningEvent(merged, event);
  return merged;
}

export function exportLearningBackup(
  progress: ProgressState,
  practice: PracticeState,
  memory: LearnerMemory = emptyLearnerMemory(),
  now = new Date(),
  pedagogicalMemory: PedagogicalMemory = emptyPedagogicalMemory(),
  qualityReviews: QualityReviewState = { version: 1, teacherReviews: [] },
  mentorOS: MentorOSBackupState = emptyMentorOSState(),
): string {
  const backup: LearningBackupV5 = { version: 5, exportedAt: now.toISOString(), progress, practice, memory, pedagogicalMemory, qualityReviews, mentorOS };
  return JSON.stringify(backup, null, 2);
}

export function importLearningBackup(
  json: string,
  mode: 'merge' | 'replace',
  currentProgress: ProgressState,
  currentPractice: PracticeState,
  currentMemory: LearnerMemory = emptyLearnerMemory(),
  currentPedagogicalMemory: PedagogicalMemory = emptyPedagogicalMemory(),
  currentQualityReviews: QualityReviewState = { version: 1, teacherReviews: [] },
  currentMentorOS: MentorOSBackupState = emptyMentorOSState(),
): { progress: ProgressState; practice: PracticeState; memory: LearnerMemory; pedagogicalMemory: PedagogicalMemory; qualityReviews: QualityReviewState; mentorOS: MentorOSBackupState } {
  const raw: unknown = JSON.parse(json);
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && (raw as { version?: unknown }).version === 1) {
    return { progress: importProgress(json, mode, currentProgress), practice: currentPractice, memory: currentMemory, pedagogicalMemory: currentPedagogicalMemory, qualityReviews: currentQualityReviews, mentorOS: currentMentorOS };
  }

  const incoming = parseBackup(raw);
  const incomingMemory = incoming.version === 3 || incoming.version === 4 || incoming.version === 5 ? incoming.memory : currentMemory;
  const incomingPedagogical = incoming.version === 4 || incoming.version === 5 ? incoming.pedagogicalMemory : currentPedagogicalMemory;
  const incomingReviews = incoming.version === 4 || incoming.version === 5 ? incoming.qualityReviews : currentQualityReviews;
  const incomingMentorOS = incoming.version === 5 ? incoming.mentorOS : currentMentorOS;
  if (mode === 'replace') return { progress: incoming.progress, practice: incoming.practice, memory: incomingMemory, pedagogicalMemory: incomingPedagogical, qualityReviews: incomingReviews, mentorOS: incomingMentorOS };
  const eventMap = new Map([...currentPedagogicalMemory.events, ...incomingPedagogical.events].map((event) => [event.id, event]));
  const reviewMap = new Map([...currentQualityReviews.teacherReviews, ...incomingReviews.teacherReviews].map((review) => [`${review.comparisonId}:${review.reviewerId}:${review.reviewedAt}`, review]));
  return {
    progress: importProgress(JSON.stringify(incoming.progress), 'merge', currentProgress),
    practice: mergePractice(currentPractice, incoming.practice),
    memory: mergeMemory(currentMemory, incomingMemory),
    pedagogicalMemory: { version: 1, events: [...eventMap.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-500) },
    qualityReviews: { version: 1, teacherReviews: [...reviewMap.values()] },
    mentorOS: incoming.version === 5 ? incomingMentorOS : currentMentorOS,
  };
}

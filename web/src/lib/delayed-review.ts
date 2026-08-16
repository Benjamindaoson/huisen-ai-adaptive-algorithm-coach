import { ALGORITHM_KNOWLEDGE_GRAPH } from './algorithm-knowledge-graph';
import type { PedagogicalEvent } from './pedagogical-events';
import type { CatalogProblem } from './catalog';

export type DelayedReviewItem = {
  skillId: string;
  sourceProblemId: string;
  transferEventId: string;
  intervalIndex: number;
  dueAt: string;
  due: boolean;
  status: 'scheduled' | 'failed';
  evidenceRefs: string[];
  confidenceDelta: number;
};
export type DelayedReviewAssignment = DelayedReviewItem & { reviewProblemId: string | null };

const DEFAULT_INTERVALS = [1, 7, 30] as const;

function addDays(timestamp: string, days: number): string {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function buildDelayedReviewQueue(events: readonly PedagogicalEvent[], now = new Date()): DelayedReviewItem[] {
  const ordered = [...events].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const latestTransferBySkill = new Map<string, PedagogicalEvent>();
  for (const event of ordered) {
    if (event.kind !== 'transfer-recorded' || event.data.outcome !== 'passed' || event.data.reviewed !== true) continue;
    for (const skillId of event.skillIds ?? []) latestTransferBySkill.set(skillId, event);
  }
  const items: DelayedReviewItem[] = [];
  for (const [skillId, transfer] of latestTransferBySkill) {
    const reviews = ordered.filter((event) => event.kind === 'review-recorded' && (event.skillIds ?? []).includes(skillId) && Date.parse(event.createdAt) > Date.parse(transfer.createdAt));
    const latest = reviews.at(-1);
    const passed = reviews.filter((event) => event.data.outcome === 'passed').length;
    const intervalIndex = Math.min(passed, DEFAULT_INTERVALS.length - 1);
    const node = ALGORITHM_KNOWLEDGE_GRAPH.nodes.find((item) => item.skillIds.includes(skillId as never) || item.transferSkillIds.includes(skillId as never));
    const intervals = node?.reviewIntervalsDays ?? DEFAULT_INTERVALS;
    const failed = latest?.data.outcome !== undefined && latest.data.outcome !== 'passed';
    const anchor = failed ? latest.createdAt : (latest?.createdAt ?? transfer.createdAt);
    const dueAt = failed ? latest.createdAt : addDays(anchor, intervals[intervalIndex]);
    items.push({
      skillId,
      sourceProblemId: transfer.problemId ?? '',
      transferEventId: transfer.id,
      intervalIndex,
      dueAt,
      due: failed || Date.parse(dueAt) <= now.getTime(),
      status: failed ? 'failed' : 'scheduled',
      evidenceRefs: [...transfer.evidenceRefs, ...(latest?.evidenceRefs ?? [])],
      confidenceDelta: failed ? -0.2 : Date.parse(dueAt) <= now.getTime() ? -0.1 : 0,
    });
  }
  return items.sort((left, right) => left.dueAt.localeCompare(right.dueAt) || left.skillId.localeCompare(right.skillId));
}

export function selectDelayedReviewProblem(item: DelayedReviewItem, problems: readonly CatalogProblem[]): CatalogProblem | null {
  return [...problems]
    .filter((problem) => problem.id !== item.sourceProblemId
      && problem.completeness === 'complete'
      && problem.quality?.practiceReady !== false
      && problem.languages.length > 0
      && problem.skills?.includes(item.skillId as never))
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

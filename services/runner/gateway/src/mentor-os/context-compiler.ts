import { validateMentorContextContribution, type MentorContextContribution } from './contracts.js';

export function compileMentorContext(raw: unknown[], budget: { maxItems: number; maxCharacters: number }) {
  if (!Number.isInteger(budget.maxItems) || budget.maxItems < 1 || budget.maxItems > 100 || !Number.isInteger(budget.maxCharacters) || budget.maxCharacters < 100 || budget.maxCharacters > 100_000) throw new Error('Invalid Mentor context budget');
  const contributions = raw.map(validateMentorContextContribution).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const items: MentorContextContribution[] = [];
  const omitted = new Map<string, number>();
  let used = 0;
  for (const item of contributions) {
    const size = JSON.stringify(item).length;
    if (items.length >= budget.maxItems || used + size > budget.maxCharacters) omitted.set(item.kind, (omitted.get(item.kind) ?? 0) + 1);
    else { items.push(item); used += size; }
  }
  return { version: 1 as const, items, usedCharacters: used, omitted: [...omitted].map(([kind, count]) => ({ kind, count })), evidenceRefs: [...new Set(items.flatMap((item) => item.evidenceRefs))] };
}

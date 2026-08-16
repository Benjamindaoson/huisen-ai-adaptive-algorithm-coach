import type { AppRoute } from './routes';

export type MentorRouteKind = 'today' | 'learn' | 'practice' | 'review' | 'exam-ai' | 'insights';
export type MentorContextContribution = { version: 1; id: string; kind: 'route'; priority: number; evidenceRefs: string[]; data: Record<string, string | number | boolean | string[]> };

export function mentorWorkspaceKey(route: { kind: MentorRouteKind; ref: string }): string {
  return `${route.kind}:${route.ref}`;
}

function kindFor(route: AppRoute): MentorRouteKind {
  if (route.name === 'today') return 'today';
  if (route.name === 'paths' || route.name === 'learn') return 'learn';
  if (route.name === 'review') return 'review';
  if (route.name === 'exam' || route.name === 'exam-session') return 'exam-ai';
  if (route.name === 'insights' || route.name === 'quality') return 'insights';
  return 'practice';
}

export function buildMentorRouteContext(route: AppRoute, summary: { ref: string; evidenceCount: number; nextAction: string }) {
  const kind = kindFor(route);
  const ref = summary.ref.replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 200) || 'screen';
  const routeRef = `${kind}:${ref}`;
  return {
    route: { kind, ref },
    contribution: {
      version: 1 as const, id: `route-${routeRef}`, kind: 'route' as const, priority: 80,
      evidenceRefs: [`route:${ref}`],
      data: { routeKind: kind, routeRef: ref, workspaceKey: routeRef, evidenceCount: Math.max(0, Math.trunc(summary.evidenceCount)), nextAction: summary.nextAction.slice(0, 300) },
    } satisfies MentorContextContribution,
  };
}

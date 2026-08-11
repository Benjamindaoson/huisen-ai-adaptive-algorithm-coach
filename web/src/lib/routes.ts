export type ModuleRouteName = 'today' | 'problems' | 'paths' | 'review' | 'exam' | 'insights';

export type AppRoute =
  | { name: ModuleRouteName }
  | { name: 'problem'; problemId: string }
  | { name: 'learn'; lessonId: string }
  | { name: 'exam-session' };

export function parseHashRoute(hash: string): AppRoute {
  const normalized = hash.replace(/^#/, '');
  if (!normalized || normalized === '/') return { name: 'today' };
  const problem = normalized.match(/^\/problem\/([^/]+)$/);
  if (problem) return { name: 'problem', problemId: decodeURIComponent(problem[1]) };
  const lesson = normalized.match(/^\/learn\/([^/]+)$/);
  if (lesson) return { name: 'learn', lessonId: decodeURIComponent(lesson[1]) };
  if (normalized === '/exam/session') return { name: 'exam-session' };
  const moduleName = normalized.match(/^\/(today|problems|paths|review|exam|insights)$/)?.[1] as ModuleRouteName | undefined;
  return moduleName ? { name: moduleName } : { name: 'today' };
}

export function hrefFor(route: AppRoute): string {
  if (route.name === 'problem') return `#/problem/${encodeURIComponent(route.problemId)}`;
  if (route.name === 'learn') return `#/learn/${encodeURIComponent(route.lessonId)}`;
  if (route.name === 'exam-session') return '#/exam/session';
  return `#/${route.name}`;
}

export function navigate(route: AppRoute): void {
  window.location.hash = hrefFor(route).slice(1);
}

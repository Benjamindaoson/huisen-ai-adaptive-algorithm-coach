export type ModuleRouteName = 'today' | 'problems' | 'paths' | 'practicum' | 'review' | 'exam' | 'insights' | 'quality' | 'trust';

export type AppRoute =
  | { name: ModuleRouteName }
  | { name: 'problem'; problemId: string }
  | { name: 'learn'; lessonId: string; returnProblemId?: string }
  | { name: 'training'; lessonId: string; returnLessonId?: string; recommendationId?: string }
  | { name: 'practicum-project'; projectId: string }
  | { name: 'exam-session' };

export function parseHashRoute(hash: string): AppRoute {
  const normalized = hash.replace(/^#/, '');
  if (!normalized || normalized === '/') return { name: 'today' };
  const problem = normalized.match(/^\/problem\/([^/]+)$/);
  if (problem) return { name: 'problem', problemId: decodeURIComponent(problem[1]) };
  const lesson = normalized.match(/^\/learn\/([^/?]+)(?:\?return=([^&]+))?$/);
  if (lesson) return { name: 'learn', lessonId: decodeURIComponent(lesson[1]), ...(lesson[2] ? { returnProblemId: decodeURIComponent(lesson[2]) } : {}) };
  const training = normalized.match(/^\/training\/([^/?]+)(?:\?(.+))?$/);
  if (training) {
    const parameters = new URLSearchParams(training[2] ?? '');
    const returnLessonId = parameters.get('returnLesson');
    const recommendationId = parameters.get('recommendation');
    return {
      name: 'training', lessonId: decodeURIComponent(training[1]),
      ...(returnLessonId ? { returnLessonId } : {}),
      ...(recommendationId ? { recommendationId } : {}),
    };
  }
  const practicumProject = normalized.match(/^\/practicum\/([^/]+)$/);
  if (practicumProject) return { name: 'practicum-project', projectId: decodeURIComponent(practicumProject[1]) };
  if (normalized === '/exam/session') return { name: 'exam-session' };
  const moduleName = normalized.match(/^\/(today|problems|paths|practicum|review|exam|insights|quality|trust)$/)?.[1] as ModuleRouteName | undefined;
  return moduleName ? { name: moduleName } : { name: 'today' };
}

export function hrefFor(route: AppRoute): string {
  if (route.name === 'problem') return `#/problem/${encodeURIComponent(route.problemId)}`;
  if (route.name === 'learn') return `#/learn/${encodeURIComponent(route.lessonId)}${route.returnProblemId ? `?return=${encodeURIComponent(route.returnProblemId)}` : ''}`;
  if (route.name === 'training') {
    const parameters = new URLSearchParams();
    if (route.returnLessonId) parameters.set('returnLesson', route.returnLessonId);
    if (route.recommendationId) parameters.set('recommendation', route.recommendationId);
    const query = parameters.toString();
    return `#/training/${encodeURIComponent(route.lessonId)}${query ? `?${query}` : ''}`;
  }
  if (route.name === 'practicum-project') return `#/practicum/${encodeURIComponent(route.projectId)}`;
  if (route.name === 'exam-session') return '#/exam/session';
  return `#/${route.name}`;
}

export function navigate(route: AppRoute): void {
  window.location.hash = hrefFor(route).slice(1);
}

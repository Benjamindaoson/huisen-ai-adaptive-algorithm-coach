import type { CatalogProblem } from './catalog';
import { FOUNDATION_LESSONS, type FoundationLesson } from './foundation-curriculum';
import type { LearningEvent } from './learner-memory';
import type { PracticeAttempt } from './practice';
import type { SkillId } from './skills';

export type LessonProgressState = 'locked' | 'available' | 'started' | 'checkpoint-passed' | 'completed';
export type LessonProgress = {
  lessonId: string;
  state: LessonProgressState;
  checkpointPassed: boolean;
  completed: boolean;
};

export function deriveLessonProgress(events: LearningEvent[]): Map<string, LessonProgress> {
  const completed = new Set(events.filter((event) => event.kind === 'lesson-completed').map((event) => event.data.lessonId).filter((id): id is string => Boolean(id)));
  const started = new Set(events.filter((event) => event.kind === 'lesson-started').map((event) => event.data.lessonId).filter((id): id is string => Boolean(id)));
  const checkpointPassed = new Set(events.filter((event) => event.kind === 'lesson-checkpoint-passed').map((event) => event.data.lessonId).filter((id): id is string => Boolean(id)));

  return new Map(FOUNDATION_LESSONS.map((lesson) => {
    const unlocked = lesson.prerequisites.every((id) => completed.has(id));
    const state: LessonProgressState = completed.has(lesson.id) ? 'completed'
      : checkpointPassed.has(lesson.id) ? 'checkpoint-passed'
        : started.has(lesson.id) ? 'started'
          : unlocked ? 'available' : 'locked';
    return [lesson.id, { lessonId: lesson.id, state, checkpointPassed: checkpointPassed.has(lesson.id), completed: completed.has(lesson.id) }];
  }));
}

export function nextFoundationLesson(progressOrEvents: Map<string, LessonProgress> | LearningEvent[]): FoundationLesson | null {
  const progress = progressOrEvents instanceof Map ? progressOrEvents : deriveLessonProgress(progressOrEvents);
  return FOUNDATION_LESSONS.find((lesson) => {
    const state = progress.get(lesson.id)?.state;
    return state === 'available' || state === 'started' || state === 'checkpoint-passed';
  }) ?? null;
}

export function findTransferProblem(lesson: FoundationLesson, problems: CatalogProblem[], isJudgeable: (problem: CatalogProblem) => boolean = () => true): CatalogProblem | null {
  return [...problems]
    .filter((problem) => problem.completeness === 'complete'
      && problem.languages.includes('python')
      && problem.quality?.practiceReady !== false
      && isJudgeable(problem)
      && problem.skills?.includes(lesson.transfer.skillId))
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

const SKILL_LESSON: Partial<Record<SkillId, string>> = {
  'io-parsing': 'input-output', string: 'arrays-strings', array: 'arrays-strings', hash: 'hash-lookup',
  sorting: 'complexity-intuition', 'binary-search': 'binary-search', 'stack-queue': 'queue-bfs', search: 'queue-bfs', simulation: 'functions-decomposition',
};

const SKILL_NAMES: Partial<Record<SkillId, string>> = {
  'io-parsing': '输入解析', string: '字符串索引', array: '数组与索引', hash: '哈希查找', sorting: '复杂度',
  'binary-search': '二分边界', 'stack-queue': '队列', search: '分层搜索', simulation: '状态模拟',
};

export function remediationLessonFor(
  problem: CatalogProblem,
  attempts: PracticeAttempt[],
  events: LearningEvent[],
): { lesson: FoundationLesson; reason: string } | null {
  const latestSubmission = [...attempts]
    .filter((attempt) => attempt.problemId === problem.id && attempt.mode === 'sample-submit')
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  if (!latestSubmission || ['passed', 'executed', 'unavailable'].includes(latestSubmission.outcome)) return null;
  const progress = deriveLessonProgress(events);
  const skill = problem.skills?.find((id) => {
    const lessonId = SKILL_LESSON[id];
    return lessonId && !progress.get(lessonId)?.completed;
  });
  if (!skill) return null;
  const target = FOUNDATION_LESSONS.find((item) => item.id === SKILL_LESSON[skill]);
  if (!target) return null;
  function firstIncompletePrerequisite(lesson: FoundationLesson): FoundationLesson {
    for (const prerequisiteId of lesson.prerequisites) {
      if (progress.get(prerequisiteId)?.completed) continue;
      const prerequisite = FOUNDATION_LESSONS.find((item) => item.id === prerequisiteId);
      if (prerequisite) return firstIncompletePrerequisite(prerequisite);
    }
    return lesson;
  }
  const lesson = firstIncompletePrerequisite(target);
  return {
    lesson,
    reason: `这道题明确标注了“${SKILL_NAMES[skill] ?? skill}”技能；通往“${target.title}”的学习链上，当前先补“${lesson.title}”，再回到这次提交验证。此建议是学习支持，不代表已确认你的具体错误原因。`,
  };
}

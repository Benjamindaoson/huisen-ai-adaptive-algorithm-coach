import type { TutorRouteDecision } from './contracts';

const ERROR_KEYWORDS = [
  'error', 'exception', 'traceback', 'modulenotfounderror', 'connection refused',
  'unauthorized', '报错', '失败',
] as const;

const CODE_KEYWORDS = [
  'main.py', '.py', '.ts', '.tsx', '.js', 'function', 'class', 'api', 'config',
  'defined', 'source file', '函数', '类', '启动', '接口', '配置文件',
] as const;

const FAQ_KEYWORDS = [
  'api key', 'apikey', 'how do i configure', '怎么配置', '多少钱', '课程价格',
] as const;

const LEARNING_KEYWORDS = [
  'next step', 'next steps', 'learning path', 'study path', 'roadmap',
  'what should i learn', 'learn before', '下一步', '学习路径', '先学', '怎么学',
] as const;

const AMBIGUOUS_QUERIES = new Set(['这个怎么弄？', '怎么弄', '不会', 'help', '?']);

export function routeTutorQuery(query: string): TutorRouteDecision {
  const normalized = query.trim();
  const lowered = normalized.toLocaleLowerCase('en-US');

  if (AMBIGUOUS_QUERIES.has(normalized) || AMBIGUOUS_QUERIES.has(lowered)) {
    return { route: 'clarify', confidence: 0.9, reason: 'query_too_ambiguous', needsClarification: true };
  }
  if (ERROR_KEYWORDS.some((keyword) => lowered.includes(keyword))) {
    return { route: 'error', confidence: 0.86, reason: 'matched_error_keywords', needsClarification: false };
  }
  if (FAQ_KEYWORDS.some((keyword) => lowered.includes(keyword))) {
    return { route: 'faq', confidence: 0.8, reason: 'matched_faq_keywords', needsClarification: false };
  }
  if (lowered.includes('function calling') || lowered.includes('tool calling')) {
    return { route: 'course', confidence: 0.74, reason: 'matched_llm_concept_keywords', needsClarification: false };
  }
  if (CODE_KEYWORDS.some((keyword) => lowered.includes(keyword)) || normalized.includes('_')) {
    return { route: 'code', confidence: 0.78, reason: 'matched_code_keywords', needsClarification: false };
  }
  if (LEARNING_KEYWORDS.some((keyword) => lowered.includes(keyword))) {
    return { route: 'learning_path', confidence: 0.76, reason: 'matched_learning_keywords', needsClarification: false };
  }
  return { route: 'course', confidence: 0.65, reason: 'default_course_route', needsClarification: false };
}

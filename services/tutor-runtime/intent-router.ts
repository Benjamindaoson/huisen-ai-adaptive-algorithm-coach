import type { TutorRoute } from '../../contracts/tutor-runtime';

export type TutorRouteDecision = Readonly<{
  route: TutorRoute;
  confidence: number;
  reason: string;
  needsClarification: boolean;
}>;

const ERROR = ['error','exception','traceback','modulenotfounderror','connection refused','unauthorized','报错','失败'];
const CODE = ['main.py','.py','function','class','api','config','defined','source file','函数','类','接口','配置文件'];
const FAQ = ['api key','apikey','dashscope','how do i configure','怎么配置','多少钱','课程价格'];
const LEARNING = ['next step','next steps','learning path','study path','roadmap','what should i learn','learn before','下一步','学习路径','先学','怎么学'];
const AMBIGUOUS = new Set(['这个怎么弄？','怎么弄','不会','help','?']);

export function routeTutorQuery(query: string): TutorRouteDecision {
  const raw=query.trim();
  const q=raw.toLowerCase();
  if (AMBIGUOUS.has(q) || AMBIGUOUS.has(raw)) return {route:'clarify',confidence:0.9,reason:'query_too_ambiguous',needsClarification:true};
  if (ERROR.some(x=>q.includes(x))) return {route:'error',confidence:0.86,reason:'matched_error_keywords',needsClarification:false};
  if (FAQ.some(x=>q.includes(x))) return {route:'faq',confidence:0.8,reason:'matched_faq_keywords',needsClarification:false};
  if (q.includes('function calling') || q.includes('tool calling')) return {route:'course',confidence:0.74,reason:'matched_llm_concept_keywords',needsClarification:false};
  if (CODE.some(x=>q.includes(x)) || raw.includes('_')) return {route:'code',confidence:0.78,reason:'matched_code_keywords',needsClarification:false};
  if (LEARNING.some(x=>q.includes(x))) return {route:'learning_path',confidence:0.76,reason:'matched_learning_keywords',needsClarification:false};
  return {route:'course',confidence:0.65,reason:'default_course_route',needsClarification:false};
}

import type { ModuleRouteName } from './routes';

export type LearnerModule = {
  name: Exclude<ModuleRouteName, 'quality'>;
  step: string;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
  glyph: 'spark' | 'learn' | 'code' | 'project' | 'review' | 'exam' | 'insights';
};

export const LEARNER_MODULES: LearnerModule[] = [
  { name: 'today', step: '01', label: '今日驾驶舱', shortLabel: '今日', eyebrow: 'LEARNING OS', description: '由学习证据实时编译的今日行动', glyph: 'spark' },
  { name: 'paths', step: '02', label: '学习中心', shortLabel: '学习', eyebrow: 'KNOWLEDGE PATH', description: '从零基础微课到真实题迁移', glyph: 'learn' },
  { name: 'problems', step: '03', label: '题库练习', shortLabel: '题库', eyebrow: 'ALGORITHM LAB', description: '道真实题目 · 可搜索 · 可运行', glyph: 'code' },
  { name: 'practicum', step: '04', label: '项目实训', shortLabel: '项目', eyebrow: 'REPOSITORY LAB', description: '在多文件任务中练需求、调试、测试与复盘', glyph: 'project' },
  { name: 'review', step: '05', label: '错因复练', shortLabel: '复练', eyebrow: 'REPAIR LOOP', description: '按错误原因和遗忘速度安排复测', glyph: 'review' },
  { name: 'exam', step: '06', label: '算法初试', shortLabel: '初试', eyebrow: 'ASSESSMENT', description: '无 AI 与 AI 协作双模式评估', glyph: 'exam' },
  { name: 'insights', step: '07', label: '能力模型', shortLabel: '能力', eyebrow: 'DIGITAL TWIN', description: '可追溯的技能、独立性与提示依赖', glyph: 'insights' },
];

export const PRIMARY_MOBILE_MODULES = LEARNER_MODULES.filter((item) => ['today', 'paths', 'problems', 'insights'].includes(item.name));
export const SECONDARY_MOBILE_MODULES = LEARNER_MODULES.filter((item) => ['practicum', 'review', 'exam'].includes(item.name));

export const MOBILE_PRIMARY_LABELS: Partial<Record<ModuleRouteName, string>> = {
  today: '今日', paths: '学习', problems: '练习', insights: '我的',
};

export function learnerModule(name: ModuleRouteName): LearnerModule | undefined {
  return LEARNER_MODULES.find((item) => item.name === name);
}

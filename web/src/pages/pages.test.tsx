import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CatalogProblem } from '../lib/catalog';
import { ExamPage } from './ExamPage';
import { InsightsPage } from './InsightsPage';
import { PathsPage } from './PathsPage';
import { ProblemsPage } from './ProblemsPage';
import { ReviewPage } from './ReviewPage';
import { TodayPage } from './TodayPage';
import { emptyLearnerMemory } from '../lib/learner-memory';
import type { AgentDecision } from '../lib/learning-orchestrator';
import { FOUNDATION_LESSONS } from '../lib/foundation-curriculum';
import { STARTER_ALGORITHM_LESSONS } from '../lib/starter-algorithm-curriculum';

const problem: CatalogProblem = {
  id: 'p1', title: '数组排序', excerpt: '给定数组', collection: 'A卷', score: 100,
  languages: ['python'], tags: ['数组'], completeness: 'complete', searchText: '数组排序 给定数组', sourcePaths: [], duplicateCount: 1,
};

it('keeps Today focused on a single recommended action', () => {
  const decision: AgentDecision = {
    version: 1, traceId: 'trace-test', role: 'learning-orchestrator', mode: 'adaptive', strategy: 'steady',
    summary: '根据真实证据安排下一步。', confidence: 0.72, generatedAt: '2026-08-11T00:00:00Z',
    tools: [{ name: 'get_learner_profile', summary: 'OD考试' }],
    evidence: [{ ref: 'attempts:3', kind: 'mastery', summary: '基于3次有效提交' }],
    actions: [{ type: 'practice', kind: 'weakness', problemId: 'p1', title: '数组排序', skillId: 'array', reason: '你最近在数组边界上失分', priority: 1, estimatedMinutes: 35 }],
  };
  const html = renderToStaticMarkup(<TodayPage
    plan={[{ problemId: 'p1', title: '数组排序', kind: 'weakness', skillId: 'array', reason: '你最近在数组边界上失分' }]}
    decision={decision} profile={emptyLearnerMemory().profile} onSaveProfile={() => undefined}
    events={[{ id: 'review-1', learnerId: 'learner-a', kind: 'mastery-check-failed', problemId: 'p0', data: { skillIds: ['array'], reason: '延迟复测未通过' }, createdAt: '2026-08-10T00:00:00Z' }]}
    evidenceCount={3} reviewCount={1} completedCount={2} onOpen={() => undefined}
  />);

  expect(html).toContain('今天先完成这一件事');
  expect(html).toContain('你最近在数组边界上失分');
  expect(html).toContain('预计 35 分钟');
  expect(html).toContain('完成后你将能够');
  expect(html).toContain('基于 3 条练习证据');
  expect(html).toContain('今日学习计划');
  expect(html).toContain('不是完成更多');
  expect(html).toContain('而是掌握得更深');
  expect(html).toContain('导师已根据你的学习记录安排下一步');
  expect(html).toContain('查看规划依据（规则计算）');
  expect(html).toContain('为什么安排这一步');
  expect(html).toContain('为什么是现在');
  expect(html).toContain('延迟复测未通过');
  expect(html).toContain('trace-test');
  expect(html).not.toContain('搜索全部题库');
  expect(html).not.toContain('六条学习路径');
});

it('gives every module a distinct page heading', () => {
  const pages = [
    renderToStaticMarkup(<ProblemsPage catalog={[problem]} progress={{ version: 1, problems: {} }} onOpen={() => undefined} />),
    renderToStaticMarkup(<PathsPage catalog={[problem]} progress={{ version: 1, problems: {} }} events={[]} onOpen={() => undefined} onLearn={() => undefined} />),
    renderToStaticMarkup(<ReviewPage cards={[]} onOpen={() => undefined} />),
    renderToStaticMarkup(<ExamPage exam={null} starting={false} onStart={() => undefined} onContinue={() => undefined} />),
    renderToStaticMarkup(<InsightsPage mastery={[]} learningEvents={[]} />),
  ];

  expect(pages[0]).toContain('题库练习');
  expect(pages[1]).toContain('学习中心');
  expect(pages[2]).toContain('错因复练');
  expect(pages[3]).toContain('算法初试');
  expect(pages[4]).toContain('能力模型');
  expect(pages[4]).toContain('不替代教师、学校、企业或专业机构的最终评价');
});

it('puts the next unlocked lesson ahead of random practice for a foundation learner', () => {
  const profile = { ...emptyLearnerMemory().profile, target: 'foundation' as const };
  const html = renderToStaticMarkup(<TodayPage
    plan={[{ problemId: 'p1', title: '数组排序', kind: 'baseline', skillId: 'array', reason: '建立基线' }]}
    profile={profile} foundationLesson={FOUNDATION_LESSONS[0]} onLearn={() => undefined}
    evidenceCount={0} reviewCount={0} completedCount={0} onOpen={() => undefined}
  />);
  expect(html).toContain('今天先建立一个代码直觉');
  expect(html).toContain('让程序听懂你的话');
  expect(html).not.toContain('开始练习');
});

it('turns a cold start into a visible ten-minute AI training mission instead of a raw problem recommendation', () => {
  const html = renderToStaticMarkup(<TodayPage
    plan={[{ problemId: 'p1', title: '数组排序', kind: 'baseline', skillId: 'array', reason: '建立基线' }]}
    starterLesson={STARTER_ALGORITHM_LESSONS[0]} onAcknowledgeMission={() => undefined} onLearn={() => undefined}
    evidenceCount={0} reviewCount={0} completedCount={0} onOpen={() => undefined}
  />);

  expect(html).toContain('AI 先带你建立第一个算法直觉');
  expect(html).toContain('AI 入门训练 · 约 10 分钟');
  expect(html).toContain('完成后你将能够');
  expect(html).toContain('为什么先学这个');
  expect(html).not.toContain('数组排序');
});

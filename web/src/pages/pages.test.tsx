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
    evidenceCount={3} reviewCount={1} completedCount={2} onOpen={() => undefined}
  />);

  expect(html).toContain('今天先完成这一件事');
  expect(html).toContain('你最近在数组边界上失分');
  expect(html).toContain('学习编排决策');
  expect(html).toContain('查看规划依据（规则计算）');
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
    renderToStaticMarkup(<InsightsPage mastery={[]} />),
  ];

  expect(pages[0]).toContain('题库');
  expect(pages[1]).toContain('学习中心');
  expect(pages[2]).toContain('错题本');
  expect(pages[3]).toContain('模拟考试');
  expect(pages[4]).toContain('能力报告');
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

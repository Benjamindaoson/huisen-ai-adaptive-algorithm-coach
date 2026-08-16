import {
  ALGORITHM_KNOWLEDGE_GRAPH,
  type CurriculumSegment,
} from '../lib/algorithm-knowledge-graph';
import { FOUNDATION_LESSONS } from '../lib/foundation-curriculum';
import { deriveLessonProgress } from '../lib/lesson-progress';
import type { LearningEvent } from '../lib/learner-memory';
import { STARTER_ALGORITHM_LESSONS } from '../lib/starter-algorithm-curriculum';

type Props = { events: LearningEvent[]; onLearn: (lessonId: string) => void };

const stateLabel = {
  locked: '完成前置小课后解锁', available: '可以开始', started: '继续学习',
  'checkpoint-passed': '预测已通过', completed: '已完成',
} as const;

const SEGMENTS: Array<{ id: CurriculumSegment; title: string; description: string }> = [
  { id: 'program-foundation', title: '让程序跑起来', description: '先看懂输入、变量、判断和循环，不假设你学过计算机。' },
  { id: 'problem-modeling', title: '把题意变成步骤', description: '把人话翻译成状态、数据和可以执行的小任务。' },
  { id: 'core-patterns', title: '建立高频算法直觉', description: '从哈希、双指针到搜索，理解动作为什么有效。' },
  { id: 'structures-search', title: '在结构中搜索', description: '继续进入递归、树、图、贪心和动态规划。' },
  { id: 'integrated-transfer', title: '陌生题综合迁移阶段', description: '不显示题型标签，在不同表面下独立选择和组合方法。' },
];

function entryTrainingLabel(entryLessonIds: string[]): string | null {
  const labels = entryLessonIds
    .map((id) => STARTER_ALGORITHM_LESSONS.find((lesson) => lesson.id === id)?.plainTitle)
    .filter((title): title is string => Boolean(title));
  return labels.length ? `短入口训练：${labels.join('、')}` : null;
}

export function FoundationMap({ events, onLearn }: Props) {
  const progress = deriveLessonProgress(events);
  const completed = [...progress.values()].filter((item) => item.completed).length;
  const transferVerified = [...progress.values()].filter((item) => item.transferVerified).length;
  const currentLessonId = [...progress.values()].find((item) => item.state === 'started' || item.state === 'checkpoint-passed')?.lessonId
    ?? [...progress.values()].find((item) => item.state === 'available')?.lessonId;
  return <section className="foundation-map bridge-map" aria-labelledby="foundation-map-title">
    <header className="foundation-map-hero">
      <div><span className="section-kicker">ZERO TO ALGORITHM</span><h2 id="foundation-map-title">算法过桥地图</h2><h3>零基础起步</h3>
        <p>不是一张按顺序打卡的课表。AI 会从你的真实动作判断入口，再用“听懂—看见—预测—动手—迁移”把知识变成能独立使用的能力。</p></div>
      <div className="foundation-progress"><strong>{completed} / 12 节完成</strong><span><i style={{ width: `${completed / 12 * 100}%` }} /></span><small>Python 起步 · 算法思维可迁移</small>{transferVerified > 0 && <b>{transferVerified} 项迁移验证</b>}</div>
    </header>
    <div className="foundation-promise"><span>唯一的学习标准</span><strong>不是帮你做出这道题，而是让你独立做出下一道题。</strong></div>
    <div className="chapter-list bridge-segment-list">{SEGMENTS.map((segment, segmentIndex) => {
      const nodes = ALGORITHM_KNOWLEDGE_GRAPH.nodes.filter((node) => node.segment === segment.id);
      return <section className="chapter-block bridge-segment" key={segment.id}>
        <header><span>{String(segmentIndex + 1).padStart(2, '0')}</span><div><h3>{segment.title}</h3><p>{segment.description}</p></div></header>
        <div className="lesson-track">{nodes.map((node, nodeIndex) => {
          if (node.availability === 'coming-soon' || !node.lessonId) {
            return <button type="button" key={node.id} className="lesson-node coming-soon" disabled aria-label={`${node.title}，后续开放`}>
              <span className="lesson-order">{String(nodeIndex + 1).padStart(2, '0')}</span>
              <span className="lesson-node-copy"><small>正在制作可信微课与迁移验证</small><strong>{node.title}</strong><em>{node.objective}</em></span>
              <span className="lesson-future">后续开放</span>
            </button>;
          }
          const lesson = FOUNDATION_LESSONS.find((item) => item.id === node.lessonId)!;
          const item = progress.get(lesson.id)!;
          const entryLabel = entryTrainingLabel(node.entryLessonIds);
          return <button type="button" key={node.id} className={`lesson-node ${item.state}${item.transferVerified ? ' transfer-verified' : ''}`} disabled={item.state === 'locked'} onClick={() => onLearn(lesson.id)} aria-label={`${lesson.title}，${stateLabel[item.state]}${item.transferVerified ? '，迁移已验证' : ''}`}>
            <span className="lesson-order">{String(lesson.order).padStart(2, '0')}</span>
            <span className="lesson-node-copy"><small>{lesson.plainTitle}</small><strong>{lesson.title}</strong><em>{node.microLessonMinutes} 分钟微课 · {stateLabel[item.state]}{item.transferVerified ? ' · 迁移已验证' : ''}</em>{lesson.id === currentLessonId && <b className="current-mission">当前任务</b>}{entryLabel && <b>{entryLabel}</b>}</span>
            <span className="lesson-state" aria-hidden="true">{item.transferVerified ? '✓✓' : item.completed ? '✓' : item.state === 'locked' ? '锁' : '→'}</span>
          </button>;
        })}</div>
      </section>;
    })}</div>
  </section>;
}

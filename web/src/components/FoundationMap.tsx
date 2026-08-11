import { FOUNDATION_LESSONS } from '../lib/foundation-curriculum';
import { deriveLessonProgress } from '../lib/lesson-progress';
import type { LearningEvent } from '../lib/learner-memory';

type Props = { events: LearningEvent[]; onLearn: (lessonId: string) => void };

const stateLabel = {
  locked: '完成前置小课后解锁', available: '可以开始', started: '继续学习',
  'checkpoint-passed': '预测已通过', completed: '已完成',
} as const;

export function FoundationMap({ events, onLearn }: Props) {
  const progress = deriveLessonProgress(events);
  const completed = [...progress.values()].filter((item) => item.completed).length;
  const chapters = [...new Set(FOUNDATION_LESSONS.map((lesson) => lesson.chapter))];
  return <section className="foundation-map" aria-labelledby="foundation-map-title">
    <header className="foundation-map-hero">
      <div><span className="section-kicker">ZERO TO ALGORITHM</span><h2 id="foundation-map-title">零基础起步</h2>
        <p>不背模板。先看懂程序怎样变化，再预测、补全，最后到真实题里独立验证。</p></div>
      <div className="foundation-progress"><strong>{completed} / 12 节完成</strong><span><i style={{ width: `${completed / 12 * 100}%` }} /></span><small>Python 起步 · 算法思维可迁移</small></div>
    </header>
    <div className="foundation-promise"><span>我们的目标</span><strong>不是帮你做出这道题，而是让你独立做出下一道题。</strong></div>
    <div className="chapter-list">{chapters.map((chapter) => <section className="chapter-block" key={chapter}>
      <header><span>{String(chapters.indexOf(chapter) + 1).padStart(2, '0')}</span><div><h3>{chapter}</h3><p>{chapter === '先会让程序工作' ? '先建立代码直觉，不假设你学过计算机。' : chapter === '学会拆解问题' ? '把题目翻译成状态、步骤和成本。' : '掌握高频模式，并解释为什么有效。'}</p></div></header>
      <div className="lesson-track">{FOUNDATION_LESSONS.filter((lesson) => lesson.chapter === chapter).map((lesson) => {
        const item = progress.get(lesson.id)!;
        return <button type="button" key={lesson.id} className={`lesson-node ${item.state}`} disabled={item.state === 'locked'} onClick={() => onLearn(lesson.id)} aria-label={`${lesson.title}，${stateLabel[item.state]}`}>
          <span className="lesson-order">{String(lesson.order).padStart(2, '0')}</span>
          <span className="lesson-node-copy"><small>{lesson.plainTitle}</small><strong>{lesson.title}</strong><em>{lesson.minutes} 分钟 · {stateLabel[item.state]}</em></span>
          <span className="lesson-state" aria-hidden="true">{item.completed ? '✓' : item.state === 'locked' ? '锁' : '→'}</span>
        </button>;
      })}</div>
    </section>)}</div>
  </section>;
}

import { FoundationMap } from '../components/FoundationMap';
import { PathPanel } from '../components/PathPanel';
import type { CatalogProblem } from '../lib/catalog';
import type { LearningEvent } from '../lib/learner-memory';
import type { ProgressState } from '../lib/progress';

type Props = {
  catalog: CatalogProblem[];
  progress: ProgressState;
  events: LearningEvent[];
  onOpen: (id: string) => void;
  onLearn: (lessonId: string) => void;
};

export function PathsPage({ events, onLearn, ...problemPathProps }: Props) {
  return <div className="module-page paths-page">
    <header className="module-header"><div><span className="section-kicker">KNOWLEDGE PATH</span><h1>学习中心</h1><p>从程序直觉开始：5–10 分钟通俗微课、状态预测、局部编码，再回到真实题完成迁移。</p></div></header>
    <FoundationMap events={events} onLearn={onLearn} />
    <div className="advanced-path-divider"><span>完成起步课后继续</span><strong>真实题能力路线</strong></div>
    <PathPanel {...problemPathProps} />
  </div>;
}

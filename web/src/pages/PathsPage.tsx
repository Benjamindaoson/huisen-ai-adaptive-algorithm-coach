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
    <header className="module-header"><div><span className="section-kicker">LEARNING JOURNEY</span><h1>学习中心</h1><p>零基础先学会读懂程序，再用真实题把知识练成能力。</p></div></header>
    <FoundationMap events={events} onLearn={onLearn} />
    <div className="advanced-path-divider"><span>完成起步课后继续</span><strong>真实题能力路线</strong></div>
    <PathPanel {...problemPathProps} />
  </div>;
}

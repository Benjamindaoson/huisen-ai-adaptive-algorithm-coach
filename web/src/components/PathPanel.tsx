import type { CatalogProblem } from '../lib/catalog';
import { LEARNING_PATHS, resolvePath } from '../lib/paths';
import type { ProgressState } from '../lib/progress';

type Props = {
  catalog: CatalogProblem[];
  progress: ProgressState;
  onOpen: (id: string) => void;
};

export function PathPanel({ catalog, progress, onOpen }: Props) {
  return (
    <section className="paths-panel" aria-labelledby="paths-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">本周闯关路线</p>
          <h2 id="paths-title">把题目读成一条路径</h2>
        </div>
        <span className="muted">六条可随时开始的路线</span>
      </div>
      <div className="path-grid">
        {LEARNING_PATHS.map((path, index) => {
          const ids = resolvePath(path, catalog);
          const mastered = ids.filter((id) => progress.problems[id]?.status === 'mastered').length;
          return (
            <article className="path-card" key={path.id}>
              <span className="path-number">0{index + 1}</span>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <div className="path-meta"><span>{mastered} / {ids.length} 已掌握</span><span>→</span></div>
              <button type="button" className="text-button" disabled={!ids.length} onClick={() => ids[0] && onOpen(ids[0])}>
                {ids.length ? '从第一题开始' : '题库中暂无匹配题'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

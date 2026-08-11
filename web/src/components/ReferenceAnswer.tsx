import type { ReferenceSection } from '../lib/reference-answer';

type Props = {
  sections: ReferenceSection[];
  unlocked: boolean;
  canOpenDirectly: boolean;
  onUnlock: () => void;
};

export function ReferenceAnswer({ sections, unlocked, canOpenDirectly, onUnlock }: Props) {
  function unlock() {
    if (!canOpenDirectly && !window.confirm('现在查看会把本次练习标记为“已参考答案”。建议先提交一次自己的代码。\n\n仍然查看吗？')) return;
    onUnlock();
  }

  if (!unlocked) return <section className="reference-gate">
    <div className="reference-lock" aria-hidden="true">◎</div>
    <span>REFERENCE ANSWER</span>
    <h2>先保留独立思考，再对照答案</h2>
    <p>{canOpenDirectly ? '你已经提交过自己的尝试，可以查看资料中的参考思路和代码。' : '你还没有进行样例提交。现在查看不会影响代码，但会结束本次独立作答。'}</p>
    <button type="button" className="secondary-action" onClick={unlock}>查看参考答案</button>
  </section>;

  if (!sections.length) return <div className="empty-panel"><strong>当前资料没有完整参考答案</strong><p>你仍可使用提交证据和学习教练完成复盘。</p></div>;

  return <div className="reference-content">
    <div className="reference-disclosure"><span>已查看参考答案</span><p>建议先总结自己的方案差异，再修改代码。</p></div>
    {sections.map((section) => <section className={`reference-section ${section.kind}`} key={section.id}><h2>{section.title}</h2><pre>{section.content}</pre></section>)}
  </div>;
}

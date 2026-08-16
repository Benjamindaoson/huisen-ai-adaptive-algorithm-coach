import { buildTrustCenterState, EDUCATION_TRUST_MANIFEST, FORMATIVE_EVALUATION_NOTICE, type EducationDataClassification } from '../lib/education-trust';

type Props = {
  authenticated: boolean;
  apiConfigured: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  serverExportUrl?: string;
  onLocalExport: () => void;
  onDelete: () => void;
};

const CLASSIFICATION: Record<EducationDataClassification, { label: string; tone: string }> = {
  public: { label: '公开数据', tone: 'blue' },
  simulated: { label: '模拟教学数据', tone: 'violet' },
  'authorized-desensitized': { label: '授权脱敏数据', tone: 'amber' },
  'learner-created': { label: '学习者创建', tone: 'green' },
};

export function TrustCenterPage({ authenticated, apiConfigured, syncStatus, serverExportUrl, onLocalExport, onDelete }: Props) {
  const state = buildTrustCenterState({ authenticated, apiConfigured, syncStatus });
  return <div className="module-page trust-page">
    <header className="module-header trust-hero"><div><span className="section-kicker">EDUCATION TRUST CENTER · {EDUCATION_TRUST_MANIFEST.version}</span><h1>信任与数据</h1><p>你可以在这里看清公开数据、模拟数据、授权脱敏数据和你的学习数据分别从哪里来、为什么使用、存在哪里，以及它们能不能影响能力判断。</p></div><div className={`trust-status ${state.storageMode}`}><i /><span><strong>{state.storageMode === 'server-authoritative' ? '服务端权威保存' : state.storageMode === 'server-pending' ? '云端同步待恢复' : '仅保存在当前浏览器'}</strong><small>当前学习数据状态</small></span></div></header>

    <section className="evaluation-boundary" aria-label="AI 教育评价边界"><span>AI</span><div><strong>这是学习建议，不是最终教育评价</strong><p>{FORMATIVE_EVALUATION_NOTICE} 能力变化只接受经过验证的学习事件、独立迁移和延迟复测。</p></div></section>

    <section className="trust-data-grid" aria-label="学习数据清单">{EDUCATION_TRUST_MANIFEST.dataCategories.map((item) => <article key={item.id}>
      <header><span className={`trust-badge ${CLASSIFICATION[item.classification].tone}`}>{CLASSIFICATION[item.classification].label}</span><em>{item.affectsMastery ? '可形成候选学习证据' : '不直接改变掌握度'}</em></header>
      <h2>{item.title}</h2><dl><div><dt>为什么使用</dt><dd>{item.purpose}</dd></div><div><dt>保存在哪里</dt><dd>{item.storage}</dd></div><div><dt>保留与控制</dt><dd>{item.retention}</dd></div></dl>
    </article>)}</section>

    <section className="data-control-center"><div><span className="section-kicker">YOUR CONTROLS</span><h2>你的数据控制权</h2><p>导出会生成可迁移备份；删除云端数据需要登录、服务可用并再次确认，不会用界面假装已经删除。</p></div><div className="data-control-actions">
      <button type="button" onClick={onLocalExport}>导出本机备份</button>
      {state.controls.cloudExport === 'available' && serverExportUrl ? <a href={serverExportUrl}>导出云端数据</a> : <button type="button" disabled>{state.controls.cloudExport === 'sign-in-required' ? '登录后导出云端数据' : '云端导出暂不可用'}</button>}
      <button type="button" className="danger" disabled={state.controls.deletion !== 'available'} onClick={onDelete}>{state.controls.deletion === 'available' ? '申请删除云端学习数据' : state.controls.deletion === 'sign-in-required' ? '登录后申请删除' : '云端删除暂不可用'}</button>
    </div></section>
  </div>;
}

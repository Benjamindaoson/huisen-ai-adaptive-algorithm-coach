import { useMemo, useState } from 'react';
import { createBlindComparison, type QualityComparison, type TeacherReview, type TeacherReviewInput, type TeacherRubric } from '../lib/quality-review';
import type { AdjudicationQueueItem } from '../lib/quality-review-client';

type Props = {
  comparisons: QualityComparison[];
  realEligibleCount: number;
  importedPublicCount?: number;
  reviews: TeacherReview[];
  adjudicationQueue: AdjudicationQueueItem[];
  calibrations: Array<{ modelId: string; heldOutCases: number; agreement: number; authoritative: boolean }>;
  gateFailures: string[];
  storage: 'memory' | 'file-local';
  onSubmit: (comparison: QualityComparison, input: TeacherReviewInput) => void | Promise<void>;
};

const initialRubric: TeacherRubric = { localization: false, cause: false, evidence: false, minimalHint: false, leakage: false };

export function QualityWorkbenchPage({ comparisons, realEligibleCount, importedPublicCount = 0, reviews, adjudicationQueue, calibrations, gateFailures, storage, onSubmit }: Props) {
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const comparison = comparisons[comparisonIndex] ?? comparisons[0];
  const blind = useMemo(() => comparison ? createBlindComparison(comparison, comparison.id) : null, [comparison]);
  const [reviewerId, setReviewerId] = useState('');
  const [preferredHash, setPreferredHash] = useState('');
  const [rubric, setRubric] = useState(initialRubric);
  const [notes, setNotes] = useState('');
  const gatePassed = realEligibleCount >= 100;
  const canSubmit = Boolean(reviewerId.trim() && preferredHash && rubric.localization && rubric.cause && rubric.evidence && rubric.minimalHint);

  function submit() {
    if (!canSubmit) return;
    if (!comparison) return;
    void onSubmit(comparison, { reviewerId: reviewerId.trim(), preferredHash, rubric, notes, reviewedAt: new Date().toISOString() });
    setPreferredHash(''); setNotes(''); setRubric(initialRubric);
  }

  return <section className="module-page quality-workbench">
    <header className="module-header"><div><span className="section-kicker">INTERNAL QUALITY</span><h1>导师质量实验室</h1><p>教师盲评是最终裁决；模型评审只有在留出集校准通过后，才能参与回归门禁。</p></div><div className={`quality-gate ${gatePassed ? 'passed' : 'blocked'}`}><span>真实已裁决案例</span><strong>{realEligibleCount} / 100</strong><small>{gatePassed ? '真实金标门禁已通过' : '真实金标门禁未通过，禁止宣称导师质量已验证'}</small></div></header>

    <div className="quality-summary">
      <article><span>公共真实错误提交</span><strong>{importedPublicCount}</strong><small>{importedPublicCount - realEligibleCount} 条等待教师裁决；不计入金标门禁</small></article>
      <article><span>教师评审</span><strong>{reviews.length}</strong><small>{storage === 'file-local' ? '服务端持久化' : '服务端内存模式，重启后不会保留'}</small></article>
      <article><span>数据版本</span><strong>{comparison?.datasetVersion ?? '未加载'}</strong><small>{comparisons.length} 个真实待评审比较</small></article>
      <article><span>仲裁状态</span><strong>{adjudicationQueue.length ? `${adjudicationQueue.length} 个冲突待仲裁` : '无冲突'}</strong><small>模型不能自动覆盖教师结论</small></article>
    </div>

    <section className="quality-governance-status">
      <article><span>模型评审</span><strong>{calibrations.some((item) => item.authoritative) ? '已通过留出集校准' : '模型评审未校准'}</strong><small>{calibrations.length ? calibrations.map((item) => `${item.modelId}: ${item.heldOutCases} 例 / ${Math.round(item.agreement * 100)}%`).join(' · ') : '模型只可排序队列，不能参与发布门禁'}</small></article>
      <article><span>回归门禁失败原因</span>{gateFailures.length ? <ul>{gateFailures.map((failure) => <li key={failure}>{failure}</li>)}</ul> : <strong>未加载或没有失败项</strong>}</article>
    </section>

    {!comparison || !blind ? <section className="empty-state"><h2>没有可评审案例</h2><p>请先通过质量数据管线导入真实比较集；系统不会用 synthetic demo 冒充真实案例。</p></section> : <>
    {comparisons.length > 1 && <label className="quality-case-selector">评审案例<select value={comparisonIndex} onChange={(event) => setComparisonIndex(Number(event.target.value))}>{comparisons.map((item, index) => <option value={index} key={item.id}>{item.caseId}</option>)}</select></label>}
    <section className="evidence-envelope-panel">
      <header><div><span className="section-kicker">EVIDENCE ENVELOPE</span><h2>这次结论分析的是提交 {comparison.evidence.attempt.id}</h2></div>{comparison.evidence.diff.stale && <b>当前代码已变化 · 使用提交快照评审</b>}</header>
      <div className="evidence-grid">
        <article><span>运行结果</span><strong>{comparison.evidence.run.outcome}</strong><pre>{`输入  ${comparison.evidence.run.failedCase?.input ?? '-'}\n期望  ${comparison.evidence.run.failedCase?.expected ?? '-'}\n实际  ${comparison.evidence.run.failedCase?.actual ?? '-'}`}</pre></article>
        <article><span>工具调用</span>{comparison.evidence.toolCalls.map((tool) => <div className="tool-proof" key={tool.resultHash}><strong>{tool.name}</strong><code>{tool.resultHash}</code></div>)}</article>
        <article><span>提交 → 当前 diff</span><strong>{comparison.evidence.diff.summary}</strong><pre>{comparison.evidence.diff.hunks.join('\n')}</pre></article>
      </div>
    </section>

    <section className="blind-review-panel">
      <header><div><span className="section-kicker">BLIND A/B</span><h2>哪位导师更能让学生独立做出下一题？</h2></div><label>教师 ID<input value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} placeholder="teacher-001" /></label></header>
      <div className="candidate-grid">{blind.candidates.map((candidate) => <button type="button" aria-label={`候选 ${candidate.blindId}`} className={preferredHash === candidate.hash ? 'selected' : ''} onClick={() => setPreferredHash(candidate.hash)} key={candidate.hash}><span>候选 {candidate.blindId}</span><p>{candidate.text}</p><small>{candidate.evidenceRefs.length ? `引用 ${candidate.evidenceRefs.length} 条证据` : '没有引用证据'}</small></button>)}</div>
      <div className="review-rubric">
        {([
          ['localization', '错误定位准确'], ['cause', '错因判断准确'], ['evidence', '证据充分'], ['minimalHint', '提示足够小'], ['leakage', '存在直接泄题'],
        ] as Array<[keyof TeacherRubric, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={rubric[key]} onChange={(event) => setRubric((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}
      </div>
      <textarea aria-label="评审备注" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="写下证据引用、分歧原因或需要复核的点" />
      <div className="review-submit"><p>两个教师结论冲突时会进入仲裁队列，模型不能自动晋级案例。</p><button type="button" className="primary-action" disabled={!canSubmit} onClick={submit}>提交教师评审</button></div>
    </section>
    </>}
  </section>;
}

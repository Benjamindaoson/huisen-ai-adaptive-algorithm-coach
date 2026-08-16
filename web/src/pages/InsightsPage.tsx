import type { SkillMastery } from '../lib/mastery';
import { getSkill } from '../lib/skills';
import type { LearnerProjection, PedagogicalPhase } from '../lib/learning-projection';
import type { SkillId } from '../lib/skills';
import type { LearningEvent } from '../lib/learner-memory';
import { FORMATIVE_EVALUATION_NOTICE } from '../lib/education-trust';
import type { EvidenceMetric, LearningEffectEvidence } from '../lib/learning-effect-evidence';
import { deriveDiagnosticSnapshot, DIAGNOSTIC_OBSERVATION_COPY } from '../lib/bridge-journey';
import { projectBridgeLearningAction } from '../lib/projected-learning-action';

type Props = { mastery: SkillMastery[]; projection?: LearnerProjection; learningEvents?: LearningEvent[]; effectEvidence?: LearningEffectEvidence; onStartBaseline?: () => void };
const PHASE_LABEL: Record<PedagogicalPhase, string> = { understanding: '理解', modeling: '建模', implementation: '实现', debugging: '调试', validation: '验证' };

const EVIDENCE_STATUS = { 'not-collected': '尚未采集', insufficient: '样本不足', measurable: '可测量' } as const;

function evidenceValue(metric: EvidenceMetric, targetMode = false): string {
  if (targetMode) return `${metric.numerator} / ${metric.minimum}`;
  return metric.denominator > 0 ? `${metric.numerator} / ${metric.denominator}` : '0 / 0';
}

export function InsightsPage({ mastery, projection, learningEvents = [], effectEvidence }: Props) {
  const evidence = mastery.filter((item) => item.evidenceCount > 0).sort((a, b) => a.score - b.score);
  const total = evidence.reduce((sum, item) => sum + item.evidenceCount, 0);
  const diagnostic = deriveDiagnosticSnapshot(learningEvents);
  const hasDiagnosticEvidence = diagnostic.completedSteps.length > 0;
  const diagnosticAction = projectBridgeLearningAction(learningEvents);
  const immediateTransfer = [...learningEvents]
    .filter((event) => event.kind === 'training-stage-completed' && event.data.stage === 'transfer' && event.data.correct === true)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.id.localeCompare(left.id))[0];
  const projectCompleted = learningEvents.filter((event) => event.kind === 'practicum-completed' && event.data.passed === true);
  const projectHints = learningEvents.filter((event) => event.kind === 'practicum-hint-used');
  return <div className="module-page insights-page">
    <header className="module-header"><div><span className="section-kicker">DIGITAL TWIN</span><h1>能力模型</h1><p>技能、独立完成程度、提示依赖和学习阶段都绑定真实事件；没有证据时，我们不会假装了解你。</p></div><strong className="header-count">{total}<small> 条掌握证据</small></strong></header>
    <section className="formative-notice"><strong>评价边界</strong><p>{FORMATIVE_EVALUATION_NOTICE}</p><a href="#/trust">查看数据与证据规则 →</a></section>
    {!evidence.length ? immediateTransfer ? <div className="empty-state-card diagnostic-evidence-card"><span>AI</span><h2>即时迁移已通过</h2><p>你已经在不同情境中独立运行并通过了同一项算法动作。系统保留这次完成记录，但不会把一次即时成功说成长期掌握。</p><em>这不等于长期掌握；还需要延迟复测和之后的真实任务证据。</em><small>依据：event:{immediateTransfer.id}</small><a className="primary-action empty-state-action" href={diagnosticAction.href}>{diagnosticAction.label} <span>→</span></a></div> : hasDiagnosticEvidence ? <div className="empty-state-card diagnostic-evidence-card"><span>AI</span><h2>AI 已记录 {diagnostic.completedSteps.length} 个入口动作</h2><p>{diagnostic.claim ?? diagnostic.uncertainty}</p><ul aria-label="AI 记录的入口动作">{diagnostic.observations.map((observation) => <li key={observation.evidenceRef}><i className={observation.result} /><strong>{DIAGNOSTIC_OBSERVATION_COPY[observation.step].label}</strong><small>{observation.result === 'stable' ? '当前稳定' : '需要补强'}</small></li>)}</ul><em>这些动作只用于安排训练起点，不等于掌握证据；完成代码与陌生迁移后才会更新上方能力。</em><a className="primary-action empty-state-action" href={diagnosticAction.href}>{diagnosticAction.label} <span>→</span></a></div> : <div className="empty-state-card"><span>AI</span><h2>先完成 3 分钟 AI 入口诊断</h2><p>不用先做完整算法题。三个小动作会检查你怎样读状态、写步骤和做建模，然后系统只安排最短的下一段训练。</p><a className="primary-action empty-state-action" href={diagnosticAction.href}>{diagnosticAction.label} <span>→</span></a></div> : <div className="insights-layout">
      <section className="skill-report"><div className="section-title"><h2>技能掌握度</h2><span>规则模型 v1 · 可解释</span></div>{evidence.map((item) => <article className="skill-report-row" key={item.skillId}><div><strong>{getSkill(item.skillId).title}</strong><small>{item.evidenceCount} 条证据 · 置信度 {Math.round(item.confidence * 100)}%</small></div><div className="skill-meter"><i style={{ width: `${Math.round(item.score * 100)}%` }} /></div><b>{Math.round(item.score * 100)}%</b></article>)}</section>
      <aside className="insight-coach-card"><span className="ai-mark">AI</span><h2>教练判断</h2><p>{getSkill(evidence[0].skillId).title}是当前最值得投入的薄弱项。</p><small>依据：{evidence[0].evidenceCount} 次相关提交，最近掌握度 {Math.round(evidence[0].score * 100)}%。</small><a href="#/today">查看今日推荐 →</a></aside>
    </div>}
    {effectEvidence && <details className="insights-evidence-disclosure"><summary><span>查看系统依据与学习效果状态</span><small>研究数据</small></summary><section className="learning-effect-evidence">
      <header><div><span className="section-kicker">REAL-WORLD EVIDENCE</span><h2>真实学习证据</h2></div><strong className={effectEvidence.canClaimLearningEffect ? 'claim-ready' : 'claim-blocked'}>{effectEvidence.canClaimLearningEffect ? '证据门槛已满足' : '目前不可宣称学习效果已被验证'}</strong></header>
      <div className="effect-metric-grid">
        <article><span>{EVIDENCE_STATUS[effectEvidence.teacherAdjudication.status]}</span><strong>{evidenceValue(effectEvidence.teacherAdjudication, true)}</strong><h3>教师裁决案例</h3><p>仅统计服务端确认符合来源、证据与教师裁决要求的真实案例。</p><small>最低可测量样本：{effectEvidence.teacherAdjudication.minimum}</small></article>
        <article><span>{EVIDENCE_STATUS[effectEvidence.independentTransfer.status]}</span><strong>{evidenceValue(effectEvidence.independentTransfer)}</strong><h3>迁移题独立通过率</h3><p>完成教学后，面对不同表面题目且未使用提示的独立通过结果。</p><small>最低可测量样本：{effectEvidence.independentTransfer.minimum}</small></article>
        <article><span>{EVIDENCE_STATUS[effectEvidence.sevenDayRetraining.status]}</span><strong>{evidenceValue(effectEvidence.sevenDayRetraining)}</strong><h3>7 日复训率</h3><p>只有迁移事件经过完整七天后，后续复测才进入统计。</p><small>{effectEvidence.sevenDayRetraining.nextEligibleAt ? `下一份样本可计入：${new Date(effectEvidence.sevenDayRetraining.nextEligibleAt).toLocaleDateString('zh-CN')}` : `最低可测量样本：${effectEvidence.sevenDayRetraining.minimum}`}</small></article>
      </div>
      <footer>生成时间 {new Date(effectEvidence.generatedAt).toLocaleString('zh-CN')} · 不提供混合总分 · 每项可追溯到事件或教师案例</footer>
    </section></details>}
    {projection && projection.phaseReplay.length > 0 && <details className="insights-evidence-disclosure learning-replay-disclosure"><summary><span>查看学习过程依据</span><small>事件重放</small></summary><section className="learning-replay">
      <header className="section-title"><div><span className="section-kicker">EVIDENCE REPLAY</span><h2>学习过程重放</h2></div><span>数字孪生只接受可解释事件</span></header>
      <div className="phase-replay-list">{projection.phaseReplay.slice(-10).map((node, index) => <article key={`${node.phase}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{PHASE_LABEL[node.phase]}</strong><small>{node.eventIds.join(' · ')}</small></div><code>{node.evidenceRefs.join(' · ')}</code></article>)}</div>
      <div className="contribution-ledger"><header><strong>能力变化账本</strong><span>规则投影，不接受模型直接赋分</span></header>{projection.contributionLedger.slice(-8).map((item, index) => <article key={`${item.skillId}-${item.dimension}-${index}`}><div><strong>{getSkill(item.skillId as SkillId).title}</strong><small>{item.rule}</small></div><b>{item.delta > 0 ? '+' : ''}{Math.round(item.delta * 100)}%</b><code>{item.evidenceRefs.join(' · ')}</code></article>)}</div>
    </section></details>}
    {(projectCompleted.length > 0 || projectHints.length > 0) && <section className="project-evidence-card"><header><div><span className="section-kicker">PROJECT PRACTICUM</span><h2>项目工程证据</h2></div><span>与算法题证据分开计算</span></header><div><article><strong>{projectCompleted.length} 个项目完成验证</strong><small>必须通过自动化测试并完成结构化复盘</small></article><article><strong>{projectHints.length} 次过程提示</strong><small>使用过 {projectHints.length} 次过程提示；独立完成度单独标注</small></article><article><strong>{projectCompleted.length ? '已验证' : '待验证'}工程闭环</strong><small>需求 → 定位 → 计划 → 修改 → 测试 → 复盘</small></article></div></section>}
  </div>;
}

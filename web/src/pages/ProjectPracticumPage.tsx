import { useEffect, useMemo, useState } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import type { LearningEvent, LearningSignal } from '../lib/learner-memory';
import { derivePracticumProgress, mentorIntervention, projectAvailability, type PracticumTestResult, type ProjectPracticum } from '../lib/project-practicum';

type Props = {
  project: ProjectPracticum;
  projects?: ProjectPracticum[];
  events: LearningEvent[];
  draft: string;
  onDraftChange: (source: string) => void;
  onSignal: (signal: LearningSignal) => void;
  onRunTests: (source: string) => Promise<PracticumTestResult>;
};

const PHASES = [
  ['understanding', '理解需求'], ['diagnosis', '定位缺陷'], ['planning', '制定计划'], ['implementation', '实施修改'], ['verification', '测试验证'], ['reflection', '工程复盘'],
] as const;

export function ProjectPracticumPage({ project, projects = [project], events, draft, onDraftChange, onSignal, onRunTests }: Props) {
  const progress = useMemo(() => derivePracticumProgress(project, events), [events, project]);
  const availability = useMemo(() => projectAvailability(projects, events), [events, projects]);
  const [activeFile, setActiveFile] = useState(project.files[0].path);
  const [diagnosis, setDiagnosis] = useState(''); const [plan, setPlan] = useState('');
  const [testing, setTesting] = useState(false); const [testResult, setTestResult] = useState<PracticumTestResult | null>(progress.lastTest ? { ...progress.lastTest, failures: [] } : null);
  const [reflectionTag, setReflectionTag] = useState<'boundary-contract' | 'test-first' | 'cross-file-impact'>('boundary-contract');
  const file = project.files.find((item) => item.path === activeFile) ?? project.files[0];
  const intervention = mentorIntervention(progress.phase, progress.hintCount);
  const currentIndex = progress.phase === 'completed' ? PHASES.length : Math.max(0, PHASES.findIndex(([phase]) => phase === progress.phase));

  useEffect(() => {
    setActiveFile(project.files[0].path);
    setDiagnosis('');
    setPlan('');
    setTestResult(null);
  }, [project]);

  async function runTests() {
    setTesting(true);
    try {
      const result = await onRunTests(draft); setTestResult(result);
      onSignal({ kind: 'practicum-tested', problemId: project.id, data: { phase: 'verification', passed: result.passed, passedCount: result.passedCount, totalCount: result.totalCount } });
    } finally { setTesting(false); }
  }

  return <div className="module-page practicum-page">
    <section className="practicum-path" aria-label="工程成长路径">
      <div className="practicum-path-heading"><div><span className="section-kicker">PROJECT PATH</span><h2>工程成长路径</h2></div><p>从边界修复开始，逐步进入异步数据、状态建模与性能验证。完成前置项目后自动解锁下一站。</p></div>
      <div className="practicum-path-grid">{projects.map((item) => {
        const access = availability.find((entry) => entry.projectId === item.id);
        const locked = access?.status === 'locked';
        const statusLabel = access?.status === 'completed' ? '已完成' : locked ? '未解锁' : item.id === project.id ? '进行中' : '可开始';
        const content = <><span className="path-order">{String(item.order).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.level} · {item.estimatedMinutes} 分钟</small></div><em>{statusLabel}</em></>;
        return locked
          ? <button type="button" key={item.id} className={`practicum-path-card ${access.status}`} disabled aria-label={`${item.title} · ${statusLabel}`}>{content}</button>
          : <a key={item.id} className={`practicum-path-card ${item.id === project.id ? 'active' : ''} ${access?.status ?? ''}`} href={`#/practicum/${encodeURIComponent(item.id)}`} aria-label={`${item.title} · ${statusLabel}`}>{content}</a>;
      })}</div>
    </section>
    <header className="module-header practicum-hero"><div><span className="section-kicker">REPOSITORY PRACTICUM · {project.role}</span><h1>{project.title}</h1><p>{project.brief}</p></div><div className="practicum-score"><strong>{progress.evidenceRefs.length}</strong><small>条过程证据</small><span>{project.estimatedMinutes} 分钟</span></div></header>
    <ol className="practicum-phases" aria-label="项目实训阶段">{PHASES.map(([phase, label], index) => <li key={phase} className={index < currentIndex ? 'done' : index === currentIndex ? 'active' : ''}><span>{index < currentIndex ? '✓' : index + 1}</span><small>{label}</small></li>)}</ol>

    {!progress.started ? <section className="practicum-onboarding"><div><span className="section-kicker">MISSION BRIEF</span><h2>这不是一道填空题，而是一张工程任务单</h2><p>你需要阅读三个文件、提出可验证诊断、选择最小变更计划、运行真实 JavaScript 测试并完成复盘。Mentor 不会替你写补丁。</p><div className="practicum-file-preview">{project.files.map((item) => <code key={item.path}>{item.path}</code>)}</div><ul>{project.acceptance.map((item) => <li key={item}>{item}</li>)}</ul></div><button type="button" className="primary-action" onClick={() => onSignal({ kind: 'practicum-started', problemId: project.id, data: { phase: 'understanding' } })}>开始项目实训</button></section> : <div className="practicum-workbench">
      <aside className="repo-tree"><header><span>模拟仓库</span><small>PUBLIC / SIMULATED</small></header>{project.files.map((item) => <button type="button" key={item.path} className={activeFile === item.path ? 'active' : ''} onClick={() => setActiveFile(item.path)}>{item.path}</button>)}</aside>
      <section className="repo-content"><header><strong>{file.path}</strong><span>{file.editable ? '可编辑工作文件' : '只读上下文'}</span></header>{file.editable ? <CodeEditor language="javascript" value={draft} onChange={onDraftChange} height="360px" /> : <pre>{file.content}</pre>}</section>
      <aside className="project-mentor"><header><span className="mentor-pulse"/><div><strong>Mentor guidance</strong><small>同一个上下文 Mentor · 只给当前阶段的最小必要提示</small></div></header><p>{intervention.prompt}</p><button type="button" onClick={() => onSignal({ kind: 'practicum-hint-used', problemId: project.id, data: { phase: progress.phase, hintLevel: Math.min(4, progress.hintCount + 1) } })}>我需要一个更小的提示</button></aside>
    </div>}

    {progress.started && progress.phase === 'diagnosis' && <section className="practicum-decision"><span className="section-kicker">DIAGNOSE</span><h2>先提交可检验的缺陷假设</h2><div>{project.diagnosisChoices.map((choice) => <label key={choice.id}><input type="radio" name="diagnosis" value={choice.id} checked={diagnosis === choice.id} onChange={() => setDiagnosis(choice.id)} />{choice.label}</label>)}</div><button type="button" disabled={!diagnosis} onClick={() => onSignal({ kind: 'practicum-phase-completed', problemId: project.id, data: { phase: 'diagnosis', choiceId: diagnosis } })}>确认诊断并进入计划</button></section>}
    {progress.phase === 'planning' && <section className="practicum-decision"><span className="section-kicker">PLAN</span><h2>选择影响面最小的修复计划</h2><div>{project.planChoices.map((choice) => <label key={choice.id}><input type="radio" name="plan" value={choice.id} checked={plan === choice.id} onChange={() => setPlan(choice.id)} />{choice.label}</label>)}</div><button type="button" disabled={!plan} onClick={() => onSignal({ kind: 'practicum-phase-completed', problemId: project.id, data: { phase: 'planning', choiceId: plan } })}>锁定计划并开始修改</button></section>}
    {(progress.phase === 'implementation' || progress.phase === 'verification') && <section className="practicum-test-panel"><div><span className="section-kicker">REAL EXECUTION</span><h2>用自动化测试验证，不靠“看起来没问题”</h2><p>测试只上传当前工作文件到已配置的私有运行器；遥测事件只记录通过数，不保存源码。</p></div><button type="button" disabled={testing} onClick={() => void runTests()}>{testing ? '正在运行…' : '运行项目测试'}</button>{testResult && <div className={testResult.passed ? 'test-pass' : 'test-fail'}><strong>{testResult.passedCount} / {testResult.totalCount} 项测试通过</strong>{testResult.failures.map((failure) => <small key={failure.name}>{failure.name}：实际 {String(failure.actual)}，期望 {String(failure.expected)}</small>)}</div>}</section>}
    {progress.phase === 'reflection' && <section className="practicum-reflection"><span className="section-kicker">REFLECT</span><h2>把这次修复迁移成下一次独立能力</h2><p>选择这次最重要的工程原则。这里只记录结构化标签，不保存自由文本。</p><select aria-label="工程复盘原则" value={reflectionTag} onChange={(event) => setReflectionTag(event.target.value as typeof reflectionTag)}><option value="boundary-contract">领域边界应该统一维护契约</option><option value="test-first">先让失败测试暴露真实缺口</option><option value="cross-file-impact">修改前先检查跨文件影响</option></select><button type="button" onClick={() => { onSignal({ kind: 'practicum-reflected', problemId: project.id, data: { phase: 'reflection', reflectionTag } }); onSignal({ kind: 'practicum-completed', problemId: project.id, data: { phase: 'completed', passed: true, assisted: progress.hintCount > 0 } }); }}>完成项目并生成能力证据</button></section>}
    {progress.completed && <section className="practicum-complete"><span>✓</span><div><strong>项目测试与复盘已经完成</strong><p>项目工程证据已记录；是否独立完成会根据 {progress.hintCount} 次提示使用单独标注，不会混成一个总分。</p></div><a href="#/insights">查看能力模型 →</a></section>}
  </div>;
}

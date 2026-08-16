import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProblemLanguage, ProblemRecord } from '../lib/catalog';
import { draftKey, type CodeDraft, type PracticeAttempt } from '../lib/practice';
import type { SkillMastery } from '../lib/mastery';
import { PROGRESS_STATUSES, type ProgressEntry } from '../lib/progress';
import { getProblemViewSections } from '../lib/problem-view';
import { canOpenReference, referenceSections } from '../lib/reference-answer';
import { initialEditorCode, starterCode } from '../lib/starter-code';
import { publicSampleCasesForProblem } from '../lib/testcase';
import { CodeEditor } from './CodeEditor';
import { RunnerPanel } from './RunnerPanel';
import { ReferenceAnswer } from './ReferenceAnswer';
import type { LearningSignal } from '../lib/learner-memory';
import type { MentorOSCheckpoint } from '../lib/mentor-os-state';
import type { DurableSubmission } from '../lib/platform-client';
import type { MentorTransferTask } from '../lib/mentor-client';

const languageNames: Record<ProblemLanguage, string> = { java: 'Java', python: 'Python', javascript: 'JavaScript', cpp: 'C++' };
const progressLabels: Record<ProgressEntry['status'], string> = { new: '未开始', 'in-progress': '进行中', mastered: '已掌握', review: '待复习' };
type Props = {
  problem: ProblemRecord;
  entry?: ProgressEntry;
  drafts: Record<string, CodeDraft>;
  attempts: PracticeAttempt[];
  mastery: SkillMastery[];
  onUpdate: (patch: Partial<Omit<ProgressEntry, 'updatedAt'>>) => void;
  onDraftChange: (language: ProblemLanguage, sourceCode: string) => void;
  onAttempt: (attempt: PracticeAttempt) => void;
  isAttemptAssisted?: (attempt: PracticeAttempt) => boolean;
  onLearningSignal?: (signal: LearningSignal) => void;
  learnerId?: string;
  remediation?: { lessonId: string; title: string; reason: string; confidence: 'low' | 'medium' | 'high'; authority: string } | null;
  onLearn?: (lessonId: string) => void;
  independentAssessment?: boolean;
  verifiedTransfer?: { lessonTitle: string; attemptId: string; verifiedAt: string; evidenceRefs: string[] } | null;
  onReturnToTraining?: () => void;
  mentorOS?: { runId: string; cursor: number };
  mentorOSRequired?: boolean;
  onMentorOSCheckpoint?: (checkpoint: MentorOSCheckpoint) => void;
  onOpenTransfer?: (task: MentorTransferTask) => void;
  onHiddenSubmit?: (input:{problemId:string;language:ProblemLanguage;sourceCode:string;idempotencyKey:string})=>Promise<DurableSubmission>;
};

function displayTitle(title: string): string {
  return title.replace(/^[（(]?\s*\d+分\s*[-,，—]?\s*[)）]?\s*/, '').replace(/^[-—–_,，:：\s]+/, '') || title;
}

export function ProblemReader({ problem, entry, drafts, attempts, mastery, onUpdate, onDraftChange, onAttempt, isAttemptAssisted, onLearningSignal, learnerId, remediation, onLearn, independentAssessment = false, verifiedTransfer, onReturnToTraining, mentorOS, mentorOSRequired = false, onMentorOSCheckpoint, onOpenTransfer, onHiddenSubmit }: Props) {
  const languages = useMemo(() => Object.keys(problem.solutions) as ProblemLanguage[], [problem]);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [language, setLanguage] = useState<ProblemLanguage>(languages[0] ?? 'python');
  const [code, setCode] = useState(starterCode(languages[0] ?? 'python'));
  const [view, setView] = useState<'description' | 'reference'>('description');
  const [referenceUnlocked, setReferenceUnlocked] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const initialLanguage = languages[0] ?? 'python';
    setLanguage(initialLanguage);
    setCode(initialEditorCode(initialLanguage, draftsRef.current[draftKey(problem.id, initialLanguage)]?.sourceCode, problem.solutions[initialLanguage]));
    setView('description');
    setReferenceUnlocked(false);
    setFocusMode(false);
  }, [problem.id, languages, problem.solutions]);

  function selectLanguage(nextLanguage: ProblemLanguage) {
    setLanguage(nextLanguage);
    setCode(initialEditorCode(nextLanguage, drafts[draftKey(problem.id, nextLanguage)]?.sourceCode, problem.solutions[nextLanguage]));
    setReferenceUnlocked(false);
  }

  function changeCode(nextCode: string) {
    setCode(nextCode);
    onDraftChange(language, nextCode);
  }

  function recordPracticeAttempt(attempt: PracticeAttempt) {
    onAttempt(attempt);
    if (attempt.mode === 'sample-submit' && attempt.outcome === 'passed') {
      onUpdate({ status: isAttemptAssisted?.(attempt) ? 'review' : 'mastered' });
    }
    else if (!entry || entry.status === 'new') onUpdate({ status: 'in-progress' });
  }

  const visibleSections = getProblemViewSections('description', problem.sections);
  const sampleCases = useMemo(() => publicSampleCasesForProblem(problem), [problem]);
  const activeDraft = drafts[draftKey(problem.id, language)];
  const directReference = canOpenReference(attempts, problem.id, language);
  const references = referenceSections(problem, language);

  function unlockReference() {
    const latestAttempt = [...attempts].filter((attempt) => attempt.language === language).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    if (!referenceUnlocked) onLearningSignal?.({ kind: 'reference-unlocked', problemId: problem.id, ...(latestAttempt ? { attemptId: latestAttempt.id } : {}), data: {} });
    setReferenceUnlocked(true);
  }

  return <article className={`leetcode-workspace ${focusMode ? 'is-focus-mode' : ''}`}>
    {!focusMode && <section className="problem-pane" aria-label="题目内容">
      <nav className="problem-tabs" aria-label="题目视图" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'description'} className={view === 'description' ? 'selected' : ''} onClick={() => setView('description')}>题目描述</button>
        {!independentAssessment && <button type="button" role="tab" aria-selected={view === 'reference'} className={view === 'reference' ? 'selected' : ''} onClick={() => setView('reference')}>参考答案</button>}
      </nav>
      <div className="problem-scroll">
        <header className="problem-header">
          <div>
            <div className="problem-badges"><span>{problem.collection}</span>{problem.score && <span>{problem.score} 分</span>}{problem.completeness === 'index-only' && <span className="warning-badge">资料不完整</span>}</div>
            <h1>{displayTitle(problem.title)}</h1>
          </div>
          <div className="problem-actions">
            <label className="field-label">学习状态
              <select value={entry?.status ?? 'new'} onChange={(event) => onUpdate({ status: event.target.value as ProgressEntry['status'] })}>
                {PROGRESS_STATUSES.map((status) => <option value={status} key={status}>{progressLabels[status]}</option>)}
              </select>
            </label>
            <button type="button" className={`star-button ${entry?.starred ? 'active' : ''}`} aria-pressed={entry?.starred ?? false} onClick={() => onUpdate({ starred: !(entry?.starred ?? false) })}>☆ 收藏</button>
          </div>
        </header>

        {problem.tags.includes('variant-candidate') && <p className="variant-notice">该题存在同名版本；当前内容保留了它的全部来源路径。</p>}

        {independentAssessment && <aside className="independent-assessment-banner"><strong>独立验证模式</strong><span>导师、提示和参考答案已关闭；本题用于验证迁移与延迟保持。</span></aside>}
        {verifiedTransfer && <aside className="transfer-completion-receipt" aria-label="迁移验证结果">
          <span className="transfer-receipt-check">✓</span>
          <div><span>来自真实提交的学习证据</span><strong>独立迁移已验证</strong><p>提交 <code>{verifiedTransfer.attemptId}</code> 已在不同题面中独立通过，说明你这次能够把「{verifiedTransfer.lessonTitle}」用出来。</p><small>这次通过不等于长期掌握；系统会安排不同题面与延迟复测。</small><details><summary>查看验证证据</summary><code>{verifiedTransfer.evidenceRefs.join(' · ')}</code><time dateTime={verifiedTransfer.verifiedAt}>{verifiedTransfer.verifiedAt}</time></details></div>
          {onReturnToTraining && <button type="button" onClick={onReturnToTraining}>查看下一步</button>}
        </aside>}
        {view === 'description' || independentAssessment ? <div className="reader-content" role="tabpanel">
          {visibleSections.map(([key, title, content]) => <section className="book-section" key={key}>
            <h2>{title}</h2><pre>{content}</pre>
          </section>)}
          {!visibleSections.length && <div className="empty-solution"><strong>该资料暂未收录完整题干</strong><span>你仍可在右侧编辑器中编写、运行并保存自己的解法。</span></div>}
        </div> : <div className="reader-content" role="tabpanel"><ReferenceAnswer sections={references} unlocked={referenceUnlocked} canOpenDirectly={directReference} onUnlock={unlockReference} /></div>}

        {view === 'description' && <><section className="note-section">
          <label className="field-label">我的笔记 <span>仅保存在当前浏览器</span>
            <textarea value={entry?.note ?? ''} onChange={(event) => onUpdate({ note: event.target.value })} placeholder="记录关键思路、易错点或复习原因" rows={4} />
          </label>
        </section>
        <details className="source-details"><summary>查看 {problem.sourcePaths.length} 个原始来源路径</summary><ul>{problem.sourcePaths.map((path) => <li key={path}>{path}</li>)}</ul></details></>}
      </div>
    </section>}

    <aside className="editor-pane" aria-label="代码练习区">
      <header className="editor-pane-header">
        <strong><span>&lt;/&gt;</span> Code</strong>
        <div className="editor-header-tools">
          <button type="button" className="focus-mode-toggle" aria-pressed={focusMode} onClick={() => setFocusMode((value) => !value)}>{focusMode ? '退出专注模式' : '进入专注模式'}</button>
          {activeDraft && <span className="draft-status" title={activeDraft.updatedAt}>✓ 已自动保存</span>}
          {languages.length > 0 && <div className="language-tabs" aria-label="编程语言">{languages.map((item) => <button type="button" key={item} className={item === language ? 'selected' : ''} onClick={() => selectLanguage(item)}>{languageNames[item]}</button>)}</div>}
        </div>
      </header>
      {languages.length ? <><CodeEditor language={language} value={code} onChange={changeCode} height="min(46vh, 540px)" /><RunnerPanel problem={problem} language={language} sourceCode={code} sampleCases={sampleCases} attempts={attempts.filter((attempt) => attempt.language === language)} mastery={mastery} onAttempt={recordPracticeAttempt} onReference={() => { if (!independentAssessment) { unlockReference(); setView('reference'); } }} onIntervention={(kind, level, attemptId) => onLearningSignal?.({ kind, problemId: problem.id, attemptId, data: { hintLevel: level } })} onMentorRevisionVerified={(attemptId) => onLearningSignal?.({ kind: 'mentor-revision-verified', problemId: problem.id, attemptId, data: { outcome: 'passed' } })} learnerId={learnerId} remediation={remediation} onLearn={onLearn} assistanceAllowed={!independentAssessment} mentorOS={mentorOS} mentorOSRequired={mentorOSRequired} onMentorOSCheckpoint={onMentorOSCheckpoint} onOpenTransfer={onOpenTransfer} onHiddenSubmit={onHiddenSubmit} /></> : <p className="muted editor-empty">该题暂时没有可用的编程语言。</p>}
    </aside>
  </article>;
}

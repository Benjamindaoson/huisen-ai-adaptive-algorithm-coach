import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { ExamWorkspace } from './components/ExamWorkspace';
import { ProblemReader } from './components/ProblemReader';
import { exportLearningBackup, importLearningBackup } from './lib/backup';
import { type Catalog, loadCatalog, loadProblem, loadProblemAlias, type ProblemRecord } from './lib/catalog';
import { buildDailyPlan } from './lib/daily-plan';
import { loadLearnerMemory, recordLearningSignal, saveLearnerMemory, updateLearnerProfile, type LearnerMemory, type LearningSignal } from './lib/learner-memory';
import { requestRemotePlan, resolveLearningApiUrl, syncLearnerProfile, syncLearningEventsBatch } from './lib/learning-client';
import { orchestrateLearning, type AgentDecision } from './lib/learning-orchestrator';
import { createExamSession, loadExam, saveExam, type ExamSession } from './lib/exam';
import { selectExamProblems } from './lib/exam-selection';
import { deriveMastery } from './lib/mastery';
import { isAssistedPass } from './lib/learning-evidence';
import { buildMistakeReviewCards } from './lib/mistake-review';
import { loadPractice, recordAttempt, savePractice, updateDraft, type PracticeAttempt, type PracticeState } from './lib/practice';
import { loadProgress, saveProgress, updateProgress, type ProgressState } from './lib/progress';
import { navigate, parseHashRoute, type AppRoute, type ModuleRouteName } from './lib/routes';
import { reviewedPublicSampleCasesForProblem } from './lib/testcase';
import { recordTelemetry } from './lib/telemetry';
import { ExamPage } from './pages/ExamPage';
import { InsightsPage } from './pages/InsightsPage';
import { PathsPage } from './pages/PathsPage';
import { ProblemsPage } from './pages/ProblemsPage';
import { ReviewPage } from './pages/ReviewPage';
import { TodayPage } from './pages/TodayPage';
import { LessonPage } from './pages/LessonPage';
import { getFoundationLesson } from './lib/foundation-curriculum';
import { deriveLessonProgress, findTransferProblem, nextFoundationLesson, remediationLessonFor } from './lib/lesson-progress';
import './App.css';

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute(window.location.hash));
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [problem, setProblem] = useState<ProblemRecord | null>(null);
  const [problemError, setProblemError] = useState('');
  const [exam, setExam] = useState<ExamSession | null>(() => loadExam(window.localStorage));
  const [examProblems, setExamProblems] = useState<Record<string, ProblemRecord>>({});
  const [startingExam, setStartingExam] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress(window.localStorage));
  const [practice, setPractice] = useState<PracticeState>(() => loadPractice(window.localStorage));
  const [memory, setMemory] = useState<LearnerMemory>(() => loadLearnerMemory(window.localStorage));
  const [remoteDecision, setRemoteDecision] = useState<AgentDecision | null>(null);
  const learningApiUrl = resolveLearningApiUrl();
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((error: unknown) => setCatalogError(error instanceof Error ? error.message : '题库索引加载失败'));
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (route.name !== 'problem') { setProblem(null); setProblemError(''); return; }
    let active = true;
    setProblem(null);
    setProblemError('');
    loadProblem(route.problemId).then((next) => { if (active) setProblem(next); }).catch(async (error: unknown) => {
      const alias = await loadProblemAlias(route.problemId);
      if (alias && alias !== route.problemId) { navigate({ name: 'problem', problemId: alias }); return; }
      if (active) setProblemError(error instanceof Error ? error.message : '题目加载失败');
    });
    return () => { active = false; };
  }, [route]);

  const examId = exam?.id;
  const examProblemIds = exam?.problemIds;
  useEffect(() => {
    if (route.name !== 'exam-session' || !examId || !examProblemIds) { setExamProblems({}); return; }
    let active = true;
    Promise.all(examProblemIds.map(async (id) => [id, await loadProblem(id)] as const))
      .then((entries) => { if (active) setExamProblems(Object.fromEntries(entries)); })
      .catch(() => { if (active) setExamProblems({}); });
    return () => { active = false; };
  }, [examId, examProblemIds, route.name]);

  const mastery = useMemo(() => deriveMastery(practice.attempts, catalog?.problems ?? [], memory.events), [catalog, memory.events, practice.attempts]);
  const dailyPlan = useMemo(() => buildDailyPlan({ catalog: catalog?.problems ?? [], mastery, attempts: practice.attempts, progress }), [catalog, mastery, practice.attempts, progress]);
  const agentDecision = useMemo(() => orchestrateLearning({ profile: memory.profile, events: memory.events, catalog: catalog?.problems ?? [], mastery, attempts: practice.attempts, progress }), [catalog, mastery, memory, practice.attempts, progress]);
  const reviewCards = useMemo(() => buildMistakeReviewCards(practice.attempts, catalog?.problems ?? []), [catalog, practice.attempts]);
  const masteredCount = Object.values(progress.problems).filter((entry) => entry.status === 'mastered').length;
  const evidenceCount = practice.attempts.filter((attempt) => attempt.mode === 'sample-submit').length;

  useEffect(() => {
    if (!learningApiUrl) { setRemoteDecision(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => { void (async () => {
      let synchronized = await syncLearnerProfile(learningApiUrl, memory.profile);
      for (let index = 0; synchronized && index < memory.events.length && !controller.signal.aborted; index += 100) {
        synchronized = await syncLearningEventsBatch(learningApiUrl, memory.profile.learnerId, memory.events.slice(index, index + 100));
      }
      if (controller.signal.aborted || !synchronized) { if (!controller.signal.aborted) setRemoteDecision(null); return; }
      const decision = await requestRemotePlan(learningApiUrl, {
        learnerId: memory.profile.learnerId,
        now: agentDecision.generatedAt,
        candidates: agentDecision.actions.map((action) => ({ problemId: action.problemId, title: action.title, skillId: action.skillId })),
      }, fetch, controller.signal);
      if (!controller.signal.aborted) setRemoteDecision(decision);
    })(); }, 750);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [agentDecision, evidenceCount, learningApiUrl, memory]);

  function persist(next: ProgressState) { setProgress(next); saveProgress(window.localStorage, next); }
  function persistPractice(next: PracticeState) { setPractice(next); savePractice(window.localStorage, next); }
  function persistMemory(next: LearnerMemory) { setMemory(next); saveLearnerMemory(window.localStorage, next); }
  function persistExam(next: ExamSession) { setExam(next); saveExam(window.localStorage, next); }
  function mutatePractice(transform: (current: PracticeState) => PracticeState) {
    setPractice((current) => { const next = transform(current); savePractice(window.localStorage, next); return next; });
  }
  function recordSignal(signal: LearningSignal) {
    setMemory((current) => {
      const next = recordLearningSignal(current, signal);
      saveLearnerMemory(window.localStorage, next);
      return next;
    });
  }
  function saveProfile(patch: Parameters<typeof updateLearnerProfile>[1]) {
    const next = updateLearnerProfile(memory, patch);
    persistMemory(next);
  }

  async function startExam() {
    if (!catalog || startingExam) return;
    setStartingExam(true);
    try {
      const candidates = selectExamProblems(catalog.problems.filter((item) => reviewedPublicSampleCasesForProblem(item).length), 3);
      const selected = (await Promise.all(candidates.map((item) => loadProblem(item.id).catch(() => null)))).filter((item): item is ProblemRecord => Boolean(item));
      if (!selected.length) { window.alert('当前题库没有包含可判定公开样例的完整题目。'); return; }
      const next = createExamSession(selected.map((item) => item.id), 90);
      setExamProblems(Object.fromEntries(selected.map((item) => [item.id, item])));
      persistExam(next);
      recordTelemetry(window.localStorage, { name: 'exam-start', outcome: `${selected.length}-problems` });
      navigate({ name: 'exam-session' });
    } finally { setStartingExam(false); }
  }

  function exportBackup() {
    const url = URL.createObjectURL(new Blob([exportLearningBackup(progress, practice, memory)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'od-learning-backup-v2.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const mode = window.confirm('确定用备份完全覆盖当前学习进度吗？\n选择“取消”将按更新时间合并。') ? 'replace' : 'merge';
      const imported = importLearningBackup(await file.text(), mode, progress, practice, memory);
      persist(imported.progress);
      persistPractice(imported.practice);
      persistMemory(imported.memory);
      window.alert(mode === 'replace' ? '学习记录与代码草稿已覆盖导入。' : '学习记录与代码草稿已合并导入。');
    } catch (error) {
      window.alert(error instanceof Error ? `导入失败：${error.message}` : '导入失败：备份格式无效。');
    } finally { if (importRef.current) importRef.current.value = ''; }
  }

  if (!catalog) return <main className="loading-screen"><div className="loading-brand"><span>OD</span><strong>学习教练</strong></div>{catalogError ? <p className="error-banner">{catalogError}</p> : <p>正在加载你的学习空间…</p>}</main>;

  if (route.name === 'exam-session') return <main className="exam-mode">{exam
    ? <ExamWorkspace session={exam} problems={examProblems} onChange={persistExam} onExit={() => navigate({ name: 'exam' })} onRestart={startExam} />
    : <section className="exam-missing"><strong>还没有可恢复的模拟考试</strong><p>先返回考试页开始一场新考试。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'exam' })}>返回模拟考试</button></section>}
  </main>;

  if (route.name === 'problem') return <main className="problem-mode">
    <header className="workspace-topbar"><button type="button" onClick={() => navigate({ name: 'problems' })}>← 返回题库</button><div><span className="workspace-logo">OD</span><strong>题目工作台</strong></div><span>草稿自动保存</span></header>
    <div className="problem-page">{problemError && <p className="error-banner">{problemError}</p>}{!problem && !problemError && <p className="loading">正在打开题目…</p>}{problem && <ProblemReader
      learnerId={memory.profile.learnerId}
      problem={problem}
      entry={progress.problems[problem.id]}
      drafts={practice.drafts}
      attempts={practice.attempts.filter((attempt) => attempt.problemId === problem.id)}
      mastery={mastery}
      isAttemptAssisted={(attempt) => isAssistedPass(attempt, practice.attempts, memory.events)}
      onUpdate={(patch) => persist(updateProgress(progress, problem.id, patch))}
      onDraftChange={(language, sourceCode) => mutatePractice((current) => updateDraft(current, problem.id, language, sourceCode))}
      onAttempt={(attempt: PracticeAttempt) => {
        mutatePractice((current) => recordAttempt(current, attempt));
        recordSignal({ kind: 'attempt-recorded', problemId: problem.id, attemptId: attempt.id, data: { outcome: attempt.outcome, skillIds: problem.skills } });
        const activeDecision = remoteDecision ?? agentDecision;
        if (attempt.mode === 'sample-submit' && attempt.outcome === 'passed' && activeDecision.actions[0]?.type === 'mastery-check' &&
          activeDecision.actions[0].problemId === problem.id && !isAssistedPass(attempt, practice.attempts, memory.events)) {
          recordSignal({ kind: 'mastery-check-passed', problemId: problem.id, attemptId: attempt.id, data: { skillIds: problem.skills } });
        }
      }}
      onLearningSignal={recordSignal}
      remediation={(() => {
        const catalogProblem = catalog.problems.find((item) => item.id === problem.id);
        const recommendation = catalogProblem ? remediationLessonFor(catalogProblem, practice.attempts, memory.events) : null;
        return recommendation ? { lessonId: recommendation.lesson.id, title: recommendation.lesson.title, reason: recommendation.reason } : null;
      })()}
      onLearn={(lessonId) => navigate({ name: 'learn', lessonId })}
    />}</div>
  </main>;

  if (route.name === 'learn') {
    const lesson = getFoundationLesson(route.lessonId);
    const lessonState = lesson ? deriveLessonProgress(memory.events).get(lesson.id)?.state : undefined;
    const transferProblem = lesson ? findTransferProblem(lesson, catalog.problems, (item) => reviewedPublicSampleCasesForProblem(item).length > 0) : null;
    return <AppShell activeRoute="paths" onExport={exportBackup} onImport={() => importRef.current?.click()}>
      {lesson && lessonState !== 'locked' ? <LessonPage lesson={lesson} transferProblem={transferProblem} onSignal={recordSignal} onOpenProblem={(problemId) => navigate({ name: 'problem', problemId })} />
        : lesson ? <section className="module-page"><div className="empty-panel"><h1>先完成前置小课</h1><p>这一节依赖前面的程序直觉。按顺序学习，系统才能判断你是否真的掌握。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'paths' })}>查看学习地图</button></div></section>
        : <section className="module-page"><div className="empty-panel"><h1>没有找到这节课</h1><p>课程地址可能已经变化，请回到学习中心继续。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'paths' })}>返回学习中心</button></div></section>}
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
    </AppShell>;
  }

  const activeRoute = route.name as ModuleRouteName;
  const openProblem = (problemId: string) => navigate({ name: 'problem', problemId });
  let page;
  switch (activeRoute) {
    case 'problems': page = <ProblemsPage catalog={catalog.problems} progress={progress} onOpen={openProblem} />; break;
    case 'paths': page = <PathsPage catalog={catalog.problems} progress={progress} events={memory.events} onOpen={openProblem} onLearn={(lessonId) => navigate({ name: 'learn', lessonId })} />; break;
    case 'review': page = <ReviewPage cards={reviewCards} onOpen={openProblem} />; break;
    case 'exam': page = <ExamPage exam={exam} starting={startingExam} onStart={() => void startExam()} onContinue={() => navigate({ name: 'exam-session' })} />; break;
    case 'insights': page = <InsightsPage mastery={mastery} />; break;
    default: page = <TodayPage plan={dailyPlan} decision={remoteDecision ?? agentDecision} profile={memory.profile} onSaveProfile={saveProfile} foundationLesson={nextFoundationLesson(deriveLessonProgress(memory.events))} onLearn={(lessonId) => navigate({ name: 'learn', lessonId })} evidenceCount={evidenceCount} reviewCount={reviewCards.filter((card) => card.due).length} completedCount={masteredCount} onOpen={openProblem} />;
  }

  return <AppShell activeRoute={activeRoute} onExport={exportBackup} onImport={() => importRef.current?.click()}>
    {page}
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
  </AppShell>;
}

export default App;

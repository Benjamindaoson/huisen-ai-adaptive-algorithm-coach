import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { RouteLoadingBoundary } from './components/RouteLoadingBoundary';
import { exportLearningBackup, importLearningBackup } from './lib/backup';
import { type Catalog, loadCatalog, loadProblem, loadProblemAlias, type ProblemRecord } from './lib/catalog';
import { buildDailyPlan } from './lib/daily-plan';
import { loadLearnerMemory, parseLearnerMemory, recordLearningSignal, saveLearnerMemory, updateLearnerProfile, type LearnerMemory, type LearningSignal } from './lib/learner-memory';
import { requestRemotePlan, resolveLearningApiUrl, syncLearnerProfile, syncLearningEventsBatch } from './lib/learning-client';
import { orchestrateLearning, type AgentDecision } from './lib/learning-orchestrator';
import { createExamSession, EXAM_STORAGE_KEY, loadExam, saveExam, type ExamMode, type ExamSession } from './lib/exam';
import { selectExamProblems } from './lib/exam-selection';
import { deriveMastery } from './lib/mastery';
import { isAssistedPass } from './lib/learning-evidence';
import { buildMistakeReviewCards } from './lib/mistake-review';
import { loadPractice, recordAttempt, savePractice, updateDraft, type PracticeAttempt, type PracticeState } from './lib/practice';
import { loadProgress, saveProgress, updateProgress, type ProgressState } from './lib/progress';
import { navigate, parseHashRoute, type AppRoute, type ModuleRouteName } from './lib/routes';
import { reviewedPublicSampleCasesForProblem } from './lib/testcase';
import { recordTelemetry } from './lib/telemetry';
import { TodayPage } from './pages/TodayPage';
import { FOUNDATION_LESSONS, getFoundationLesson } from './lib/foundation-curriculum';
import { STARTER_ALGORITHM_LESSONS } from './lib/starter-algorithm-curriculum';
import { activeTransferForProblem, deriveLessonProgress, findTransferProblem, nextFoundationLesson, remediationLessonFor, verifiedTransferReceiptForProblem, verifiedTransferSignalFor } from './lib/lesson-progress';
import { isStarterLessonUnlocked, nextStarterLesson } from './lib/first-minute-learning';
import { loadQualityReviewState, saveQualityReviewState, type QualityComparison, type QualityReviewState, type TeacherReviewInput } from './lib/quality-review';
import { fetchQualityWorkbench, submitQualityReview, type QualityWorkbench } from './lib/quality-review-client';
import { loadPedagogicalMemory, pedagogicalDraftsFromAttempt, pedagogicalEditDraft, recordPedagogicalDraft, recordPedagogicalSignal, savePedagogicalMemory, type PedagogicalEventDraft, type PedagogicalMemory } from './lib/pedagogical-memory';
import { projectPedagogicalEvents } from './lib/learning-projection';
import { buildDelayedReviewQueue, selectDelayedReviewProblem, type DelayedReviewAssignment } from './lib/delayed-review';
import { MentorDock } from './components/MentorDock';
import { buildMentorRouteContext, mentorWorkspaceKey } from './lib/mentor-context';
import { projectMentorNextAction } from './lib/projected-learning-action';
import { projectLessonHandoff, projectLessonHandoffFeedback, projectLessonRecoveryContext } from './lib/lesson-handoff';
import { activeMentorOSForRoute, loadMentorOSState, saveMentorOSState, type MentorOSBackupState } from './lib/mentor-os-state';
import { AccountPanel } from './components/AccountPanel';
import { createPlatformClient, resolvePlatformApiUrl, type LearningStateKind, type PlatformBootstrap, type PlatformSession } from './lib/platform-client';
import { createPlatformOutbox, planLocalMigration, sha256Source } from './lib/platform-outbox';
import { submitAndPoll } from './lib/durable-submission-client';
import { adoptAuthoritativeLearning, mergeAppendOnlyLearningEvents } from './lib/server-authority';
import { buildPracticumHarness, parsePracticumTestOutput, PROJECT_PRACTICUMS } from './lib/project-practicum';
import { runCode } from './lib/runner-client';
import { buildLearningEffectEvidence } from './lib/learning-effect-evidence';
import { buildBridgePlan, nextBridgeTrainingLesson } from './lib/bridge-journey';
import { projectSyncIssue, type SyncIssue, type SyncRetryResult } from './lib/sync-recovery';
import { createPlatformSyncOrchestrator } from './lib/platform-synchronization';
import { acknowledgePlatformBootstrap } from './lib/platform-acknowledgements';
import './App.css';

const ExamWorkspace = lazy(() => import('./components/ExamWorkspace').then((module) => ({ default: module.ExamWorkspace })));
const ProblemReader = lazy(() => import('./components/ProblemReader').then((module) => ({ default: module.ProblemReader })));
const ExamPage = lazy(() => import('./pages/ExamPage').then((module) => ({ default: module.ExamPage })));
const InsightsPage = lazy(() => import('./pages/InsightsPage').then((module) => ({ default: module.InsightsPage })));
const PathsPage = lazy(() => import('./pages/PathsPage').then((module) => ({ default: module.PathsPage })));
const ProblemsPage = lazy(() => import('./pages/ProblemsPage').then((module) => ({ default: module.ProblemsPage })));
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((module) => ({ default: module.ReviewPage })));
const LessonPage = lazy(() => import('./pages/LessonPage').then((module) => ({ default: module.LessonPage })));
const TrainingCabinPage = lazy(() => import('./pages/TrainingCabinPage').then((module) => ({ default: module.TrainingCabinPage })));
const QualityWorkbenchPage = lazy(() => import('./pages/QualityWorkbenchPage').then((module) => ({ default: module.QualityWorkbenchPage })));
const ProjectPracticumPage = lazy(() => import('./pages/ProjectPracticumPage').then((module) => ({ default: module.ProjectPracticumPage })));
const TrustCenterPage = lazy(() => import('./pages/TrustCenterPage').then((module) => ({ default: module.TrustCenterPage })));

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
  const [qualityReviews, setQualityReviews] = useState<QualityReviewState>(() => loadQualityReviewState(window.localStorage));
  const [qualityWorkbench, setQualityWorkbench] = useState<QualityWorkbench | null>(null);
  const [pedagogicalMemory, setPedagogicalMemory] = useState<PedagogicalMemory>(() => loadPedagogicalMemory(window.localStorage));
  const [mentorOS, setMentorOS] = useState<MentorOSBackupState>(() => loadMentorOSState(window.localStorage));
  const [activeDelayedReview, setActiveDelayedReview] = useState<DelayedReviewAssignment | null>(null);
  const [remoteDecision, setRemoteDecision] = useState<AgentDecision | null>(null);
  const learningApiUrl = resolveLearningApiUrl();
  const platformApiUrl = resolvePlatformApiUrl();
  const runnerUrl = (import.meta.env.VITE_RUNNER_URL ?? platformApiUrl).trim();
  const platformClient = useMemo(() => createPlatformClient({ baseUrl: platformApiUrl }), [platformApiUrl]);
  const platformSynchronizer = useMemo(() => createPlatformSyncOrchestrator({ storage: window.localStorage, client: platformClient }), [platformClient]);
  const [platformSession, setPlatformSession] = useState<PlatformSession>({ authenticated: false });
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>(platformApiUrl ? 'syncing' : 'local');
  const [syncIssue, setSyncIssue] = useState<SyncIssue | null>(null);
  const stateVersionsRef = useRef<Partial<Record<LearningStateKind, number>>>({});
  const importRef = useRef<HTMLInputElement>(null);
  const openedProblemRef = useRef('');

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((error: unknown) => setCatalogError(error instanceof Error ? error.message : '题库索引加载失败'));
    const onHashChange = () => setRoute(parseHashRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const adoptServerBootstrap = useCallback((userId: string, bootstrap: PlatformBootstrap) => {
    setMemory((current) => {
      const profile = (bootstrap.profile ?? { ...current.profile, learnerId: userId }) as LearnerMemory['profile'];
      const remoteMemory = parseLearnerMemory({ version: 1, profile: { ...profile, learnerId: userId }, events: bootstrap.events });
      const events = mergeAppendOnlyLearningEvents(current.events, remoteMemory.events, userId);
      const nextMemory = parseLearnerMemory({ version: 1, profile: { ...profile, learnerId: userId }, events });
      saveLearnerMemory(window.localStorage, nextMemory);
      return nextMemory;
    });
    const authority = adoptAuthoritativeLearning(practice, bootstrap);
    Object.assign(stateVersionsRef.current, authority.versions);
    setProgress(authority.progress); saveProgress(window.localStorage, authority.progress);
    setPractice(authority.practice); savePractice(window.localStorage, authority.practice);
    setExam(authority.exam);
    if (authority.exam) saveExam(window.localStorage, authority.exam); else window.localStorage.removeItem(EXAM_STORAGE_KEY);
  }, [practice]);

  async function upgradeAndBootstrap(userId: string) {
    const sourceLearnerId = memory.profile.learnerId;
    const outbox = createPlatformOutbox(window.localStorage);
    if (sourceLearnerId !== userId) {
      const idempotencyKey = `claim-${sourceLearnerId}-${userId}`.replace(/[^A-Za-z0-9._:-]/g, '-').slice(0, 200);
      await platformClient.claimAnonymous(sourceLearnerId, idempotencyKey);
      const migration = await planLocalMigration({
        learnerId: sourceLearnerId, targetLearnerId: userId,
        profile: memory.profile as unknown as Record<string, unknown>, events: memory.events as unknown as Array<Record<string, unknown>>,
        progress: progress as unknown as Record<string, unknown>, practice: practice as unknown as Parameters<typeof planLocalMigration>[0]['practice'],
        exam: exam as unknown as Record<string, unknown> | null,
      }, sha256Source);
      outbox.reconcileMigration(sourceLearnerId, migration.operations.map((operation) => operation.id));
      for (const operation of migration.operations) outbox.enqueue(operation);
      const flushed = await outbox.flush(platformClient);
      if (flushed.remaining) throw new Error(`本机学习记录已保留，云端合并将在网络恢复后重试（${flushed.blockedBy ?? 'unknown'}: ${flushed.error ?? 'unknown'}）`);
    }
    const bootstrap = await platformClient.bootstrap(userId);
    await acknowledgePlatformBootstrap(window.localStorage, userId, bootstrap);
    adoptServerBootstrap(userId, bootstrap);
    setSyncIssue(null); setSyncStatus('synced');
  }

  useEffect(() => {
    if (!platformApiUrl) { setSyncStatus('local'); return; }
    let active = true;
    void platformClient.restoreSession().then(async (session) => {
      if (!active) return;
      if (session.authenticated && session.account) await upgradeAndBootstrap(session.account.id);
      if (active) { setPlatformSession(session); setSyncStatus(session.authenticated ? 'synced' : 'local'); }
    }).catch(() => { if (active) { setSyncIssue(projectSyncIssue({ remaining: 1 })); setSyncStatus('error'); } });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot startup migration intentionally uses the mounted local snapshot
  }, [platformApiUrl, platformClient]);

  const synchronizePlatform = useCallback(async (): Promise<SyncRetryResult> => {
    const userId = platformSession.account?.id;
    if (!platformSession.authenticated || !userId) return { status: 'pending', issue: projectSyncIssue({ remaining: 1 }) };
    setSyncStatus('syncing');
    const result = await platformSynchronizer.run({
      learnerId: userId, memory, progress, practice, exam,
      expectedStateVersions: { ...stateVersionsRef.current },
    });
    Object.assign(stateVersionsRef.current, result.stateVersions);
    if (result.conflicts.length) {
      const bootstrap = await platformClient.bootstrap(userId);
      await acknowledgePlatformBootstrap(window.localStorage, userId, bootstrap);
      adoptServerBootstrap(userId, bootstrap);
    }
    if (result.status === 'pending') {
      setSyncIssue(result.issue); setSyncStatus('error');
      return { status: 'pending', issue: result.issue };
    }
      setSyncIssue(null); setSyncStatus('synced');
      return { status: 'synced' };
  }, [adoptServerBootstrap, exam, memory, platformClient, platformSession, platformSynchronizer, practice, progress]);

  useEffect(() => {
    if (!platformSession.authenticated || !platformSession.account?.id) return;
    const timer = window.setTimeout(() => { void synchronizePlatform(); }, 700);
    return () => window.clearTimeout(timer);
  }, [platformSession.account?.id, platformSession.authenticated, synchronizePlatform]);

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

  useEffect(() => {
    if (!problem || route.name !== 'problem' || openedProblemRef.current === problem.id) return;
    openedProblemRef.current = problem.id;
    setPedagogicalMemory((current) => {
      const next = recordPedagogicalDraft(current, memory.profile.learnerId, {
        kind: 'problem-opened', problemId: problem.id, skillIds: (problem.skills ?? []).slice(0, 8), evidenceRefs: [`problem:${problem.id}`], data: {},
      }, new Date(), `problem-opened-${problem.id}-${Date.now()}`);
      savePedagogicalMemory(window.localStorage, next);
      return next;
    });
  }, [memory.profile.learnerId, problem, route.name]);

  useEffect(() => {
    if (exam?.status === 'running' && exam.mode === 'independent' && route.name !== 'exam-session' && route.name !== 'exam') {
      navigate({ name: 'exam-session' });
    }
  }, [exam, route.name]);

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
  const pedagogicalProjection = useMemo(() => projectPedagogicalEvents(pedagogicalMemory.events), [pedagogicalMemory.events]);
  const delayedReviews = useMemo(() => buildDelayedReviewQueue(pedagogicalMemory.events), [pedagogicalMemory.events]);
  const delayedReviewAssignments = useMemo(() => delayedReviews.map((item) => ({
    ...item, reviewProblemId: selectDelayedReviewProblem(item, catalog?.problems ?? [])?.id ?? null,
  })), [catalog?.problems, delayedReviews]);
  const learningEffectEvidence = useMemo(() => buildLearningEffectEvidence({
    teacherEvidence: {
      eligibleCount: qualityWorkbench?.qualityGate?.eligibleRealCaseCount ?? 0,
      minimum: qualityWorkbench?.qualityGate?.minimumEligibleRealCases ?? 100,
      caseRefs: (qualityWorkbench?.teacherReviews ?? []).map((review) => `case:${review.caseId}`),
    },
    learningEvents: memory.events,
    pedagogicalEvents: pedagogicalMemory.events,
    now: new Date(),
  }), [memory.events, pedagogicalMemory.events, qualityWorkbench]);
  const mentorContext = useMemo(() => buildMentorRouteContext(route, {
    ref: route.name === 'problem' ? route.problemId : route.name === 'learn' || route.name === 'training' ? route.lessonId : route.name === 'practicum-project' ? route.projectId : route.name === 'exam-session' ? exam?.id ?? 'exam' : route.name,
    evidenceCount,
    nextAction: projectMentorNextAction(route, memory.events, evidenceCount),
  }), [evidenceCount, exam?.id, memory.events, route]);
  const mentorRouteKey = mentorWorkspaceKey(mentorContext.route);
  const scopedMentorOS = activeMentorOSForRoute(mentorOS, memory.profile.learnerId, mentorRouteKey);

  function persistMentorOS(next: MentorOSBackupState) {
    setMentorOS(next);
    saveMentorOSState(window.localStorage, next);
  }

  const mentorGoal = memory.profile.target === 'foundation' ? '从零基础独立掌握算法' : '通过算法初试';
  const accountControl = <AccountPanel session={platformSession} syncStatus={syncStatus} syncIssue={syncIssue} onRetrySync={synchronizePlatform} onSignIn={signInPlatform} onRegister={registerPlatform} onVerify={(token) => platformClient.verifyEmail(token).then(() => undefined)} onSignOut={signOutPlatform} />;
  const mentorDock = (suppressed = false, headless = false) => suppressed ? null : <MentorDock
    baseUrl={learningApiUrl}
    learnerId={memory.profile.learnerId}
    goal={mentorGoal}
    route={mentorContext.route}
    contribution={mentorContext.contribution}
    headless={headless}
    state={mentorOS}
    onStateChange={persistMentorOS}
  />;

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

  useEffect(() => {
    if (!['quality', 'insights'].includes(route.name) || !learningApiUrl) { setQualityWorkbench(null); return; }
    const controller = new AbortController();
    void fetchQualityWorkbench(learningApiUrl, fetch, controller.signal).then((workbench) => {
      if (!controller.signal.aborted) setQualityWorkbench(workbench);
    });
    return () => controller.abort();
  }, [learningApiUrl, route.name]);

  function persist(next: ProgressState) { setProgress(next); saveProgress(window.localStorage, next); }
  function persistPractice(next: PracticeState) { setPractice(next); savePractice(window.localStorage, next); }
  function persistMemory(next: LearnerMemory) { setMemory(next); saveLearnerMemory(window.localStorage, next); }
  function persistExam(next: ExamSession) { setExam(next); saveExam(window.localStorage, next); }
  async function signInPlatform(input: { email: string; password: string }) {
    if (!platformApiUrl) throw new Error('尚未配置服务端地址');
    setSyncStatus('syncing');
    const session = await platformClient.signIn(input);
    await upgradeAndBootstrap(session.account.id);
    setPlatformSession({ authenticated: true, account: session.account });
  }
  async function registerPlatform(input: { email: string; password: string }) {
    if (!platformApiUrl) throw new Error('尚未配置服务端地址');
    return (await platformClient.register(input)).developmentVerificationToken;
  }
  async function signOutPlatform() {
    await platformClient.signOut();
    setPlatformSession({ authenticated: false });
    setSyncIssue(null); setSyncStatus('local');
  }
  function mutatePractice(transform: (current: PracticeState) => PracticeState) {
    setPractice((current) => { const next = transform(current); savePractice(window.localStorage, next); return next; });
  }
  function recordSignal(signal: LearningSignal, pedagogicalDrafts?: PedagogicalEventDraft[]) {
    const now = new Date();
    setMemory((current) => {
      const next = recordLearningSignal(current, signal, now);
      saveLearnerMemory(window.localStorage, next);
      return next;
    });
    setPedagogicalMemory((current) => {
      const next = pedagogicalDrafts
        ? pedagogicalDrafts.reduce((state, draft, index) => recordPedagogicalDraft(state, memory.profile.learnerId, draft, now, `ped-${now.getTime()}-${current.events.length + index}`), current)
        : recordPedagogicalSignal(current, memory.profile.learnerId, signal, now);
      savePedagogicalMemory(window.localStorage, next);
      return next;
    });
  }
  async function recordTeacherReview(comparison: QualityComparison, input: TeacherReviewInput) {
    if (!learningApiUrl) return;
    const selected = comparison.candidates.find((candidate) => candidate.hash === input.preferredHash);
    const review = await submitQualityReview(learningApiUrl, {
      id: `review-${crypto.randomUUID()}`,
      comparisonId: comparison.id,
      ...input,
      evidenceRefs: [...new Set([...(selected?.evidenceRefs ?? []), ...comparison.evidence.toolCalls.map((tool) => tool.resultHash)])],
    });
    if (!review) return;
    const refreshed = await fetchQualityWorkbench(learningApiUrl);
    if (refreshed) setQualityWorkbench(refreshed);
    setQualityReviews((current) => {
      const next = { ...current, teacherReviews: [...current.teacherReviews.filter((item) => item.id !== review.id), review] };
      saveQualityReviewState(window.localStorage, next);
      return next;
    });
  }
  function saveProfile(patch: Parameters<typeof updateLearnerProfile>[1]) {
    const next = updateLearnerProfile(memory, patch);
    persistMemory(next);
  }

  async function startExam(mode: ExamMode = 'independent') {
    if (!catalog || startingExam) return;
    setStartingExam(true);
    try {
      const useHiddenJudging = platformSession.authenticated;
      const hiddenPacks = useHiddenJudging ? await platformClient.availableJudgePacks() : [];
      const candidates = useHiddenJudging
        ? selectExamProblems(catalog.problems, 3, { eligibleIds: new Set(hiddenPacks.map((item) => item.problemId)) })
        : selectExamProblems(catalog.problems.filter((item) => reviewedPublicSampleCasesForProblem(item).length), 3);
      const selected = (await Promise.all(candidates.map((item) => loadProblem(item.id).catch(() => null)))).filter((item): item is ProblemRecord => Boolean(item));
      if (!selected.length) { window.alert(useHiddenJudging ? '当前账号没有可用于隐藏判题考试的可信题包。' : '当前题库没有包含可判定公开样例的完整题目。'); return; }
      const startedAt = Date.now();
      const next = createExamSession(selected.map((item) => item.id), 90, startedAt, `exam-${startedAt}`, mode);
      setExamProblems(Object.fromEntries(selected.map((item) => [item.id, item])));
      persistExam(next);
      recordTelemetry(window.localStorage, { name: 'exam-start', outcome: `${selected.length}-problems` });
      navigate({ name: 'exam-session' });
    } finally { setStartingExam(false); }
  }

  function exportBackup() {
    const url = URL.createObjectURL(new Blob([exportLearningBackup(progress, practice, memory, new Date(), pedagogicalMemory, qualityReviews, mentorOS)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'algorithm-learning-backup-v5.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteCloudLearningData() {
    const learnerId = platformSession.account?.id;
    if (!learnerId || !platformSession.authenticated || !window.confirm('这会申请删除云端学习档案、事件、作答与 Mentor 历史。确定继续吗？')) return;
    try {
      await platformClient.deleteLearner(learnerId);
      window.alert('云端删除请求已由服务端确认。当前浏览器备份仍由你控制。');
    } catch (error) { window.alert(error instanceof Error ? `删除未完成：${error.message}` : '删除未完成，请稍后再试。'); }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const mode = window.confirm('确定用备份完全覆盖当前学习进度吗？\n选择“取消”将按更新时间合并。') ? 'replace' : 'merge';
      const imported = importLearningBackup(await file.text(), mode, progress, practice, memory, pedagogicalMemory, qualityReviews, mentorOS);
      persist(imported.progress);
      persistPractice(imported.practice);
      persistMemory(imported.memory);
      setPedagogicalMemory(imported.pedagogicalMemory);
      savePedagogicalMemory(window.localStorage, imported.pedagogicalMemory);
      setQualityReviews(imported.qualityReviews);
      saveQualityReviewState(window.localStorage, imported.qualityReviews);
      persistMentorOS(imported.mentorOS);
      window.alert(mode === 'replace' ? '学习记录与代码草稿已覆盖导入。' : '学习记录与代码草稿已合并导入。');
    } catch (error) {
      window.alert(error instanceof Error ? `导入失败：${error.message}` : '导入失败：备份格式无效。');
    } finally { if (importRef.current) importRef.current.value = ''; }
  }

  if (!catalog) return <main className="loading-screen"><div className="loading-brand"><span>汇</span><strong>汇森AI 算法教练</strong></div>{catalogError ? <p className="error-banner">{catalogError}</p> : <p>正在加载你的学习空间…</p>}</main>;

  if (exam?.status === 'running' && exam.mode === 'independent' && route.name !== 'exam-session' && route.name !== 'exam') {
    return <main className="loading-screen"><p>无 AI 考试进行中，正在返回受限考试空间…</p></main>;
  }

  if (route.name === 'exam-session') return <main className="exam-mode">{exam
    ? <RouteLoadingBoundary><ExamWorkspace session={exam} problems={examProblems} onChange={persistExam} onExit={() => navigate({ name: 'exam' })} onRestart={startExam}
      submitHidden={platformSession.authenticated ? (input) => submitAndPoll(platformClient, input) : undefined} /></RouteLoadingBoundary>
    : <section className="exam-missing"><strong>还没有可恢复的模拟考试</strong><p>先返回考试页开始一场新考试。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'exam' })}>返回模拟考试</button></section>}
    {exam?.mode === 'ai-collaboration' && mentorDock(false)}
  </main>;

  if (route.name === 'problem') {
    const independentAssessment = Boolean(activeDelayedReview?.reviewProblemId === problem?.id || (problem && activeTransferForProblem(memory.events, problem.id)));
    const verifiedTransferReceipt = problem ? verifiedTransferReceiptForProblem(memory.events, problem.id) : null;
    const verifiedTransferLesson = verifiedTransferReceipt ? getFoundationLesson(verifiedTransferReceipt.lessonId) : null;
    return <main className="problem-mode">
    <header className="workspace-topbar"><button type="button" onClick={() => navigate({ name: 'problems' })}>← 返回题库</button><div><span className="workspace-logo">汇</span><strong>汇森AI 训练工作台</strong></div><span>草稿自动保存</span>{accountControl}</header>
    {mentorDock(independentAssessment, true)}
    <div className="problem-page">{problemError && <p className="error-banner">{problemError}</p>}{!problem && !problemError && <p className="loading">正在打开题目…</p>}{problem && <RouteLoadingBoundary><ProblemReader
      learnerId={memory.profile.learnerId}
      problem={problem}
      entry={progress.problems[problem.id]}
      drafts={practice.drafts}
      attempts={practice.attempts.filter((attempt) => attempt.problemId === problem.id)}
      mastery={mastery}
      isAttemptAssisted={(attempt) => isAssistedPass(attempt, practice.attempts, memory.events)}
      independentAssessment={independentAssessment}
      onUpdate={(patch) => persist(updateProgress(progress, problem.id, patch))}
      onDraftChange={(language, sourceCode) => mutatePractice((current) => updateDraft(current, problem.id, language, sourceCode))}
      onAttempt={(attempt: PracticeAttempt) => {
        const previousAttempt = [...practice.attempts].reverse().find((item) => item.problemId === problem.id && item.language === attempt.language);
        const editDraft = previousAttempt ? pedagogicalEditDraft(previousAttempt.codeSnapshot, attempt.codeSnapshot, problem.id, previousAttempt.id, problem.skills ?? []) : null;
        const delayedReviewDraft: PedagogicalEventDraft | null = activeDelayedReview?.reviewProblemId === problem.id && attempt.mode === 'sample-submit' ? {
          kind: 'review-recorded', problemId: problem.id, attemptId: attempt.id, skillIds: [activeDelayedReview.skillId],
          evidenceRefs: [`attempt:${attempt.id}`, `review:${activeDelayedReview.transferEventId}`],
          data: { outcome: attempt.outcome, reviewed: true },
        } : null;
        const pedagogicalDrafts = [...(editDraft ? [editDraft] : []), ...pedagogicalDraftsFromAttempt(attempt, problem.skills ?? []), ...(delayedReviewDraft ? [delayedReviewDraft] : [])];
        mutatePractice((current) => recordAttempt(current, attempt));
        recordSignal({ kind: 'attempt-recorded', problemId: problem.id, attemptId: attempt.id, data: { outcome: attempt.outcome, skillIds: problem.skills } }, pedagogicalDrafts);
        const mission = [...memory.events].reverse().find((event) => event.kind === 'first-minute-mission-seen');
        if (mission && !memory.events.some((event) => event.kind === 'first-minute-first-run')) {
          recordSignal({ kind: 'first-minute-first-run', problemId: problem.id, attemptId: attempt.id, data: { lessonId: mission.data.lessonId! } });
        }
        if (delayedReviewDraft && attempt.outcome === 'passed') setActiveDelayedReview(null);
        const transferSignal = verifiedTransferSignalFor(attempt, practice.attempts, memory.events);
        if (transferSignal) recordSignal(transferSignal);
        const activeDecision = remoteDecision ?? agentDecision;
        if (attempt.mode === 'sample-submit' && attempt.outcome === 'passed' && activeDecision.actions[0]?.type === 'mastery-check' &&
          activeDecision.actions[0].problemId === problem.id && !isAssistedPass(attempt, practice.attempts, memory.events)) {
          recordSignal({ kind: 'mastery-check-passed', problemId: problem.id, attemptId: attempt.id, data: { skillIds: problem.skills } });
        }
      }}
      onLearningSignal={recordSignal}
      verifiedTransfer={verifiedTransferReceipt ? { lessonTitle: verifiedTransferLesson?.plainTitle ?? verifiedTransferReceipt.lessonId, attemptId: verifiedTransferReceipt.attemptId, verifiedAt: verifiedTransferReceipt.verifiedAt, evidenceRefs: verifiedTransferReceipt.evidenceRefs } : null}
      onReturnToTraining={() => navigate({ name: 'today' })}
      remediation={(() => {
        const catalogProblem = catalog.problems.find((item) => item.id === problem.id);
        const recommendation = catalogProblem ? remediationLessonFor(catalogProblem, practice.attempts, memory.events) : null;
        return recommendation ? { lessonId: recommendation.lesson.id, title: recommendation.lesson.title, reason: recommendation.reason, confidence: recommendation.confidence, authority: recommendation.authority } : null;
      })()}
      onLearn={(lessonId) => navigate({ name: 'learn', lessonId, returnProblemId: problem.id })}
      mentorOS={scopedMentorOS ? { runId: scopedMentorOS.runId, cursor: scopedMentorOS.cursor } : undefined}
      mentorOSRequired={Boolean(learningApiUrl) && !independentAssessment}
      onMentorOSCheckpoint={(checkpoint) => {
        if (!scopedMentorOS) return;
        persistMentorOS({ ...mentorOS, active: { ...scopedMentorOS, cursor: checkpoint.sequence, checkpoint } });
      }}
      onOpenTransfer={(task) => {
        const lesson = FOUNDATION_LESSONS.find((item) => task.skillIds.includes(item.transfer.skillId));
        if (lesson) recordSignal({ kind: 'lesson-transfer-started', problemId: task.problemId, data: { lessonId: lesson.id, stage: 'transfer', skillIds: task.skillIds } });
        navigate({ name: 'problem', problemId: task.problemId });
      }}
      onHiddenSubmit={platformSession.authenticated?({problemId,language,sourceCode,idempotencyKey})=>submitAndPoll(platformClient,{problemVersionId:`${problemId}@starter-v1`,language,sourceCode,idempotencyKey}):undefined}
    /></RouteLoadingBoundary>}</div>
  </main>;
  }

  if (route.name === 'learn') {
    const lesson = getFoundationLesson(route.lessonId);
    const lessonState = lesson ? deriveLessonProgress(memory.events).get(lesson.id)?.state : undefined;
    const isStarterLesson = Boolean(lesson && STARTER_ALGORITHM_LESSONS.some((item) => item.id === lesson.id));
    const bridgeEntryLessonId = buildBridgePlan(memory.events)?.entryLessonId;
    const canOpenLesson = lesson
      ? (lesson.id === bridgeEntryLessonId || (isStarterLesson ? isStarterLessonUnlocked(lesson, memory.events) : lessonState !== 'locked'))
      : false;
    const transferProblem = lesson ? findTransferProblem(lesson, catalog.problems, (item) => reviewedPublicSampleCasesForProblem(item).length > 0) : null;
    const lessonHandoff = lesson ? projectLessonHandoff(lesson, memory.events) : null;
    const handoffFeedback = lessonHandoff ? projectLessonHandoffFeedback(memory.events, lessonHandoff.recommendationId)?.choice ?? null : null;
    return <AppShell activeRoute="paths" catalogCount={catalog.problems.length} onExport={exportBackup} onImport={() => importRef.current?.click()} mentor={mentorDock(true)} account={accountControl}>
      {lesson && canOpenLesson ? <RouteLoadingBoundary><LessonPage lesson={lesson} transferProblem={transferProblem} handoff={lessonHandoff} handoffFeedback={handoffFeedback} returnProblemId={route.returnProblemId} onSignal={recordSignal} onOpenProblem={(problemId) => navigate({ name: 'problem', problemId })} /></RouteLoadingBoundary>
        : lesson ? <section className="module-page"><div className="empty-panel"><h1>先完成前置小课</h1><p>这一节依赖前面的程序直觉。按顺序学习，系统才能判断你是否真的掌握。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'paths' })}>查看学习地图</button></div></section>
        : <section className="module-page"><div className="empty-panel"><h1>没有找到这节课</h1><p>课程地址可能已经变化，请回到学习中心继续。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'paths' })}>返回学习中心</button></div></section>}
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
    </AppShell>;
  }

  if (route.name === 'training') {
    const lesson = getFoundationLesson(route.lessonId);
    const returnLesson = route.returnLessonId ? getFoundationLesson(route.returnLessonId) ?? null : null;
    const recoveryContext = lesson ? projectLessonRecoveryContext(lesson.id, returnLesson, route.recommendationId, memory.events) : null;
    const isStarterLesson = Boolean(lesson && STARTER_ALGORITHM_LESSONS.some((item) => item.id === lesson.id));
    const bridgeEntryLessonId = buildBridgePlan(memory.events)?.entryLessonId;
    const lessonState = lesson ? deriveLessonProgress(memory.events).get(lesson.id)?.state : undefined;
    const canOpenLesson = Boolean(lesson && (lesson.id === bridgeEntryLessonId || (isStarterLesson ? isStarterLessonUnlocked(lesson, memory.events) : lessonState !== 'locked')));
    const transferProblem = lesson ? findTransferProblem(lesson, catalog.problems, (item) => reviewedPublicSampleCasesForProblem(item).length > 0) : null;
    return <AppShell activeRoute="today" catalogCount={catalog.problems.length} onExport={exportBackup} onImport={() => importRef.current?.click()} account={accountControl} immersive>
      {lesson && canOpenLesson ? <RouteLoadingBoundary><TrainingCabinPage lesson={lesson} events={memory.events} transferProblem={transferProblem} runnerUrl={runnerUrl} recoveryContext={recoveryContext} onReturnToLesson={recoveryContext ? () => navigate({ name: 'learn', lessonId: recoveryContext.returnLessonId }) : undefined} onSignal={recordSignal} onOpenProblem={(problemId) => navigate({ name: 'problem', problemId })} /></RouteLoadingBoundary>
        : <section className="module-page"><div className="empty-panel"><h1>先从已经解锁的训练开始</h1><p>这节训练依赖前面的算法直觉。按顺序完成，系统才能根据真实表现安排下一步。</p><button type="button" className="primary-action" onClick={() => navigate({ name: 'today' })}>回到今日训练</button></div></section>}
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
    </AppShell>;
  }

  const selectedPracticumProjectId = route.name === 'practicum-project' ? route.projectId : undefined;
  const activeRoute = (route.name === 'practicum-project' ? 'practicum' : route.name) as ModuleRouteName;
  const openProblem = (problemId: string) => navigate({ name: 'problem', problemId });
  let page;
  switch (activeRoute) {
    case 'problems': page = <ProblemsPage catalog={catalog.problems} progress={progress} onOpen={openProblem} />; break;
    case 'paths': page = <PathsPage catalog={catalog.problems} progress={progress} events={memory.events} onOpen={openProblem} onLearn={(lessonId) => navigate({ name: 'learn', lessonId })} />; break;
    case 'review': page = <ReviewPage cards={reviewCards} delayedReviews={delayedReviewAssignments} onOpen={openProblem} onOpenDelayed={(item) => {
      if (!item.reviewProblemId) return;
      setActiveDelayedReview(item);
      openProblem(item.reviewProblemId);
    }} />; break;
    case 'exam': page = <ExamPage exam={exam} starting={startingExam} hiddenJudging={platformSession.authenticated} onStart={(mode) => void startExam(mode)} onContinue={() => navigate({ name: 'exam-session' })} />; break;
    case 'practicum': {
      const project = PROJECT_PRACTICUMS.find((item) => item.id === selectedPracticumProjectId) ?? PROJECT_PRACTICUMS[0];
      const projectDraftKey = `${project.id}:javascript`;
      const initialSource = project.files.find((item) => item.editable)?.content ?? '';
      page = <ProjectPracticumPage project={project} projects={PROJECT_PRACTICUMS} events={memory.events} draft={practice.drafts[projectDraftKey]?.sourceCode ?? initialSource}
        onDraftChange={(source) => mutatePractice((current) => updateDraft(current, project.id, 'javascript', source))}
        onSignal={recordSignal}
        onRunTests={async (source) => {
          const result = await runCode(runnerUrl, { language: 'javascript', sourceCode: buildPracticumHarness(project, source), stdin: '' });
          return result.kind === 'success' ? parsePracticumTestOutput(result.stdout) : { passed: false, passedCount: 0, totalCount: 4, failures: [{ name: '运行服务', actual: result.stderr || result.kind, expected: '可执行测试结果' }] };
        }} />;
      break;
    }
    case 'insights': {
      const baselineProblem = catalog.problems.find((item) => item.completeness === 'complete' && item.languages.length > 0);
      page = <InsightsPage mastery={mastery} projection={pedagogicalProjection} learningEvents={memory.events} effectEvidence={learningEffectEvidence} onStartBaseline={baselineProblem ? () => openProblem(baselineProblem.id) : undefined} />;
      break;
    }
    case 'trust': page = <TrustCenterPage authenticated={platformSession.authenticated} apiConfigured={Boolean(platformApiUrl)} syncStatus={syncStatus}
      serverExportUrl={platformSession.account?.id ? platformClient.exportUrl(platformSession.account.id) : undefined}
      onLocalExport={exportBackup} onDelete={() => void deleteCloudLearningData()} />; break;
    case 'quality': page = <QualityWorkbenchPage
      comparisons={qualityWorkbench?.comparisons ?? []}
      realEligibleCount={qualityWorkbench?.qualityGate?.eligibleRealCaseCount ?? 0}
      importedPublicCount={qualityWorkbench?.comparisons.length ?? 0}
      reviews={qualityWorkbench?.teacherReviews ?? []}
      adjudicationQueue={qualityWorkbench?.adjudicationQueue ?? []}
      calibrations={qualityWorkbench?.calibrations ?? []}
      gateFailures={qualityWorkbench?.qualityGate?.failures ?? []}
      storage={qualityWorkbench?.storage ?? 'memory'}
      onSubmit={recordTeacherReview}
    />; break;
    default: page = <TodayPage plan={dailyPlan} decision={remoteDecision ?? agentDecision} profile={memory.profile} onSaveProfile={saveProfile} foundationLesson={nextFoundationLesson(deriveLessonProgress(memory.events))} starterLesson={evidenceCount === 0 ? nextStarterLesson(memory.events) : null} trainingLesson={nextBridgeTrainingLesson(memory.events) ?? nextStarterLesson(memory.events) ?? nextFoundationLesson(deriveLessonProgress(memory.events))} onLearn={(lessonId) => navigate({ name: 'learn', lessonId })} onStartTraining={(lessonId) => navigate({ name: 'training', lessonId })} onLearningSignal={recordSignal} onMissionSeen={(lessonId) => { if (!memory.events.some((event) => event.kind === 'first-minute-mission-seen' && event.data.lessonId === lessonId)) recordSignal({ kind: 'first-minute-mission-seen', data: { lessonId } }); }} onAcknowledgeMission={() => { const lesson = nextStarterLesson(memory.events); if (lesson && !memory.events.some((event) => event.kind === 'first-minute-mission-reason-acknowledged' && event.data.lessonId === lesson.id)) recordSignal({ kind: 'first-minute-mission-reason-acknowledged', data: { lessonId: lesson.id } }); }} events={memory.events} evidenceCount={evidenceCount} reviewCount={reviewCards.filter((card) => card.due).length} completedCount={masteredCount} onOpen={openProblem} />;
  }

  return <AppShell activeRoute={activeRoute} catalogCount={catalog.problems.length} onExport={exportBackup} onImport={() => importRef.current?.click()} mentor={mentorDock(route.name === 'today')} account={accountControl}>
    <RouteLoadingBoundary>{page}</RouteLoadingBoundary>
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => importBackup(event.target.files?.[0])} />
  </AppShell>;
}

export default App;

# APP Shell and AI Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the site as a light, route-based learning APP and make evidence-driven coaching plus reference answers the default post-submission flow.

**Architecture:** Keep the existing React/Vite local-first domain modules, add a small tested hash router, split route pages behind an App Shell, and keep problem/exam workspaces immersive. Refactor the runner feedback into focused components without changing storage, corpus, backup, or runner contracts.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Monaco Editor, CSS custom properties.

## Global Constraints

- No new runtime dependency or router library.
- Keep all existing localStorage keys and backup version compatible.
- Default UI is light; semantic colors follow the design spec.
- Public sample success must never be labeled official acceptance.
- The repository has no baseline commit; implementation checkpoints are verified with tests and diff review rather than creating commits that could accidentally capture unrelated user files.

---

### Task 1: Route model and App Shell

**Files:**
- Create: `web/src/lib/routes.ts`
- Create: `web/src/lib/routes.test.ts`
- Create: `web/src/components/AppShell.tsx`
- Create: `web/src/components/AppShell.test.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Produces: `AppRoute`, `parseHashRoute(hash)`, `hrefFor(route)`, `navigate(route)`.
- Produces: `AppShell({ activeRoute, onExport, onImport, children })`.

- [ ] Write route tests for root redirect, all six module routes, problem id decoding, exam session, and unknown route fallback.
- [ ] Run `npx vitest run web/src/lib/routes.test.ts` and confirm failures because the module does not exist.
- [ ] Implement the minimal pure route parser/builders.
- [ ] Add AppShell interaction tests for six links, active state, and backup actions; run them red.
- [ ] Implement the accessible desktop sidebar and compact mobile navigation.
- [ ] Run both new test files green.

### Task 2: Independent module pages

**Files:**
- Create: `web/src/pages/TodayPage.tsx`
- Create: `web/src/pages/ProblemsPage.tsx`
- Create: `web/src/pages/PathsPage.tsx`
- Create: `web/src/pages/ReviewPage.tsx`
- Create: `web/src/pages/ExamPage.tsx`
- Create: `web/src/pages/InsightsPage.tsx`
- Create: `web/src/pages/pages.test.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/LearningDashboard.tsx`
- Modify: `web/src/components/PathPanel.tsx`

**Interfaces:**
- Consumes: catalog, progress, practice, mastery, daily plan, review cards, exam state, and navigation callbacks already produced by `App.tsx`.
- Produces: one focused page body per module route.

- [ ] Write component tests proving Today has one primary action and does not contain the full catalog/path grid.
- [ ] Write tests proving each route page exposes its unique heading and primary action.
- [ ] Run page tests red.
- [ ] Extract existing catalog, plan, path, review, exam and skill UI into the six pages with no duplicated business rules.
- [ ] Change `App.tsx` to render exactly one module page inside AppShell.
- [ ] Run page and existing dashboard tests green.

### Task 3: Reference-answer policy

**Files:**
- Create: `web/src/lib/reference-answer.ts`
- Create: `web/src/lib/reference-answer.test.ts`
- Create: `web/src/components/ReferenceAnswer.tsx`
- Create: `web/src/components/ReferenceAnswer.test.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/lib/problem-view.ts`
- Modify: `web/src/lib/problem-view.test.ts`

**Interfaces:**
- Produces: `canOpenReference(attempts, problemId, language)` and `referenceSections(problem, language)`.
- Produces: `ReferenceAnswer` rendering thinking, complexity, and language code with explicit missing states.

- [ ] Write failing policy tests for no submit, run-only, sample-submit, wrong answer, and passed sample cases.
- [ ] Implement the policy: only sample submission bypasses the confirmation.
- [ ] Write failing component tests for confirmation, cancel, unlock, and missing content.
- [ ] Replace the old solution tab with Reference Answer and prevent eager solution rendering.
- [ ] Run reference and problem-view tests green.

### Task 4: Evidence-first post-submission feedback

**Files:**
- Create: `web/src/components/SubmissionFeedback.tsx`
- Create: `web/src/components/SubmissionFeedback.test.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/CoachPanel.tsx`
- Modify: `web/src/components/CoachPanel.interaction.test.tsx`

**Interfaces:**
- Consumes: `VisibleResult`, selected `PracticeAttempt`, problem, mastery, and coach URL.
- Produces: unified verdict/evidence/diagnosis UI with callbacks `onRetry`, `onHint`, and `onReference`.

- [ ] Write failing tests for wrong-answer evidence, compile error, public-sample pass wording, local diagnosis fallback, and the three next actions.
- [ ] Extract verdict and case presentation from RunnerPanel into SubmissionFeedback.
- [ ] Request/show level-one diagnosis after sample submission and keep stronger hints user-triggered.
- [ ] Wire Reference Answer action back to ProblemReader without duplicating unlock state.
- [ ] Run runner/coach/submission component tests green.

### Task 5: Light design token migration

**Files:**
- Create: `web/src/styles/tokens.css`
- Modify: `web/src/index.css`
- Replace: `web/src/App.css`
- Modify: `web/src/components/CodeEditor.tsx`

**Interfaces:**
- Produces primitive, semantic, and component CSS variables used throughout UI.
- Keeps component class names stable where existing tests rely on them.

- [ ] Define the complete token layers and semantic state roles.
- [ ] Convert the App Shell and six pages to the light layout.
- [ ] Convert problem, runner, coach and exam workspaces to the same light system.
- [ ] Set Monaco default to a light theme and verify editor readability.
- [ ] Add responsive rules for sidebar collapse, mobile navigation, problem stacking, and readable table/case output.
- [ ] Run lint and typecheck; repair the first meaningful failure until green.

### Task 6: End-to-end verification and intent alignment

**Files:**
- Modify if needed: implementation files identified by failing checks.
- Update: `openspec/changes/rebuild-app-navigation-learning-loop/tasks.md`

**Interfaces:**
- Produces local-run evidence and verified acceptance criteria.

- [ ] Run focused Vitest suites for routes, pages, reference answers, submission feedback and existing practice/backup/coach logic.
- [ ] Run `npm run verify` and repair failures without disabling checks.
- [ ] Start `npm --prefix web run dev -- --host 127.0.0.1`.
- [ ] In a real browser verify `#/today`, all sidebar destinations, a problem submission, coach feedback, reference-answer confirmation, and mobile layout.
- [ ] Inspect console/server logs for runtime errors.
- [ ] Review changed files for broken imports, hardcoded secrets, unnecessary dependencies, and storage incompatibilities.
- [ ] Mark each OpenSpec task only after corresponding evidence exists.

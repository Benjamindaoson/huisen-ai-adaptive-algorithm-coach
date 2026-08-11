# Zero-Foundation Algorithm Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trustworthy Python-first learning map in which a zero-foundation learner can understand, predict, complete, and transfer an algorithm concept, with durable evidence and contextual return from failed practice.

**Architecture:** A typed client curriculum is the canonical instructional spine. Lesson progress is projected from the existing local/server learning-event stream, and the current `/paths`, Today, and problem workspace consume deterministic recommendation functions. No new database, model endpoint, or runtime dependency is added.

**Tech Stack:** React 19, TypeScript 6, Vitest, Testing Library, Fastify 5, existing file/PostgreSQL learning store, CSS design tokens.

## Global Constraints

- Python is the default beginner language; algorithm explanations remain language-neutral.
- Canonical answers and examples come from reviewed typed content, never free-form model output.
- Lesson events never contain source code or free-form learner answers.
- Lesson completion does not claim mastery; only independent transfer evidence may support mastery.
- Existing problem, Mentor, Judge0, backup, and signed identity flows must remain compatible.
- Add no new runtime dependency.
- Do not create a Git commit because the repository has no tracked baseline and all project files currently appear untracked.

---

### Task 1: Trusted curriculum and deterministic projection

**Files:**
- Create: `web/src/lib/foundation-curriculum.test.ts`
- Create: `web/src/lib/foundation-curriculum.ts`
- Create: `web/src/lib/lesson-progress.test.ts`
- Create: `web/src/lib/lesson-progress.ts`

**Interfaces:**
- Produces: `FoundationLesson`, `FOUNDATION_LESSONS`, `getFoundationLesson(id)`, `validateFoundationCurriculum()`.
- Produces: `deriveLessonProgress(events)`, `nextFoundationLesson(events)`, `findTransferProblem(lesson, catalog)`, `remediationLessonFor(problem, attempts, events)`.
- Consumes: `LearningEvent`, `CatalogProblem`, `PracticeAttempt`.

- [ ] Write `foundation-curriculum.test.ts` first and assert twelve unique lessons, valid prerequisite ordering, five non-empty stages, Python completion answers, and no unknown transfer skills.
- [ ] Run `npm --prefix web test -- --run src/lib/foundation-curriculum.test.ts`; confirm failure because the module does not exist.
- [ ] Implement the typed catalog with twelve reviewed lessons: input/output, variables/state, conditions, loops, arrays/strings, functions/decomposition, complexity intuition, hash lookup, two pointers, sliding window, binary search, and queue/BFS.
- [ ] Rerun the focused test and confirm it passes.
- [ ] Write `lesson-progress.test.ts` first with literal events proving prerequisite locking, next lesson selection, transfer selection from complete runnable catalog items, and no remediation for passed/already-completed/unmapped cases.
- [ ] Run the focused test and confirm module-not-found failure.
- [ ] Implement deterministic projection and mapping without React or storage access, then rerun both tests.

### Task 2: Durable lesson event contract

**Files:**
- Modify: `web/src/lib/learner-memory.test.ts`
- Modify: `web/src/lib/learner-memory.ts`
- Modify: `services/runner/gateway/src/learning-validation.test.ts`
- Modify: `services/runner/gateway/src/learning-validation.ts`
- Modify: `services/runner/gateway/src/server.test.ts`

**Interfaces:**
- Extends: `LearningEventKind` with `lesson-started`, `lesson-checkpoint-passed`, `lesson-completed`, `lesson-transfer-started`.
- Extends: `LearningEventData` with bounded `lessonId`, `stage`, and `correct` fields.
- Preserves: `recordLearningSignal()` and `/learners/:id/events` request shapes.

- [ ] Add frontend failing tests proving valid lesson evidence parses while source code, answer text, invalid identifiers, and inconsistent correctness are rejected.
- [ ] Run `npm --prefix web test -- --run src/lib/learner-memory.test.ts`; confirm the valid event fails under the old allowlist.
- [ ] Extend frontend types and semantic validation minimally; rerun the focused test.
- [ ] Add matching gateway failing tests and one signed API persistence test that reads the event after append.
- [ ] Run `npm --prefix services/runner/gateway test -- --run src/learning-validation.test.ts src/server.test.ts`; confirm the new event is rejected before implementation.
- [ ] Extend gateway validation with identical bounds and semantics; rerun focused gateway tests and typecheck both packages.

### Task 3: Learning Map and interactive lesson

**Files:**
- Modify: `web/src/lib/routes.test.ts`
- Modify: `web/src/lib/routes.ts`
- Modify: `web/src/components/AppShell.test.tsx`
- Modify: `web/src/components/AppShell.tsx`
- Create: `web/src/components/FoundationMap.test.tsx`
- Create: `web/src/components/FoundationMap.tsx`
- Create: `web/src/pages/LessonPage.test.tsx`
- Create: `web/src/pages/LessonPage.tsx`
- Modify: `web/src/pages/PathsPage.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Adds route: `{ name: 'lesson'; lessonId: string }` ↔ `#/learn/:lessonId`.
- Produces: `<FoundationMap lessons progress nextLesson onOpen />`.
- Produces: `<LessonPage lesson events onSignal onOpenProblem catalog />`.

- [ ] Add route and AppShell failing tests for lesson encoding/parsing and the “学习地图” navigation label; run them and observe literal expectation failures.
- [ ] Implement route support and label change; rerun focused tests.
- [ ] Write FoundationMap component tests proving recommended, completed, available, and locked states are exposed through accessible text and controls.
- [ ] Run the component test and confirm module-not-found failure; implement the smallest accessible map and rerun.
- [ ] Write LessonPage interaction tests: start evidence on mount once, incorrect prediction remains at checkpoint, correct prediction records evidence/unlocks completion, wrong completion stays retryable, correct completion records evidence, transfer records evidence and invokes navigation.
- [ ] Run the component test and confirm module-not-found failure; implement the five-stage lesson using controlled local UI state and existing signal callbacks.
- [ ] Wire `/paths` and `#/learn/:lessonId` in App, preserving existing problem paths below the foundation map; add responsive light-theme styles and rerun page/component tests.

### Task 4: Today and problem remediation integration

**Files:**
- Modify: `web/src/components/LearningDashboard.test.tsx` or `web/src/pages/pages.test.tsx`
- Modify: `web/src/pages/TodayPage.tsx`
- Modify: `web/src/components/ProblemReader.test.tsx` if present, otherwise create `web/src/components/ProblemReader.remediation.test.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/MentorTimeline.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Extends Today props with optional `foundationLesson` and `onOpenLesson`.
- Extends problem/runner/Mentor props with optional `{ id, title, reason, href }` remediation.
- Consumes only deterministic lesson mapping; recommendation copy MUST say “建议补一小节” and MUST NOT claim verified diagnosis.

- [ ] Add a failing Today test proving foundation target shows the next lesson as the primary starting action while non-foundation behavior remains unchanged.
- [ ] Implement the optional lesson recommendation and rerun the focused test.
- [ ] Add a failing remediation test proving a failed mapped attempt shows one lesson link, passed attempts do not, and the failed attempt remains visible.
- [ ] Implement the bridge inside the persistent Mentor/result region, wire it from App, and rerun focused tests.
- [ ] Run all web tests and fix only regressions caused by the new contracts.

### Task 5: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`
- Create: `scripts/browser-smoke-foundation.cjs`
- Modify: `openspec/changes/build-zero-foundation-learning-loop/tasks.md`

**Interfaces:**
- Browser flow: `#/paths` → recommended lesson → correct checkpoint → correct completion → transfer problem.

- [ ] Update README with the beginner route, honest twelve-lesson scope, default Python choice, and local URL.
- [ ] Add a browser script that asserts the Learning Map, plain-language lesson content, prediction correction, completion, transfer navigation, and zero console errors; it must use accessible roles/text rather than CSS-only selectors where possible.
- [ ] Run focused tests, then `npm run verify`, gateway tests, `npx openspec validate build-zero-foundation-learning-loop --strict`, `docker compose ... config --quiet`, and dependency/secret checks.
- [ ] Start or reuse the local Vite server and gateway, run the browser smoke, and save `artifacts/foundation-learning-smoke.png`.
- [ ] Compare every OpenSpec requirement with evidence, mark all completed task checkboxes, and report any remaining limitations without calling the twelve lessons a complete curriculum.

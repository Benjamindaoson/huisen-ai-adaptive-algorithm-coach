# Aurora Web App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the approved Aurora functional prototype into the real React application without replacing its 754-problem catalog, runner, exams, learning evidence, or Mentor OS contracts.

**Architecture:** Keep the existing hash router and domain state in `App.tsx`. Add centralized learner-module presentation metadata, compose normal routes through one three-region application shell, retain dedicated problem/exam workspaces, and express the approved identity through semantic CSS tokens and responsive compositions.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest, Testing Library, Monaco, semantic CSS variables.

**Spec:** `openspec/changes/build-aurora-web-app-shell/specs/ai-learning-web-app-experience/spec.md`

## Global Constraints

- Do not change runner, corpus, exam grading, learning projection, or Mentor gateway contracts.
- Do not add a router or UI runtime dependency.
- Keep all working canvases and the editor light by default.
- Preserve hash URLs, browser backups, independent-assessment suppression, and AI-collaboration policy.
- Never present unconfigured or unavailable Mentor state as a completed Agent run.

---

### Task 1: Centralized application navigation

**Files:**
- Create: `web/src/lib/navigation.ts`
- Modify: `web/src/components/AppShell.tsx`
- Test: `web/src/components/AppShell.test.tsx`

**Interfaces:**
- Produces: `LEARNER_MODULES: LearnerModule[]` and `learnerModule(name: ModuleRouteName)`.
- Consumes: existing `hrefFor()` and `ModuleRouteName` contracts.

- [x] Write failing tests for six numbered primary destinations, active-route state, separated quality utility, backup actions, and route context.
- [x] Run `npm --prefix web test -- --run src/components/AppShell.test.tsx` and observe missing Aurora labels/context.
- [x] Implement metadata, semantic SVG glyphs, desktop/mobile navigation, and the route-aware context bar.
- [x] Pass the loaded catalog length from `App.tsx` instead of hard-coding the catalog count.
- [x] Rerun the focused test to green.

### Task 2: Real-data AI learning cockpit

**Files:**
- Modify: `web/src/pages/TodayPage.tsx`
- Test: `web/src/pages/pages.test.tsx`

**Interfaces:**
- Consumes: existing `AgentDecision`, `LearnerProfile`, `DailyPlanItem`, evidence/review/mastery counts.
- Produces: no new domain state; presentation only.

- [x] Add failing assertions for the compiled-plan identity and Mentor replan disclosure.
- [x] Preserve the single real primary action, reason, evidence, confidence, trace, and next queue.
- [x] Recompose the page into hero, compiled action, metrics, goal, and evidence panels.
- [x] Run focused page tests to green.

### Task 3: Persistent honest Mentor timeline

**Files:**
- Modify: `web/src/components/MentorDock.tsx`
- Test: `web/src/components/MentorDock.test.tsx`

**Interfaces:**
- Consumes: existing Mentor OS start/command/recover/approval clients and backup state.
- Produces: unchanged `onStateChange(MentorOSBackupState)` behavior.

- [x] Add failing tests for timeline identity, collapse, suppression, and an unconfigured service.
- [x] Preserve run recovery, route contributions, cursor updates, and explicit edit approval.
- [x] Add honest no-tool/no-service states instead of leaving the interface in perpetual connecting state.
- [x] Run all Mentor Dock tests to green.

### Task 4: Tokenized responsive visual system

**Files:**
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/App.css`

**Interfaces:**
- Produces: semantic rail, evidence, action, Agent, context-bar, Mentor-width, shadow, radius, and responsive variables.
- Consumes: existing page/workspace class names to avoid functional component rewrites.

- [x] Add midnight navigation, light canvas, blue action, mint evidence, and violet Agent tokens.
- [x] Style the shell, Today, shared cards, library, Mentor timeline, and current workspaces.
- [x] Implement compact-rail, floating-Mentor, six-entry mobile navigation, and reduced-motion behavior.
- [x] Verify at 390×844 that the desktop rail is hidden and every primary destination is reachable.

### Task 5: Real workflow integration and release proof

**Files:**
- Modify: `web/src/pages/ProblemsPage.tsx`
- Modify: `web/src/pages/PathsPage.tsx`
- Modify: `web/src/pages/ReviewPage.tsx`
- Modify: `web/src/pages/ExamPage.tsx`
- Modify: `web/src/pages/InsightsPage.tsx`
- Create: `web/src/pages/ProblemsPage.integration.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: the real 754-item catalog, problem route, code runner, dual-mode exam, quality workbench, and Mentor policy.
- Produces: consistent product naming and verified navigation; no API change.

- [x] Verify a 754-item catalog reports its real count, can be searched, and opens the selected problem ID.
- [x] Run real Python code and observe a completed runtime result.
- [x] Start an independent exam and verify Mentor/reference surfaces are absent.
- [x] Start an AI-collaboration exam and verify the persistent Mentor is present.
- [x] Visit learning, review, insights, and quality routes through the real browser.
- [x] Run `npm --prefix web test`, `npm --prefix web run lint`, `npm run typecheck`, and `npm run build:web`.
- [x] Document local execution, navigation architecture, Mentor setup, and the honest 0/100 quality gate.

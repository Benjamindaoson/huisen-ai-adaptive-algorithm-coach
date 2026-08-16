# Contextual Mentor, Project Path and Learning Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Isolate Mentor conclusions to the active task, expand repository practice into four progressive projects, and expose truthful teacher/transfer/seven-day learning evidence.

**Architecture:** Mentor runs become idempotent per `routeKind:routeRef`, which prevents cross-task recovery without heuristic event filtering. Project definitions remain declarative and share one workbench while deterministic harnesses vary by verification kind. Learning-effect metrics are pure projections over server-authoritative teacher counts and existing structured learning/pedagogical events.

**Tech Stack:** React 19, TypeScript 6, Vitest, Fastify gateway, existing Judge0 runner, OpenSpec.

**Spec:** `openspec/changes/deliver-contextual-mentor-project-path-evidence/design.md`

## Global Constraints

- No new runtime dependency.
- No source code or free-text reflection in learning telemetry.
- Synthetic/local teacher reviews never count as eligible real evidence.
- Seven-day evidence requires at least seven elapsed days.
- Preserve the existing `repo-pagination` project and event identifiers.

---

### Task 1: Mentor workspace isolation

**Files:**
- Modify: `web/src/components/MentorDock.tsx`
- Modify: `web/src/components/MentorDock.test.tsx`
- Modify: `web/src/lib/mentor-context.ts`
- Modify: `web/src/lib/mentor-context.test.ts`

**Interfaces:**
- Produces: `mentorWorkspaceKey(route): string` and scoped start idempotency `mentor-os-v2:<learnerId>:<workspaceKey>`.
- Preserves: `MentorDock` public props and existing Mentor client contract.

- [ ] **Step 1: Write failing tests** asserting different route refs call `client.start` with different idempotency keys, a mismatched cached `routeKey` is not recovered as active, and the Dock labels `当前工作空间 · practice / repo-pagination`.

```ts
expect(client.start).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
  idempotencyKey: 'mentor-os-v2:l-1:practice:repo-pagination',
}));
expect(screen.queryByText('old hypothesis')).toBeNull();
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm --prefix web test -- MentorDock.test.tsx mentor-context.test.ts --run`

Expected: FAIL because the current idempotency key is learner-wide and workspace labelling is absent.

- [ ] **Step 3: Implement the minimal isolation** by clearing visible state at effect start, reusing cached state only for an exact `routeKey`, and starting with the scoped key otherwise.

```ts
const cached = latest.state.active?.learnerId === learnerId && latest.state.active.routeKey === routeKey
  ? latest.state.active
  : null;
const idempotencyKey = `mentor-os-v2:${learnerId}:${routeKey}`;
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm --prefix web test -- MentorDock.test.tsx mentor-context.test.ts --run`

Expected: PASS.

### Task 2: Progressive repository project domain

**Files:**
- Modify: `web/src/lib/project-practicum.ts`
- Modify: `web/src/lib/project-practicum.test.ts`

**Interfaces:**
- Produces: `ProjectPracticum.order`, `prerequisiteIds`, `verificationKind`.
- Produces: `projectAvailability(projects, events)` and `buildPracticumHarness(project, source)`.

- [ ] **Step 1: Write failing tests** for exactly four ordered projects, prerequisite locking, verified-completion unlocking and a distinct structured harness result for each project.

```ts
expect(PROJECT_PRACTICUMS.map((item) => item.id)).toEqual([
  'repo-pagination', 'repo-async-cache', 'repo-selection-state', 'repo-large-dedup',
]);
expect(projectAvailability(PROJECT_PRACTICUMS, []).find((item) => item.project.id === 'repo-async-cache')?.status).toBe('locked');
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: `npm --prefix web test -- project-practicum.test.ts --run`

Expected: FAIL because only one project and one fixed harness exist.

- [ ] **Step 3: Add four declarative projects and bounded harness factories** for boundary normalization, async cache expiry, cross-file selection reconciliation and large-list deduplication.

- [ ] **Step 4: Run the domain test and verify GREEN**

Run: `npm --prefix web test -- project-practicum.test.ts --run`

Expected: PASS.

### Task 3: Deep-linked project progression UI

**Files:**
- Modify: `web/src/lib/routes.ts`
- Modify: `web/src/lib/routes.test.ts`
- Modify: `web/src/pages/ProjectPracticumPage.tsx`
- Modify: `web/src/pages/CareerExperiencePages.test.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Produces route: `{ name: 'practicum-project'; projectId: string }` with `#/practicum/<id>`.
- Extends `ProjectPracticumPage` with `projects` and `onSelectProject(projectId)`.

- [ ] **Step 1: Write failing route and page tests** for deep links, four path cards, prerequisite text, locked controls and selection of an unlocked project.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm --prefix web test -- routes.test.ts CareerExperiencePages.test.tsx --run`

Expected: FAIL because the route and progression selector do not exist.

- [ ] **Step 3: Implement route parsing, path cards and App integration** while retaining the existing workbench phases and draft key `<projectId>:javascript`.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm --prefix web test -- routes.test.ts CareerExperiencePages.test.tsx --run`

Expected: PASS.

### Task 4: Truthful learning-effect evidence

**Files:**
- Create: `web/src/lib/learning-effect-evidence.ts`
- Create: `web/src/lib/learning-effect-evidence.test.ts`
- Modify: `web/src/pages/InsightsPage.tsx`
- Modify: `web/src/pages/InsightsPage.test.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`
- Modify: `README.md`

**Interfaces:**
- Produces: `buildLearningEffectEvidence({ eligibleTeacherCases, learningEvents, pedagogicalEvents, now })`.
- Returns three `EvidenceMetric` objects with `numerator`, `denominator`, `minimumSample`, `status`, `rate`, `evidenceRefs`, and `nextRequirement`.

- [ ] **Step 1: Write failing projection tests** for zero-denominator `not-collected`, small-sample `insufficient`, matched unassisted transfer, and a review at least seven days after transfer.

```ts
expect(report.transfer.status).toBe('not-collected');
expect(report.sevenDay.denominator).toBe(1);
expect(report.sevenDay.numerator).toBe(1);
```

- [ ] **Step 2: Run projection tests and verify RED**

Run: `npm --prefix web test -- learning-effect-evidence.test.ts --run`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the pure projection and Insights panel**. Use `qualityWorkbench?.qualityGate?.eligibleRealCaseCount ?? 0`; never use local review length as the teacher numerator.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm --prefix web test -- learning-effect-evidence.test.ts InsightsPage.test.tsx --run`

Expected: PASS.

### Task 5: Integration and acceptance

**Files:**
- Modify: `openspec/changes/deliver-contextual-mentor-project-path-evidence/tasks.md`
- Modify: `docs/superpowers/plans/2026-08-13-contextual-mentor-project-path-evidence.md`

**Interfaces:**
- Consumes all prior task outputs.
- Produces verified local runtime evidence and an honest blocker report.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test; npm run lint; npm run typecheck; npm run build:web`

Expected: all technical checks pass.

- [ ] **Step 2: Validate specifications and diffs**

Run: `openspec validate deliver-contextual-mentor-project-path-evidence --strict; git diff --check`

Expected: pass.

- [ ] **Step 3: Verify the real local stack**

Run: `npm run stack:up; npm run stack:smoke`

Expected: gateway, PostgreSQL, Redis, object store and runner are ready; Mentor may truthfully report experimental/degraded model status.

- [ ] **Step 4: Run all four project harnesses through `/run`** and verify each returns `PRACTICUM_RESULT` with every case passing for a known-correct implementation.

- [ ] **Step 5: Browser-test** that switching from an old problem run to a project removes the old hypothesis, unlocked projects navigate, and Insights says “尚未采集/样本不足” for unproven evidence.

- [ ] **Step 6: Run honest quality gates**

Run: `npm run quality:mentor; npm run quality:judge`

Expected: Mentor remains red at 0/100 eligible real teacher cases; judge coverage remains explicitly reported rather than bypassed.

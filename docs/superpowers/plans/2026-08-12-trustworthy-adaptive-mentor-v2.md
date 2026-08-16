# Trustworthy Adaptive Mentor v0.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the current tool-using Mentor into an auditable learning loop with measurable diagnosis quality, immutable attempt binding, evidence-bounded remediation, and verified transfer.

**Architecture:** Keep immutable practice attempts as the source of truth, add pure frontend projections for diff and misconceptions, add one backward-compatible transfer event, and add a deterministic offline benchmark that future DeepSeek experiments can target. The browser UI exposes authority and freshness instead of hiding them behind a generic AI label.

**Tech Stack:** React 19, TypeScript 6, Vitest, Vite, Node.js ESM, Fastify gateway, existing Mentor runtime and learner-event store.

---

### Task 1: Mentor diagnosis benchmark

**Files:**
- Create: `quality/mentor-diagnosis-v1.json`
- Create: `scripts/lib/mentor-benchmark.mjs`
- Create: `scripts/lib/mentor-benchmark.test.mjs`
- Create: `scripts/check-mentor-quality.mjs`
- Modify: `package.json`

1. Write failing evaluator tests for correct localization/classification, false high-confidence conclusion, and answer leakage.
2. Run the focused test and confirm missing-module failure.
3. Implement bounded fixture validation and deterministic scoring.
4. Add seed fixtures and quality command; generate `docs/quality/mentor-diagnosis-report.json`.
5. Rerun focused tests and the quality command.

### Task 2: Attempt binding and evidence UI

**Files:**
- Create: `web/src/lib/submission-diff.ts`
- Create: `web/src/lib/submission-diff.test.ts`
- Modify: `web/src/components/MentorTimeline.tsx`
- Modify: `web/src/components/MentorTimeline.test.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/App.css`

1. Write failing pure diff tests for equal, changed, and truncated snapshots.
2. Write a failing component test for exact attempt identity, stale label, evidence states, and executed tools.
3. Implement the bounded diff and pass current editor source into Mentor timeline.
4. Render immutable attempt metadata, diff summary/hunks, semantic status labels, and execution evidence.
5. Run focused tests and lint/typecheck.

### Task 3: Misconception remediation

**Files:**
- Create: `web/src/lib/misconception.ts`
- Create: `web/src/lib/misconception.test.ts`
- Modify: `web/src/lib/lesson-progress.ts`
- Modify: `web/src/lib/lesson-progress.test.ts`
- Modify: `web/src/components/RunnerPanel.tsx`

1. Write failing tests for compiler-backed input parsing, failed-case boundary evidence, and insufficient evidence.
2. Implement bounded classifications with confidence, authority, and evidence refs.
3. Replace generic remediation projection with misconception-first routing and an honest skill-route fallback.
4. Update remediation UI copy so confirmed, supported, and suggested routes look different.
5. Run focused tests.

### Task 4: Verified transfer evidence

**Files:**
- Modify: `web/src/lib/learner-memory.ts`
- Modify: `web/src/lib/learner-memory.test.ts`
- Modify: `services/runner/gateway/src/learning-validation.ts`
- Modify: `services/runner/gateway/src/learning-validation.test.ts`
- Modify: `web/src/lib/lesson-progress.ts`
- Modify: `web/src/lib/lesson-progress.test.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/FoundationMap.tsx`

1. Write failing browser/gateway validation tests for `lesson-transfer-passed` bound to lesson, problem, and attempt.
2. Write failing projection tests that keep completion separate from transfer verification.
3. Implement backward-compatible event validation and active-transfer lookup.
4. Record a transfer pass only after a matching transfer start and eligible passed sample submission.
5. Surface transfer verification on the learning map and run focused tests.

### Task 5: Documentation and release proof

**Files:**
- Modify: `README.md`
- Create: `docs/quality/mentor-benchmark.md`
- Modify: `openspec/changes/build-trustworthy-adaptive-mentor-v2/tasks.md`

1. Document what the benchmark proves, what it does not prove, and the target thresholds.
2. Run `npm run quality:mentor`, `npm run verify`, and gateway tests.
3. Start the local web and gateway path available in the environment; exercise the primary browser flow and inspect console errors.
4. Run strict OpenSpec validation and a final secret/dependency/diff review.

# Adaptive Learning Core Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development task-by-task and superpowers:verification-before-completion before claiming this phase works.

**Goal:** Convert stored practice attempts into an explainable OD skill map, scheduled review dates, and a deterministic three-item daily plan.

**Architecture:** Define a versioned skill taxonomy and pure inference/mastery/planning functions. Derive state from immutable Attempt evidence rather than persisting opaque scores. Render the resulting plan and mastery snapshot on the home page; clicking a recommendation opens the existing problem workspace.

**Tech Stack:** TypeScript 6, Vitest, React 19, existing catalog/progress/practice models.

---

## Task 1: Define the OD skill taxonomy and inference

**Files:**
- Create: `web/src/lib/skills.ts`
- Create: `web/src/lib/skills.test.ts`

1. Add failing tests for precise keyword matching, multi-skill inference, deduplication, and simulation fallback.
2. Define stable skill IDs, Chinese titles, descriptions and keyword groups.
3. Implement `inferProblemSkills` as a deterministic content-derived baseline until Golden Problems receive curated annotations.

## Task 2: Derive mastery from attempts

**Files:**
- Create: `web/src/lib/mastery.ts`
- Create: `web/src/lib/mastery.test.ts`

1. Add failing tests for pass/fail score movement, confidence, recent error kinds, chronological determinism and review intervals.
2. Count only sample/official submission evidence; custom Run remains diagnostic but cannot prove mastery.
3. Return score, confidence, evidence count, last practice and next review for every taxonomy skill.

## Task 3: Build an explainable daily plan

**Files:**
- Create: `web/src/lib/daily-plan.ts`
- Create: `web/src/lib/daily-plan.test.ts`

1. Add failing tests for due review priority, weak-skill practice, duplicate avoidance and reason text.
2. Select at most three unique available problems from the local catalog.
3. Return a stable recommendation kind, target skill and concrete Chinese reason for every item.

## Task 4: Add the learning dashboard

**Files:**
- Create: `web/src/components/LearningDashboard.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

1. Derive mastery and plan with `useMemo` from catalog and practice attempts.
2. Render “今日训练” cards with recommendation reasons and open actions.
3. Render compact skill bars with score, confidence and due-review state; make low-confidence cold-start explicit.
4. Preserve the existing light formal problem workspace and current home visual language.

## Task 5: Verify the adaptive loop

1. Run targeted tests, full `npm run verify`, and OpenSpec validation.
2. In a real browser, verify dashboard load, recommendation reasons, skill evidence display and navigation into a recommended problem.
3. Confirm no recommendation claims AI personalization when there is no attempt evidence.

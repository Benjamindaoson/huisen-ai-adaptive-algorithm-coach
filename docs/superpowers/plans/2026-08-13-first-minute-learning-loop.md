# First-Minute Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a new learner understand and complete a meaningful first coding action in under three minutes, with one evidence-bound Mentor and an honest path into transfer practice.

**Architecture:** Add a small first-minute curriculum and pure experience-metric selector alongside the existing lesson engine. Today selects this additive on-ramp only for cold starts; the existing Foundation path remains unchanged. The problem route removes the global Mentor dock, while `RunnerPanel` owns the only Mentor surface and `ProblemReader` owns focus-mode state.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, existing local learning memory.

**Spec:** `openspec/changes/build-first-minute-learning-loop/design.md`

## Global Constraints

- No new package, API, model, Judge0, hidden-answer, or database dependency.
- Mission, lesson, and Mentor copy must use plain Chinese and show an action/evidence state rather than internal operational status.
- New event data must not include source code, free text, stdin, stdout, or stderr.
- Body copy is at least 14px and supporting copy is at least 12px on new learner-facing surfaces.
- Existing 12-lesson foundation order and prerequisite rules remain unchanged.

---

### Task 1: First-minute mission and bounded metrics

**Files:**
- Create: `web/src/lib/first-minute-learning.ts`
- Create: `web/src/lib/first-minute-learning.test.ts`
- Modify: `web/src/pages/TodayPage.tsx`
- Modify: `web/src/pages/pages.test.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Produces `nextStarterLesson(events): FoundationLesson | null` and `deriveFirstMinuteMetrics(events): FirstMinuteMetrics`.
- Emits first-minute signals through the existing bounded `LearningSignal` contract; event data contains only lesson IDs and a bounded outcome.
- `TodayPage` receives a starter lesson plus acknowledgement and mission-observation callbacks.

- [x] **Step 1: Write the failing test**

```ts
expect(nextStarterLesson([])?.id).toBe('starter-array-traversal');
expect(deriveFirstMinuteMetrics([]).firstRun.status).toBe('not-yet-measurable');
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test -- src/lib/first-minute-learning.test.ts`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement the pure selector and Today mission branch**

```ts
if (starterMission) {
  return <StarterMissionCard mission={starterMission} onStart={...} onAcknowledge={...} />;
}
```

- [x] **Step 4: Run focused tests to verify they pass**

Run: `npm --prefix web test -- src/lib/first-minute-learning.test.ts src/pages/pages.test.tsx`
Expected: PASS.

### Task 2: Starter algorithm curriculum

**Files:**
- Create: `web/src/lib/starter-algorithm-curriculum.ts`
- Create: `web/src/lib/starter-algorithm-curriculum.test.ts`
- Modify: `web/src/lib/foundation-curriculum.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/pages/LessonPage.test.tsx`

**Interfaces:**
- Exports `STARTER_ALGORITHM_LESSONS: FoundationLesson[]` with exactly three lessons.
- Extends `getFoundationLesson(id)` to resolve either existing or starter lessons without changing `FOUNDATION_LESSONS`.

- [x] **Step 1: Write the failing test**

```ts
expect(STARTER_ALGORITHM_LESSONS.map(({ id }) => id)).toEqual([
  'starter-array-traversal', 'starter-hash-lookup', 'starter-two-pointers',
]);
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm --prefix web test -- src/lib/starter-algorithm-curriculum.test.ts`
Expected: FAIL because the module does not exist.

- [x] **Step 3: Add the lessons and route lookup**

```ts
export function getFoundationLesson(id: string) {
  return [...FOUNDATION_LESSONS, ...STARTER_ALGORITHM_LESSONS].find((lesson) => lesson.id === id);
}
```

- [x] **Step 4: Run curriculum and lesson tests**

Run: `npm --prefix web test -- src/lib/starter-algorithm-curriculum.test.ts src/lib/foundation-curriculum.test.ts src/pages/LessonPage.test.tsx`
Expected: PASS.

### Task 3: Single Mentor and focus mode

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/RunnerPanel.test.tsx`
- Modify: `web/src/components/ProblemReader.test.tsx`
- Modify: `web/src/App.test.tsx` if present, otherwise create an isolated workspace rendering test.

**Interfaces:**
- `ProblemReader` owns `focusMode: boolean` and adds class `is-focus-mode` while active.
- `RunnerPanel` keeps one Mentor surface in the workspace; it shows an idle instruction before an attempt and contextual diagnosis only after an attempt is recorded.
- The problem route passes no global `mentorDock` into its DOM.

- [x] **Step 1: Write failing tests**

```ts
expect(screen.getByRole('button', { name: '进入专注模式' })).toBeTruthy();
expect(screen.queryByLabelText('持续导师')).toBeNull();
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm --prefix web test -- src/components/ProblemReader.test.tsx src/components/RunnerPanel.test.tsx`
Expected: FAIL because no focus control exists and Mentor is shown before a run.

- [x] **Step 3: Implement the minimum workspace contract**

```tsx
<button onClick={() => setFocusMode((value) => !value)}>
  {focusMode ? '退出专注模式' : '进入专注模式'}
</button>
<MentorTimeline attempt={coachAttempt} ... /> // diagnosis is evidence-gated inside the timeline
```

- [x] **Step 4: Run focused tests**

Run: `npm --prefix web test -- src/components/ProblemReader.test.tsx src/components/RunnerPanel.test.tsx src/components/MentorTimeline.test.tsx`
Expected: PASS.

### Task 4: Readability and responsive interaction styles

**Files:**
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/App.css`
- Modify: `web/src/pages/TodayPage.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/pages/pages.test.tsx`

**Interfaces:**
- Uses `--font-size-body` (14px minimum), `--font-size-meta` (12px minimum), and component tokens for mission/focus controls.

- [x] **Step 1: Write failing assertions**

```ts
expect(renderedMission).toContain('8 分钟');
expect(renderedMission).toContain('完成后你将能够');
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npm --prefix web test -- src/pages/pages.test.tsx`
Expected: FAIL because the starter mission wording is absent.

- [x] **Step 3: Apply semantic styles and copy**

```css
.starter-mission-copy { font-size: var(--font-size-body); }
.starter-mission-meta { font-size: var(--font-size-meta); }
```

- [x] **Step 4: Run visual component tests**

Run: `npm --prefix web test -- src/pages/pages.test.tsx src/components/ProblemReader.test.tsx`
Expected: PASS.

### Task 5: Integration verification

**Files:**
- Modify: `openspec/changes/build-first-minute-learning-loop/tasks.md`
- Modify: this plan checklist

- [x] **Step 1: Run full automated verification**

Run: `npm run typecheck; npm run lint; npm test; npm run build:web; npx openspec validate build-first-minute-learning-loop --strict; git diff --check`
Expected: all pass.

- [x] **Step 2: Run browser flows**

Check `#/today` cold start mission, open its lesson, complete/advance its first checkpoint, open `#/problem/...`, enter/exit focus mode, and verify Mentor is absent before a run and appears after an attempt.

- [x] **Step 3: Review release scope**

Confirm no secret appears in changed files, only intended user-flow files changed, and metrics remain marked not-yet-measurable without real evidence.

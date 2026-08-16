# Learner Interaction Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the next learning action obvious, make one Mentor surface understandable and truthful, and reduce mobile navigation cognitive load without removing existing product capabilities.

**Architecture:** Keep the existing React/Vite application and Mentor OS runtime. Add UI-only action callbacks at page boundaries, a presentation mapping inside `MentorDock`, and a mobile-only navigation partition in `AppShell`. Existing APIs, persistence state, exam policy, and route format remain untouched.

**Tech Stack:** React 19, TypeScript, Vite, CSS custom-property tokens, Vitest, Testing Library.

**Spec:** `openspec/changes/optimize-learner-interaction-flow/design.md`

## Global Constraints

- Do not add a dependency or alter Mentor API/storage contracts.
- Preserve independent-exam Mentor suppression.
- Keep learning evidence available through progressive disclosure; never claim validated learning outcomes.
- Use readable learner copy for default UI and preserve raw IDs only in explicit evidence views.
- Use tests before production changes and verify all existing tests afterward.

---

### Task 1: Baseline action in Insights

**Files:**
- Modify: `web/src/pages/InsightsPage.test.tsx`
- Modify: `web/src/pages/InsightsPage.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Produces: `InsightsPage` accepts `onStartBaseline?: () => void`.
- Consumes: App's already-loaded `catalog.problems` and `navigate({ name: 'problem', problemId })`.

- [x] **Step 1: Write failing tests**

```tsx
const onStartBaseline = vi.fn();
render(<InsightsPage mastery={[]} onStartBaseline={onStartBaseline} />);
fireEvent.click(screen.getByRole('button', { name: '开始第一个练习' }));
expect(onStartBaseline).toHaveBeenCalledOnce();
```

- [x] **Step 2: Verify red**

Run: `npm --prefix web test -- src/pages/InsightsPage.test.tsx`

Expected: FAIL because the empty state does not yet expose the requested action.

- [x] **Step 3: Implement minimal page/App wiring**

```tsx
type Props = { /* existing props */; onStartBaseline?: () => void };
// Empty state renders a button when callback exists, otherwise an #/paths link.
const baselineProblem = catalog.problems.find((item) => item.completeness === 'complete' && item.languages.length > 0);
<InsightsPage onStartBaseline={baselineProblem ? () => openProblem(baselineProblem.id) : undefined} />
```

- [x] **Step 4: Verify green**

Run: `npm --prefix web test -- src/pages/InsightsPage.test.tsx src/pages/pages.test.tsx`

Expected: PASS.

### Task 2: Learner-legible Mentor surface

**Files:**
- Modify: `web/src/components/MentorDock.test.tsx`
- Modify: `web/src/components/MentorDock.tsx`
- Modify: `web/src/pages/ProjectPracticumPage.tsx`
- Modify: `web/src/pages/CareerExperiencePages.test.tsx`

**Interfaces:**
- Produces: `MentorDock` renders lifecycle state, next action, and a `details` disclosure labelled `查看分析依据`.
- Consumes: existing `MentorOSEvent`, checkpoint, and approval command contracts.

- [x] **Step 1: Write failing tests**

```tsx
expect(screen.getByText('导师已就绪，等待当前任务的可验证证据')).toBeTruthy();
expect(screen.queryByText('route:daily')).toBeNull();
expect(screen.getByText('查看分析依据')).toBeTruthy();
```

- [x] **Step 2: Verify red**

Run: `npm --prefix web test -- src/components/MentorDock.test.tsx src/pages/CareerExperiencePages.test.tsx`

Expected: FAIL because raw evidence is currently rendered in the open timeline and the project panel says `Project Mentor`.

- [x] **Step 3: Implement the presentation mapping**

```tsx
const statusText = status === 'agent' ? '导师已完成证据分析'
  : status === 'compiled' ? '导师已就绪，等待当前任务的可验证证据'
  : status === 'unavailable' ? '导师暂不可用，当前不生成 AI 结论'
  : '导师正在读取当前任务';
// Event cards show a plain label/detail; their refs move into <details>.
```

- [x] **Step 4: Verify green**

Run: `npm --prefix web test -- src/components/MentorDock.test.tsx src/pages/CareerExperiencePages.test.tsx`

Expected: PASS.

### Task 3: Four-goal mobile navigation

**Files:**
- Modify: `web/src/components/AppShell.test.tsx`
- Modify: `web/src/components/AppShell.tsx`
- Modify: `web/src/lib/navigation.ts`
- Modify: `web/src/App.css`
- Modify: `web/src/styles/tokens.css`

**Interfaces:**
- Produces: `PRIMARY_MOBILE_MODULES` and `SECONDARY_MOBILE_MODULES`; AppShell has an accessible More button/tray.
- Consumes: existing `hrefFor`, module route names, and nav glyphs.

- [x] **Step 1: Write failing tests**

```tsx
const mobile = within(screen.getByRole('navigation', { name: '移动端主导航' }));
expect(mobile.getAllByRole('link')).toHaveLength(4);
const more = screen.getByRole('button', { name: '更多功能' });
fireEvent.click(more);
expect(more).toHaveAttribute('aria-expanded', 'true');
expect(screen.getByRole('navigation', { name: '更多学习功能' })).toBeTruthy();
```

- [x] **Step 2: Verify red**

Run: `npm --prefix web test -- src/components/AppShell.test.tsx`

Expected: FAIL because the current mobile navigation maps all modules directly to the bar.

- [x] **Step 3: Implement minimal navigation partition and token styles**

```tsx
export const PRIMARY_MOBILE_MODULES = LEARNER_MODULES.filter(({ name }) => ['today', 'paths', 'problems', 'insights'].includes(name));
export const SECONDARY_MOBILE_MODULES = /* project, review, exam plus trust and quality links */;
```

- [x] **Step 4: Verify green**

Run: `npm --prefix web test -- src/components/AppShell.test.tsx`

Expected: PASS.

### Task 4: Full verification and handoff

**Files:**
- Modify: `openspec/changes/optimize-learner-interaction-flow/tasks.md`

- [x] **Step 1: Verify implementation quality**

Run: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:web`, `npx openspec validate optimize-learner-interaction-flow --strict`.

- [x] **Step 2: Verify local user flows**

Run: `npm --prefix web run dev -- --host 127.0.0.1` and inspect `#/insights` at desktop and mobile widths. Confirm baseline action, Mentor disclosure, More navigation, and no runtime errors.

- [x] **Step 3: Review scope**

Run: `git diff --check` and inspect only files listed in this plan. Confirm no secrets, dependency additions, or changes to exam policy.

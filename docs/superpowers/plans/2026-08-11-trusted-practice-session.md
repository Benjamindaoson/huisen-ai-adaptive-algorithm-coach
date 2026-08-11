# Trusted Practice Session Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task, then superpowers:verification-before-completion before claiming the phase works.

**Goal:** Deliver the first reliable practice loop: structured sample cases, persistent per-language drafts, distinct Run and Sample Submit actions, case-level verdicts, immutable attempt history, and portable local backup.

**Architecture:** Keep the existing static React application and runner adapter. Add pure domain modules for testcase parsing, sample judging, and practice state. UI components consume those modules through explicit props; browser storage remains an adapter at the App boundary. No hidden-test claims are introduced.

**Tech Stack:** React 19, TypeScript 6, Vitest, Monaco Editor, Vite, existing Judge0-compatible runner adapter.

---

## Task 1: Parse all judgeable sample cases

**Files:**
- Modify: `web/src/lib/testcase.ts`
- Modify: `web/src/lib/testcase.test.ts`

1. Add failing tests for multiple examples, inline `输入：...`/`输出：...`, descriptions after output, and unjudgeable samples.
2. Define `SampleTestCase { id, name, stdin, expectedOutput }` and `sampleTestCasesFromExamples(examples)`.
3. Split each extracted example independently, stop expected output at explanation markers, and keep the old first-input helper as a compatibility wrapper.
4. Run `npx vitest run web/src/lib/testcase.test.ts`.

## Task 2: Add sample judge as a pure orchestration module

**Files:**
- Create: `web/src/lib/sample-judge.ts`
- Create: `web/src/lib/sample-judge.test.ts`

1. Add failing tests for newline/line-tail normalization, pass, wrong answer, compile error, unavailable runner, and sequential multi-case evaluation.
2. Define `SampleVerdict`, `SampleCaseResult`, `SampleSubmissionResult`, and an injectable `execute(request, signal)` dependency.
3. Implement normalized output comparison without changing `runner-client.ts` transport semantics.
4. Run `npx vitest run web/src/lib/sample-judge.test.ts`.

## Task 3: Add versioned local practice state

**Files:**
- Create: `web/src/lib/practice.ts`
- Create: `web/src/lib/practice.test.ts`

1. Add failing tests for per-language draft isolation, attempt append, 20-attempt retention, malformed storage recovery, and state import validation.
2. Define `Draft`, `PracticeAttempt`, `PracticeState`, storage key, parser, load/save, `updateDraft`, and `recordAttempt`.
3. Generate attempt IDs without adding a dependency; accept time/id injection in pure helpers for deterministic tests.
4. Run `npx vitest run web/src/lib/practice.test.ts`.

## Task 4: Upgrade backup to include practice evidence

**Files:**
- Create: `web/src/lib/backup.ts`
- Create: `web/src/lib/backup.test.ts`
- Modify: `web/src/App.tsx`

1. Add failing tests for version-2 export/import and compatibility with legacy version-1 progress backups.
2. Define a version-2 backup envelope with `progress` and `practice`; validate completely before applying either section.
3. Preserve merge/replace behavior for progress; merge drafts by `updatedAt` and attempts by ID.
4. Wire export/import in `App.tsx`, retaining current data when validation fails.

## Task 5: Persist editor drafts

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/ProblemReader.tsx`

1. Load practice state once at the App boundary and pass the selected draft plus update callback to `ProblemReader`.
2. On problem/language selection, prefer a saved draft over the extracted reference code.
3. Save each editor change for the active problem/language; never overwrite another language's draft.
4. Add visible “已自动保存” status near the editor header.

## Task 6: Separate Run from Sample Submit

**Files:**
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/App.css`

1. Keep Run tied to editable stdin and a single execution.
2. Add “样例提交” that runs every structured sample and shows per-case pass/fail/error, runtime, input, expected and actual output.
3. Record both run and sample-submit attempts through a callback; update progress to `in-progress` after the first attempt and `mastered` only when all available samples pass, with a clear “仅代表样例通过” label.
4. Disable Sample Submit when no judgeable sample exists and explain why.
5. Make the result pane keyboard accessible and responsive in the existing light visual language.

## Task 7: Verify the complete vertical slice

**Files:**
- Modify if needed: `README.md`

1. Run targeted unit tests after each task.
2. Run `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build:web`.
3. Start or reuse `npm --prefix web run dev -- --host 127.0.0.1`.
4. In a real browser, verify: open a complete problem; edit code; switch languages and back; refresh and confirm recovery; Run custom input; Sample Submit; inspect case matrix; export backup; import it without data loss.
5. Record any public Judge0 availability limitation separately from UI/domain verification.

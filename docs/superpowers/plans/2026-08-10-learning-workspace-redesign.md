# Learning Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make four-language code execution available without local container setup and replace the catalog-style UI with a focused learning workspace.

**Architecture:** The frontend defaults to the public Judge0 CE API when no self-hosted endpoint is configured, while retaining `VITE_RUNNER_URL` as an override for the private gateway. The React UI becomes a compact dashboard plus a two-pane problem workspace: reader on the left and persistent editor/run console on the right.

**Tech Stack:** React 19, TypeScript, Vite, Monaco Editor, Vitest, public Judge0 CE API.

## Global Constraints

- Keep browser-local progress and versioned import/export unchanged.
- Allow only Java, Python, JavaScript, and C++ execution.
- Keep the self-hosted gateway implementation intact; public Judge0 is a first-release default, not a secret-bearing proxy.
- Never require Docker for the default learning flow.

### Task 1: Make the default runner executable

**Files:**
- Modify: `web/src/lib/runner-client.ts`
- Modify: `web/src/components/RunnerPanel.tsx`
- Test: `web/src/lib/runner-client.test.ts`

- [ ] Write a test showing that a missing override resolves to the public Judge0 endpoint.
- [ ] Run the test to verify it fails because the resolver does not exist.
- [ ] Add `resolveRunnerUrl(override?: string): string`, mapping no override to `https://ce.judge0.com` and normalizing trailing slashes.
- [ ] Make `RunnerPanel` always enable Run for a non-empty source and display the active runner mode.
- [ ] Run frontend tests and typecheck.

### Task 2: Redesign the learning workspace

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`

- [ ] Preserve all existing state, import/export, search and hash routes.
- [ ] Replace the dense home catalog viewport with a command-style search surface, concise progress summary and curated pathway cards.
- [ ] Make the problem page a desktop two-column workspace with sticky code lab and mobile stacked layout.
- [ ] Refine the formal problem route into a LeetCode-style split workspace: independent left/right scrolling, description/solution tabs, and a right-side testcase/result console.
- [ ] Give the run console explicit ready/running/error/success feedback and preserve code/input after failures.
- [ ] Verify the visual primary flow in the local browser.

### Task 3: Validate the public-first workflow

**Files:**
- Modify: `README.md`
- Modify: `docs/deployment.md`

- [ ] Document that the public runner is convenient for personal learning but subject to its operator's availability and limits.
- [ ] Document `VITE_RUNNER_URL` as the self-hosted privacy/availability override.
- [ ] Build, lint, typecheck, test and run a browser smoke test executing Python against the public endpoint.

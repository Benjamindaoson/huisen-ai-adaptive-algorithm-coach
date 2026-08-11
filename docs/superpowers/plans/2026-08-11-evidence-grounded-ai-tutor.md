# Evidence-grounded AI Tutor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a four-level coding tutor that diagnoses a selected attempt from real problem, code, execution and mastery evidence, works locally without pretending to use AI, and upgrades to an OpenAI-compatible model through a server-side gateway when configured.

**Architecture:** Extend immutable Attempt records with a small sanitized evidence envelope. A pure browser coach produces deterministic fallback guidance; the same versioned request/response contract is accepted by a rate-limited server route whose provider key never enters the static frontend. `CoachPanel` exposes evidence and progressive hint levels inside the existing problem workspace.

**Tech Stack:** React 19, TypeScript 6, Vitest, Fastify 5, native `fetch`, existing localStorage and runner gateway.

## Global Constraints

- Browser state remains local-only and exportable in backup version 2.
- Hidden test inputs and expected outputs SHALL NOT enter the browser or model context.
- Levels 1–3 SHALL NOT include a complete replacement solution; level 4 requires explicit confirmation.
- `AI_API_KEY` is server-only; no provider secret may use a `VITE_` variable.
- When no provider is configured, UI copy must say “本地证据诊断”, not “AI generated”.

---

### Task 1: Persist bounded attempt evidence

**Files:**
- Modify: `web/src/lib/practice.ts`
- Modify: `web/src/lib/practice.test.ts`
- Modify: `web/src/components/RunnerPanel.tsx`

**Interfaces:**
- Produces: `AttemptEvidence` and optional `PracticeAttempt.evidence` containing `stderr`, `stdout`, `timeMs`, and one public `failedCase`.
- Consumes: existing `RunResult` and `SampleCaseResult`.

- [ ] Add a failing parser test proving malformed evidence is rejected while old attempts without evidence remain valid.
- [ ] Add `AttemptEvidence` validation with 32,000-character output fields and 10,000-character public input fields.
- [ ] Record run output/error evidence and the first non-passing public sample; never persist all cases.
- [ ] Run `npx vitest run web/src/lib/practice.test.ts` and confirm green.

### Task 2: Define the coach contract and local diagnosis

**Files:**
- Create: `web/src/lib/coach.ts`
- Create: `web/src/lib/coach.test.ts`

**Interfaces:**
- Produces: `CoachRequest`, `CoachDiagnosis`, `buildLocalDiagnosis(request)`, `requestCoach(url, request, signal)`.
- Consumes: `ProblemRecord`, `PracticeAttempt`, and related `SkillMastery[]`.

- [ ] Write failing tests for compile error, wrong answer evidence, timeout complexity guidance, four-level disclosure, empty URL fallback, invalid server responses and aborted requests.
- [ ] Build a compact request that omits `problem.solutions` for levels 1–3 and includes only the active-language reference at level 4.
- [ ] Implement structured local diagnoses with `source`, `diagnosis`, `evidence`, `hintLevel`, `nextAction`, and `confidence`.
- [ ] Implement provider request validation and network fallback without relabeling local output as model output.
- [ ] Run `npx vitest run web/src/lib/coach.test.ts` and confirm green.

### Task 3: Add the secured provider gateway

**Files:**
- Create: `services/runner/gateway/src/coach-validation.ts`
- Create: `services/runner/gateway/src/coach-validation.test.ts`
- Create: `services/runner/gateway/src/coach-provider.ts`
- Create: `services/runner/gateway/src/coach-provider.test.ts`
- Modify: `services/runner/gateway/src/server.ts`
- Modify: `services/runner/.env.example`
- Modify: `services/runner/README.md`

**Interfaces:**
- Produces: `POST /coach/diagnose`; `AI_API_URL`, `AI_API_KEY`, `AI_MODEL` configuration.
- Consumes: version-1 `CoachRequest` from the frontend.

- [ ] Write failing validation tests for unsupported versions, invalid hint levels, oversized code, hidden-test-shaped fields and unknown properties.
- [ ] Implement strict allowlisted parsing and a sanitized provider prompt; reject keys named `hidden`, `hiddenTests`, `expectedHiddenOutput`, or `officialCases` at any depth.
- [ ] Write failing provider tests using injected `fetch` for missing configuration, request headers, malformed JSON, timeout and structured success.
- [ ] Implement OpenAI-compatible `/chat/completions` call with `response_format: { type: "json_object" }` and validate the model response before returning it.
- [ ] Add the route with existing CORS/body/rate controls and return `503` for unconfigured providers without leaking configuration.
- [ ] Run `npm --prefix services/runner/gateway test` and `npm --prefix services/runner/gateway run typecheck`.

### Task 4: Build progressive tutor UX

**Files:**
- Create: `web/src/components/CoachPanel.tsx`
- Create: `web/src/components/CoachPanel.test.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Consumes: `CoachRequest`, current `ProblemRecord`, selected `PracticeAttempt`, and `SkillMastery[]`.
- Produces: an “AI 教练” runner tab and “分析这次错误” action.

- [ ] Write a failing server-render test for source labeling, evidence list, four level buttons and disabled state without an attempt.
- [ ] Render the selected attempt and exactly which code/result/mastery evidence will be used.
- [ ] Default to level 1, require a confirm dialog before level 4, and keep previous levels visible during escalation.
- [ ] Show local/provider/unavailable states without spinner deadlocks; use `aria-live` for completed diagnoses.
- [ ] Add light-theme responsive styles consistent with the current runner panel.

### Task 5: Add a diagnosis evaluation gate

**Files:**
- Create: `web/src/lib/coach-eval.test.ts`
- Create: `docs/quality/coach-evaluation.md`

**Interfaces:**
- Consumes: `buildLocalDiagnosis` and the shared `CoachDiagnosis` contract.
- Produces: a fixed five-case release gate covering syntax, off-by-one/wrong answer, input parsing, timeout/complexity and runtime failure.

- [ ] Encode five fixtures with required evidence citations and forbidden full-solution markers for levels 1–3.
- [ ] Assert every diagnosis has one evidence item, one verifiable next action and bounded confidence.
- [ ] Document how a configured model response is sampled against the same fixtures before changing provider/model settings.
- [ ] Run the evaluation test and the full repository verification.

### Task 6: Browser verification

- [ ] Open a problem with a failed sample attempt and verify the AI 教练 tab.
- [ ] Verify level 1 is evidence-grounded and labeled local when `VITE_COACH_URL` is absent.
- [ ] Verify level escalation, level-4 confirmation, refresh persistence of attempts, and no console errors.
- [ ] Verify a configured test gateway response is labeled model-generated without exposing `AI_API_KEY` in built assets.

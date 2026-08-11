# AI Learning Intelligence Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace descriptive pseudo-Agent traces with a server-side, permissioned learning runtime that executes diagnostic, retrieval, and mastery tools and exposes honest results in the problem workspace.

**Architecture:** Fastify owns deterministic tools and the observe-act loop; the optional model provider can influence teaching policy only inside validated role permissions. React consumes a versioned `/agent/run` contract and retains the existing local Coach as an explicitly labelled fallback.

**Tech Stack:** TypeScript 6, Fastify 5, React 19, Vitest 4, existing OpenAI-compatible provider, local corpus JSON.

## Global Constraints

- Judge results are immutable and cannot be authored by a model.
- No source code or raw stdin/stdout/stderr enters learner-memory storage.
- The app must remain useful without an AI provider or gateway.
- New runtime dependencies are avoided in this phase.
- Every new behavior follows a failing-test-first cycle.

---

### Task 1: Trusted evidence and code diagnostics

**Files:**
- Modify: `scripts/lib/problem-intelligence.mjs`
- Modify: `scripts/lib/problem-intelligence.test.mjs`
- Create: `services/runner/gateway/src/code-diagnostics.ts`
- Create: `services/runner/gateway/src/code-diagnostics.test.ts`

**Interfaces:**
- Produces: `diagnoseCode(input: DiagnosticInput): DiagnosticReport`
- Produces: `DiagnosticObservation { kind, message, line?, confidence, evidenceRef }`

- [ ] Write corpus tests asserting separate readiness dimensions and verification backlog counts.
- [ ] Run `npm test -- scripts/lib/problem-intelligence.test.mjs` and confirm the new assertions fail.
- [ ] Extend the report with backward-compatible readiness fields and deterministic backlog entries.
- [ ] Write diagnostic tests for parser mismatch, boundary risk, complexity risk, and judge-authority preservation.
- [ ] Run `npm --prefix services/runner/gateway test -- src/code-diagnostics.test.ts` and confirm missing-module failure.
- [ ] Implement the smallest language-aware diagnostic module that passes those cases.
- [ ] Rerun both focused suites.

### Task 2: Grounded retrieval and probabilistic mastery

**Files:**
- Create: `services/runner/gateway/src/learning-retrieval.ts`
- Create: `services/runner/gateway/src/learning-retrieval.test.ts`
- Create: `services/runner/gateway/src/probabilistic-mastery.ts`
- Create: `services/runner/gateway/src/probabilistic-mastery.test.ts`

**Interfaces:**
- Produces: `retrieveLearningEvidence(query, items, options): RetrievedEvidence[]`
- Produces: `projectMastery(prior, observations): MasteryProjection`

- [ ] Write retrieval tests showing lexical/skill ranking, verified preference, bounded excerpts, and stable citations.
- [ ] Run the focused retrieval test and confirm missing implementation failure.
- [ ] Implement normalized token/skill scoring without external dependencies.
- [ ] Write mastery tests establishing `transfer > independent > assisted` positive weight and failure reduction.
- [ ] Run the focused mastery test and confirm missing implementation failure.
- [ ] Implement posterior-odds projection with probability/confidence separation.
- [ ] Rerun both focused suites.

### Task 3: Executable Agent runtime and API

**Files:**
- Create: `services/runner/gateway/src/agent-runtime.ts`
- Create: `services/runner/gateway/src/agent-runtime.test.ts`
- Modify: `services/runner/gateway/src/server.ts`
- Modify: `services/runner/gateway/src/server.test.ts`

**Interfaces:**
- Produces: `runLearningAgent(request, dependencies): Promise<AgentRun>`
- Produces: `AgentTool { name, allowedRoles, execute }`
- HTTP: `POST /agent/run` with code, problem evidence, judge outcome, hint level, profile summary, and prior observations.

- [ ] Write runtime tests for actual tool execution, allowlist rejection, step budget, typed handoff, and deterministic mode.
- [ ] Run the focused runtime test and confirm missing implementation failure.
- [ ] Implement role policies, registry execution, deterministic plan, trace records, and bounded result schemas.
- [ ] Write API tests for valid response, malformed request, unavailable dependency, and judge conflict.
- [ ] Run the focused server tests and confirm route failure before wiring.
- [ ] Add strict request validation and the `/agent/run` route.
- [ ] Rerun runtime and server suites.

### Task 4: Agentic Tutor workspace

**Files:**
- Create: `web/src/lib/agent-client.ts`
- Create: `web/src/lib/agent-client.test.ts`
- Modify: `web/src/components/CoachPanel.tsx`
- Modify: `web/src/components/CoachPanel.interaction.test.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Produces: `requestAgentRun(endpoint, request): Promise<AgentRunResponse>`
- Consumes: `/agent/run` contract from Task 3.

- [ ] Write client validation tests for valid traces, unknown fields, abort, and unavailable gateway.
- [ ] Run the focused client test and confirm missing implementation failure.
- [ ] Implement the client with strict response parsing and timeout.
- [ ] Write UI tests for running state, mode label, diagnosis, citations, mastery impact, trace expansion, and fallback label.
- [ ] Run the focused Coach tests and confirm new UI assertions fail.
- [ ] Integrate the real Agent result while retaining the existing local Coach fallback.
- [ ] Rerun focused web tests.

### Task 5: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `services/runner/README.md`
- Modify: `docs/architecture/agentic-learning-platform.md`
- Modify: `openspec/changes/build-ai-learning-intelligence-core/tasks.md`

**Interfaces:**
- Documents: exact configuration, privacy boundary, runtime modes, truthful capability matrix, and deferred phases.

- [ ] Update documentation and mark each verified OpenSpec task complete.
- [ ] Run `npm run verify`.
- [ ] Run `npm --prefix services/runner/gateway test`.
- [ ] Run OpenSpec validation for `build-ai-learning-intelligence-core`.
- [ ] Start gateway and web app, verify health/API, and smoke-test the primary browser flow with no console errors.

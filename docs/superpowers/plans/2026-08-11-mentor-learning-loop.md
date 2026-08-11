# Mentor Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one genuine Mentor Agent that understands and verifies code, models the learner, retrieves trusted full-corpus evidence, conducts Socratic turns, and lives continuously beside the editor.

**Architecture:** A deep `runMentorTurn(request, adapters)` module owns the observable loop. Tree-sitter, DeepSeek, execution, retrieval, and persistence are adapters at internal seams; each has a deterministic test adapter. The web client consumes only versioned session/timeline projections.

**Tech Stack:** Node.js 24, TypeScript 6, Fastify 5, React 19, Vitest 4, Tree-sitter 0.25 grammars, Monaco Editor, DeepSeek OpenAI-compatible chat/tool calls.

## Global Constraints

- The judge remains the only verdict authority.
- Never send hidden tests, server secrets, or reference solutions below the explicit unlock level to a model.
- Model tool arguments are untrusted input and require local validation.
- Maximum 8 Mentor steps, 2 repeats per tool/argument fingerprint, 20-second provider timeout, and bounded excerpts/source.
- Every production behavior starts with a failing test and is verified again through the public module interface.
- Candidate or unverified corpus content is never presented as authoritative.

---

### Task 1: Tree-sitter parser adapter

**Files:**
- Modify: `services/runner/gateway/package.json`
- Create: `services/runner/gateway/src/mentor/code-parser.ts`
- Test: `services/runner/gateway/src/mentor/code-parser.test.ts`

**Interfaces:**
- Produces: `parseSource({ language, sourceCode }): ParsedProgramEvidence`

- [ ] Write tests for each supported language, syntax ranges, function/loop/branch nodes, and degraded parsing.
- [ ] Run `npm test -- src/mentor/code-parser.test.ts` and confirm missing-module failures.
- [ ] Add gateway-only grammar dependencies and implement lazy parser loading.
- [ ] Rerun the focused test and gateway typecheck.

### Task 2: Structural code intelligence and verification contracts

**Files:**
- Create: `services/runner/gateway/src/mentor/code-intelligence.ts`
- Test: `services/runner/gateway/src/mentor/code-intelligence.test.ts`

**Interfaces:**
- Consumes: `ParsedProgramEvidence`
- Produces: `analyzeProgram(input): CodeIntelligenceReport`, `planCounterexamples(input): CounterexampleCandidate[]`, `verifyHypothesis(input, execute): Promise<VerifiedHypothesis>`

- [ ] Write failing tests for CFG edges, def-use facts, source lines, invalid-input filtering, divergence support, and unverified results.
- [ ] Implement bounded structural analysis and execution adapter contracts.
- [ ] Run focused tests and ensure no static observation is labelled proven.

### Task 3: Learner twin

**Files:**
- Create: `services/runner/gateway/src/mentor/learner-twin.ts`
- Test: `services/runner/gateway/src/mentor/learner-twin.test.ts`

**Interfaces:**
- Produces: `projectLearnerTwin(previous, observations, now): LearnerTwin`

- [ ] Write failing tests for assisted pass, independent pass, transfer, misconception evidence, confidence, citations, and time decay.
- [ ] Implement a pure beta-belief projection with bounded forgetting and evidence provenance.
- [ ] Run focused tests and freeze the versioned schema.

### Task 4: Full-corpus trusted retrieval

**Files:**
- Create: `scripts/build-mentor-index.mjs`
- Create: `scripts/lib/mentor-index.mjs`
- Test: `scripts/lib/mentor-index.test.mjs`
- Modify: `package.json`
- Create: `services/runner/gateway/src/mentor/corpus-retrieval.ts`
- Test: `services/runner/gateway/src/mentor/corpus-retrieval.test.ts`

**Interfaces:**
- Produces: `content/mentor-index.json`, `createCorpusRetriever(path).search(query)`

- [ ] Write failing index tests for all record kinds, trust tiers, stable refs, and deterministic output.
- [ ] Implement compact index generation and add it to corpus verification.
- [ ] Write failing gateway tests for Chinese BM25/bigrams, skill/twin relevance, trust priority, and bounded citations.
- [ ] Implement one-time index loading and ranked retrieval.

### Task 5: DeepSeek native tool adapter

**Files:**
- Create: `services/runner/gateway/src/mentor/deepseek-provider.ts`
- Test: `services/runner/gateway/src/mentor/deepseek-provider.test.ts`

**Interfaces:**
- Produces: `createDeepSeekMentorProvider(config): MentorModelAdapter`

- [ ] Write failing tests for tool schemas, tool-call parsing, reasoning-content preservation, timeout, invalid JSON, usage, and secret non-disclosure.
- [ ] Implement the OpenAI-compatible adapter using `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_API_URL`.
- [ ] Run a redacted real provider probe and record only model, latency, tool name, and token usage.

### Task 6: Dynamic Mentor engine and store

**Files:**
- Create: `services/runner/gateway/src/mentor/mentor-engine.ts`
- Create: `services/runner/gateway/src/mentor/mentor-tools.ts`
- Create: `services/runner/gateway/src/mentor/mentor-store.ts`
- Test: corresponding `*.test.ts` files

**Interfaces:**
- Produces: `runMentorTurn(request, adapters): Promise<MentorTurnResult>` and session persistence methods.

- [ ] Write failing tests for model-selected arguments, observation-dependent replanning, repeats, ask/finish, early stop, budget, fallback, verdict conflicts, and persisted phases.
- [ ] Implement the validated tool registry and single observe/act loop.
- [ ] Implement bounded JSON persistence and current-event migration.
- [ ] Run focused engine/store tests.

### Task 7: Socratic protocol and Mentor endpoints

**Files:**
- Create: `services/runner/gateway/src/mentor/mentor-validation.ts`
- Modify: `services/runner/gateway/src/server.ts`
- Test: `services/runner/gateway/src/server.test.ts`

**Interfaces:**
- Produces: `POST /mentor/sessions`, `POST /mentor/sessions/:id/turns`, `GET /mentor/sessions/:id`

- [ ] Write failing endpoint tests for prediction, learner response, edit/run observation, transfer scheduling, privacy, and compatibility behavior.
- [ ] Implement validation, phase transitions, endpoints, and safe error responses.
- [ ] Run gateway tests and typecheck.

### Task 8: Persistent Mentor timeline

**Files:**
- Create: `web/src/lib/mentor-client.ts`
- Test: `web/src/lib/mentor-client.test.ts`
- Create: `web/src/components/MentorTimeline.tsx`
- Test: `web/src/components/MentorTimeline.test.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Consumes: versioned Mentor session/timeline responses.
- Produces: always-visible timeline and inline prediction/reflection submissions.

- [ ] Write failing parser and interaction tests for every event type, inline response, runtime/trust labels, fallback, and accessibility.
- [ ] Implement the client, timeline, session lifecycle, and layout.
- [ ] Remove the four-level panel from the primary configured flow while retaining explicit fallback.
- [ ] Run focused web tests and typecheck.

### Task 9: Verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `services/runner/README.md`
- Create: `docs/architecture/mentor-learning-loop.md`

- [ ] Document configuration, truth rules, data model, tools, session phases, local commands, migration, and limitations.
- [ ] Run `npm run verify`, gateway tests, OpenSpec strict validation, a redacted DeepSeek experiment, API smoke calls, and a real-browser failed-submission-to-Socratic-response flow.
- [ ] Review changed files, imports, secrets, dependency scope, environment documentation, and every OpenSpec scenario before marking tasks complete.

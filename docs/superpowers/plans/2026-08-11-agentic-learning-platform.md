# Agentic Learning Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 754-problem local practice app into the first deployable agentic learning core with persisted problem intelligence, learner memory, auditable planning, and an AI-native Today/workspace loop.

**Architecture:** Corpus generation owns durable problem intelligence; pure TypeScript owns learner memory and deterministic orchestration; Fastify exposes bounded synchronization and agent routes; React consumes the same contracts with local fallback. The judge remains authoritative, while model providers may only improve explanations and intervention selection.

**Tech Stack:** Node.js 24, TypeScript 6, React 19, Vite 8, Fastify 5, Vitest 4, OpenSpec.

## Global Constraints

- Preserve all 754 canonical IDs and the immutable `archive/original/` source backup.
- Never classify inferred skills as human verified.
- Never send hidden tests, model keys, or unrestricted source archives to the browser or model.
- Keep the product functional without an AI provider or learning backend.
- Write a failing test before each production behavior.

---

### Task 1: Problem intelligence pipeline

**Files:**
- Create: `scripts/lib/problem-intelligence.mjs`
- Create: `scripts/lib/problem-intelligence.test.mjs`
- Modify: `scripts/lib/build-corpus.mjs`
- Modify: `scripts/tests/build-corpus.test.mjs`
- Modify: `web/src/lib/catalog.ts`
- Modify: `web/src/lib/skills.ts`

**Interfaces:**
- Produces `classifyProblem(record, annotation)` and catalog fields `skills`, `classification`, `quality`.
- Consumers use `problem.skills` first and keyword inference only for legacy catalogs.

- [ ] Write tests proving Golden annotations win, inferred classifications are labeled, and index-only quality is not practice-ready.
- [ ] Run the focused tests and confirm failures caused by missing contracts.
- [ ] Implement the classifier and merge Golden annotations during corpus generation.
- [ ] Rebuild the corpus and assert all 754 entries have valid classification metadata.
- [ ] Update frontend catalog types and skill selection, then run script and web skill tests.

### Task 2: Learner memory and event log

**Files:**
- Create: `web/src/lib/learner-memory.ts`
- Create: `web/src/lib/learner-memory.test.ts`
- Modify: `web/src/lib/backup.ts`
- Modify: `web/src/lib/backup.test.ts`

**Interfaces:**
- Produces `LearnerProfile`, `LearningEvent`, `LearnerMemory`, `loadLearnerMemory`, `saveLearnerMemory`, `appendLearningEvent`.
- Backup version 3 consumes and restores learner memory while importing v1/v2.

- [ ] Write parser, migration, deduplication and bounded-retention tests and verify they fail.
- [ ] Implement the versioned profile/event contracts and local repository.
- [ ] Add backup v3 tests for replace/merge and verify old backups still import.
- [ ] Implement backup migration and rerun all backup/memory tests.

### Task 3: Auditable learning orchestrator

**Files:**
- Create: `web/src/lib/learning-orchestrator.ts`
- Create: `web/src/lib/learning-orchestrator.test.ts`
- Modify: `web/src/lib/daily-plan.ts`
- Modify: `web/src/lib/daily-plan.test.ts`

**Interfaces:**
- Produces `orchestrateLearning(input): AgentDecision` with `traceId`, `tools`, `evidence`, `confidence`, and ordered `actions`.
- Consumes learner profile, catalog, mastery, attempts, progress and learning events.

- [ ] Write failing tests for baseline, deadline urgency, due review, assisted-pass mastery check and deterministic trace output.
- [ ] Implement the minimal tool-constrained orchestrator.
- [ ] Refactor daily-plan selection behind the orchestrator without changing legacy behavior.
- [ ] Run orchestrator and daily-plan suites.

### Task 4: Backend learning contracts

**Files:**
- Create: `services/runner/gateway/src/learning-validation.ts`
- Create: `services/runner/gateway/src/learning-store.ts`
- Create: `services/runner/gateway/src/learning-validation.test.ts`
- Create: `services/runner/gateway/src/learning-store.test.ts`
- Modify: `services/runner/gateway/src/server.ts`
- Modify: `services/runner/gateway/src/server.test.ts`

**Interfaces:**
- Produces `GET/PUT /learners/:id/profile`, `POST/GET /learners/:id/events`, and `POST /agent/plan`.
- `LearningStore` supports idempotent append and can be replaced by a durable production adapter.

- [ ] Write failing route and repository tests for validation, idempotency, limits and no hidden data.
- [ ] Implement strict validators and in-memory test repository.
- [ ] Implement optional file-backed single-instance repository using atomic replacement.
- [ ] Add routes without changing existing runner/coach behavior.
- [ ] Run the full gateway suite and typecheck.

### Task 5: Agent-native Today and workspace events

**Files:**
- Create: `web/src/components/LearnerGoalCard.tsx`
- Create: `web/src/components/LearnerGoalCard.test.tsx`
- Modify: `web/src/pages/TodayPage.tsx`
- Modify: `web/src/pages/pages.test.tsx`
- Modify: `web/src/components/CoachPanel.tsx`
- Modify: `web/src/components/CoachPanel.interaction.test.tsx`
- Modify: `web/src/components/ProblemReader.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- Today consumes `AgentDecision` and exposes editable `LearnerProfile`.
- Coach emits `hint-requested`, `hint-received`, and `reference-unlocked` events.

- [ ] Write failing component tests for goal editing, decision evidence and assisted-completion events.
- [ ] Implement goal card and Agent decision presentation using existing light design tokens.
- [ ] Wire learner memory into App state and backup.
- [ ] Record hint/reference events without storing source code in telemetry.
- [ ] Add mastery-check next action and run focused component tests.

### Task 6: Production documentation and verification

**Files:**
- Modify: `services/runner/.env.example`
- Modify: `services/runner/README.md`
- Modify: `docs/deployment.md`
- Create: `docs/architecture/agentic-learning-platform.md`
- Modify: `README.md`

**Interfaces:**
- Documents local fallback, model gateway, learning event storage, production database adapter and multi-Agent handoff boundaries.

- [ ] Document exact local and production commands, secrets and data paths.
- [ ] Validate the OpenSpec change with `openspec validate build-agentic-learning-platform --strict`.
- [ ] Run `npm run verify` and `npm --prefix services/runner/gateway test`.
- [ ] Start the gateway and Vite app, verify health plus Today/Problem primary flows in a real browser.
- [ ] Review changed files for secrets, broken imports, disabled checks and intent gaps.

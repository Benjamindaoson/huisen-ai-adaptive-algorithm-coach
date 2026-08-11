# Mentor Production Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four explicitly disclosed Mentor gaps with auditable expectation consensus, interprocedural semantic evidence, value-level runtime traces, PostgreSQL durability, and signed learner ownership.

**Architecture:** Preserve `runMentorTurn` and `MentorStore` as deep-module seams. Add server-only adapters for corpus solutions, expectation consensus, semantic enrichment, trace parsing, PostgreSQL, and HMAC identity; keep every weaker fallback explicit in runtime metadata.

**Tech Stack:** TypeScript 6, Fastify 5, Tree-sitter, Judge0, PostgreSQL/pg, React 19, Vitest, Playwright.

## Global Constraints

- Formal verdicts always use learner original source; instrumented copies are diagnostic-only.
- Human-reviewed and reference-consensus evidence are distinct authorities.
- Reference source, hidden tests, credentials, and secrets never enter model or browser payloads.
- PostgreSQL mode fails closed; file fallback is selected only when database configuration is absent.
- Every production behavior follows a witnessed RED → GREEN test cycle.

---

### Task 1: Reference consensus oracle

**Files:**
- Create: `services/runner/gateway/src/mentor/reference-solution-repository.ts`
- Create: `services/runner/gateway/src/mentor/reference-consensus-oracle.ts`
- Test: matching `.test.ts` files
- Modify: `services/runner/gateway/src/mentor/code-intelligence.ts`, `trusted-expectations.ts`, `mentor-engine.ts`, `server.ts`

**Interfaces:**
- Produces: `ExpectedObservation.authority` with `human-reviewed | reference-consensus | candidate | unverified`
- Produces: `createReferenceConsensusOracle({ repository, execute })`

- [ ] Write tests for two-language agreement, disagreement, single success, cache reuse, authority, and source non-disclosure.
- [ ] Run focused tests and confirm failure because the oracle/types do not exist.
- [ ] Implement bounded repository lookup, execution, normalization, digest cache, and reviewed-first composition.
- [ ] Run focused tests and confirm pass.

### Task 2: Interprocedural semantics

**Files:**
- Create: `services/runner/gateway/src/mentor/semantic-analysis.ts`
- Test: `services/runner/gateway/src/mentor/semantic-analysis.test.ts`
- Modify: `code-parser.ts`, `code-intelligence.ts`, `mentor-engine.ts`

**Interfaces:**
- Produces: `SemanticReport { precision, functions, callGraph, dominators, reachingDefinitions, pathRisks }`

- [ ] Write four-language fixtures with an entry point, helper call, branch use, and possible missing definition.
- [ ] Run tests and confirm missing semantic report failure.
- [ ] Implement language-specific name/callee extraction plus bounded graph algorithms.
- [ ] Integrate the report into Mentor evidence without promoting risks to verified diagnoses.
- [ ] Run focused tests and confirm pass.

### Task 3: Runtime value traces

**Files:**
- Create: `services/runner/gateway/src/mentor/runtime-trace.ts`
- Test: `services/runner/gateway/src/mentor/runtime-trace.test.ts`
- Modify: `code-intelligence.ts`, `mentor-engine.ts`

**Interfaces:**
- Produces: `RuntimeTraceEvent { probeId, line, state, evidenceRef }`
- Produces: `parseRuntimeTrace(stderr)`

- [ ] Write failing tests for safe state selection, each language's trace source, malformed stderr, event bounds, and original-source preservation.
- [ ] Implement conservative identifier probes and defensive JSON-line parsing.
- [ ] Execute representative probes through Judge0 for all four languages.
- [ ] Render structured state summaries in the Mentor timeline and run focused tests.

### Task 4: PostgreSQL Mentor repository

**Files:**
- Create: `services/runner/gateway/src/mentor/postgres-mentor-store.ts`
- Create: `services/runner/gateway/src/mentor/configured-mentor-store.ts`
- Test: matching unit/integration tests
- Modify: gateway package files, `server.ts`, Compose and env examples

**Interfaces:**
- Produces: existing `MentorStore` plus `mode: postgres | file-local`

- [ ] Write a shared repository contract covering ownership, clone safety, upsert, retention, migration, and restart retrieval.
- [ ] Run contract against missing PostgreSQL adapter and confirm RED.
- [ ] Add `pg`, schema initialization, transactions, upserts, and retention.
- [ ] Run the contract against the live Compose database.
- [ ] Add configured selection and migration, then rerun unit/integration tests.

### Task 5: Signed learner identity

**Files:**
- Create: `services/runner/gateway/src/learner-identity.ts`
- Create: `web/src/lib/learner-identity-client.ts`
- Test: matching test files and server route tests
- Modify: `server.ts`, Mentor/learning clients and components

**Interfaces:**
- Produces: `POST /auth/anonymous`
- Consumes: `Authorization: Bearer <signed-token>`

- [ ] Write failing issue/expiry/tamper/subject-mismatch tests.
- [ ] Implement HMAC-SHA256 tokens and fail-closed route guards when configured.
- [ ] Write failing frontend cache/refresh/header tests.
- [ ] Implement credential refresh and protected requests.
- [ ] Verify cross-learner access returns a non-enumerating authorization response.

### Task 6: Integrated verification and evaluation

**Files:**
- Modify: operations/architecture docs and browser smoke script
- Create: `docs/research/2026-08-11-mentor-product-scorecard.md`

- [ ] Run all focused tests, `npm run verify`, strict OpenSpec validation, Compose validation, audit, and secret scan.
- [ ] Rebuild and start Compose; verify health, four languages, consensus, database restart persistence, auth rejection, and DeepSeek mode.
- [ ] Run Playwright primary flow and inspect screenshot/console errors.
- [ ] Score implementation evidence across code intelligence, Agent runtime, pedagogy, trust, platform, and UI; list only genuine remaining limits.

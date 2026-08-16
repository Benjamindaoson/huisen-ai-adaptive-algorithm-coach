# Production Full-stack Learning Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current local-first React/Fastify prototype into a China-ready production platform with fully connected authoritative backend, 754 trusted judge packs, evidence-bound Mentor Runtime, and an isolated global portfolio deployment.

**Architecture:** Keep the Fastify application as a modular monolith for transactional learning workflows, but move untrusted execution into a private dedicated Judge0 worker pool. PostgreSQL owns durable business facts, Redis owns only short coordination, object storage owns large artifacts, and the React app uses one versioned PlatformClient with an offline draft/outbox layer. One immutable build deploys to an isolated China production plane and an isolated global Demo plane.

**Tech Stack:** React 19, TypeScript 6, Vite, Fastify 5, PostgreSQL 16, Redis 7, Judge0 CE, DeepSeek API, Tree-sitter, OpenAPI/JSON Schema, OpenTelemetry, Docker, OpenTofu/Terraform, GitHub Actions.

**Spec:** `openspec/changes/productionize-fullstack-learning-platform/design.md` and `openspec/changes/productionize-fullstack-learning-platform/specs/`

## Global Constraints

- Production must never use `permissive-local`, public Judge0 fallback, browser-authoritative verdicts or fabricated Agent evidence.
- Hidden tests, expected output, oracle code and reference answers must never enter the browser bundle, ordinary logs or model context.
- PostgreSQL is authoritative; Redis may not be the sole owner of non-reconstructable business state.
- Mentor production promotion requires at least 100 eligible real teacher-adjudicated cases and every configured quality threshold.
- Catalog production judgment requires exactly 754/754 current content hashes with trusted judge packs.
- Target RPO is 15 minutes and RTO is 60 minutes; targets require restoration evidence, not configuration alone.
- China production and global Demo share artifacts and contracts but never share data, secrets or infrastructure state.
- Free tier remains a real learning loop, but all external compute and model work is enforced by server-side quotas and budgets.

---

## Delivery map

| Milestone | Deliverable | Exit evidence | Cost status |
|---|---|---|---|
| M0 | Reproducible production-like local stack | One command starts gateway, DB, Redis, object store, Judge0; smoke report green | Free on local machine |
| M1 | Identity and server-authoritative learning core | Cross-device and cross-user isolation E2E green; local migration reconciles | Free locally |
| M2 | Durable judge platform | Restart/reconcile/security tests green; public fallback removed | Local free; cloud compute paid |
| M3 | 50 gold problems + connected Web App | 50/50 trusted judge packs; browser run/submit/exam green | Small cloud optional |
| M4 | Production Mentor | Evidence trace, fallback and 100-case quality gate green | Teacher review + API spend |
| M5 | 754/754 judging | Coverage, mutation and integrity reports green | Content-review labor |
| M6 | Operations and dual deployment | Demo live; private China environment; observability, backup and rollback evidence | Demo can be free/cheap; production paid |
| M7 | General availability | Every hard gate green plus ICP/licensing evidence where applicable | Minimum sustainable production budget |

Engineering work for one experienced full-stack/AI engineer is approximately 14–20 focused weeks. The 754-problem review and 100-case teacher adjudication are separate evidence tracks and should run in parallel; their duration depends on available human reviewers and cannot be replaced by generated labels.

### Task 1: Establish contracts and a production-like local stack

**Files:**
- Create: `services/runner/gateway/src/platform-contract/`
- Create: `services/runner/gateway/src/operations/capabilities.ts`
- Create: `services/runner/compose.production-like.yml`
- Create: `scripts/verify-production-baseline.mjs`
- Modify: `services/runner/gateway/src/server.ts`
- Modify: `package.json`
- Test: `services/runner/gateway/src/platform-contract/*.test.ts`

**Interfaces:**
- Produces: versioned `/api/v1`, shared error envelope, capability health and idempotency headers.
- Consumes: existing Fastify server, runner, Mentor and learning contracts.

- [ ] Write failing contract tests for health, auth-required responses, validation, idempotency and unavailable dependencies.
- [ ] Generate the current machine-readable baseline: 754 catalog, 4 hidden packs, current storage/identity/model modes and release gates.
- [ ] Implement schemas and capability health behind a small interface.
- [ ] Add a complete local compose profile with persistent volumes and explicit health checks.
- [ ] Run `npm test`, gateway typecheck and a real health/run/database smoke flow.
- [ ] Commit only after the baseline report and local-stack proof are reproducible.

### Task 2: Build production identity and authorization

**Files:**
- Create: `services/runner/gateway/src/identity/`
- Create: `services/runner/gateway/migrations/001_identity.sql`
- Create: `web/src/lib/identity-client.ts`
- Create: `web/src/pages/AuthPage.tsx`
- Modify: `services/runner/gateway/src/server.ts`
- Modify: `web/src/App.tsx`
- Test: `services/runner/gateway/src/identity/*.test.ts`, `web/src/pages/AuthPage.test.tsx`

**Interfaces:**
- Produces: `IdentityContext`, protected session cookie, CSRF contract, role checks and anonymous claim receipt.
- Consumes: PostgreSQL pool and `/api/v1` platform errors.

- [ ] Write tests for registration, verification, login, rotation, recovery, revocation, CSRF, brute-force limiting and cookie flags.
- [ ] Write cross-user tests for every protected resource family before wiring handlers.
- [ ] Add migrations and repository adapters, then implement Argon2id and rotating sessions.
- [ ] Implement anonymous-to-account data claim with idempotent receipt.
- [ ] Make unsafe production identity configuration fail startup.
- [ ] Add browser E2E for account lifecycle and two-user isolation.

### Task 3: Move learning facts to PostgreSQL

**Files:**
- Create: `services/runner/gateway/migrations/002_learning.sql`
- Create: `services/runner/gateway/src/learning/`
- Create: `web/src/lib/platform-client.ts`
- Create: `web/src/lib/offline-outbox.ts`
- Modify: `web/src/lib/learning-client.ts`
- Modify: `web/src/App.tsx`
- Test: `services/runner/gateway/src/learning/*.test.ts`, `web/src/lib/offline-outbox.test.ts`

**Interfaces:**
- Produces: snapshot, incremental sync, append events, draft/version conflict, export/delete and reconciliation report.
- Consumes: `IdentityContext`, existing learner event validators and deterministic projections.

- [ ] Write transaction and idempotency tests with concurrent clients and process restarts.
- [ ] Add normalized schema, event receipt ledger and projection checkpoints.
- [ ] Implement snapshot/incremental endpoints and the single PlatformClient.
- [ ] Implement browser dry-run import, outbox retry and conflict UI.
- [ ] Migrate progress, practice, exams, delayed reviews and twin projections one domain at a time with dual-read comparison.
- [ ] Disable browser authority only after cross-device E2E and reconciliation reports pass.

### Task 4: Make submissions durable and Judge0 private

**Files:**
- Create: `services/runner/gateway/migrations/003_judging.sql`
- Create: `services/runner/gateway/src/judging/`
- Modify: `services/runner/gateway/src/submissions.ts`
- Modify: `services/runner/gateway/src/judge0.ts`
- Modify: `services/runner/docker-compose.yml`
- Modify: `web/src/lib/runner-client.ts`
- Test: `services/runner/gateway/src/judging/*.test.ts`, `web/src/lib/runner-client.test.ts`

**Interfaces:**
- Produces: durable create/poll/cancel/reconcile submission state and safe learner verdict.
- Consumes: immutable problem version and private Judge0 adapter.

- [ ] Write failing restart, duplicate dispatch, timeout, cancel and hidden-data leakage tests.
- [ ] Add durable submission and state-transition schema.
- [ ] Implement a reconciler so uncertain dispatch can recover without double scoring.
- [ ] Harden Judge0 into a separate credential-free private worker pool with egress denial and resource controls.
- [ ] Remove `PUBLIC_RUNNER_URL` from production behavior and add explicit client degradation.
- [ ] Run malicious-code containment, restart and saturation smoke tests.

### Task 5: Build the trusted judge-pack factory

**Files:**
- Create: `quality/judge-packs/schema.json`
- Create: `quality/judge-packs/manifests/`
- Create: `scripts/build-judge-pack.mjs`
- Create: `scripts/check-judge-coverage.mjs`
- Create: `scripts/mutation-test-judge-pack.mjs`
- Modify: `scripts/build-corpus.mjs`
- Modify: `package.json`
- Test: `scripts/*.test.mjs`

**Interfaces:**
- Produces: immutable manifest keyed by problem content hash, oracle consensus, hidden cases, mutation score and reviewer receipt.
- Consumes: normalized catalog and reference solutions.

- [ ] Define promotion rules and write tamper/stale/duplicate/oracle-disagreement tests.
- [ ] Implement reference execution, differential generation, shrink/deduplicate and mutation scoring.
- [ ] Complete a manually reviewed 50-problem pilot before scaling tooling.
- [ ] Process batches of 100 with a published coverage dashboard and regression comparison.
- [ ] Make catalog publication fail until current coverage is 754/754.

### Task 6: Productionize Mentor Runtime and evaluation

**Files:**
- Create: `services/runner/gateway/migrations/004_mentor_runtime.sql`
- Refactor: `services/runner/gateway/src/mentor/`
- Refactor: `services/runner/gateway/src/mentor-os/`
- Modify: `web/src/components/MentorDock.tsx`
- Modify: `web/src/pages/QualityWorkbenchPage.tsx`
- Modify: `scripts/check-mentor-quality-v2.mjs`
- Test: gateway Mentor tests, web Mentor tests and adversarial evaluation scripts.

**Interfaces:**
- Produces: persisted run graph, tool result, evidence reference, approval, cost and stop reason.
- Consumes: submission snapshot, judge summary, AST/CFG, trusted retrieval, learner projection and DeepSeek adapter.

- [ ] Write failing tests for unsupported conclusions, illegal tools, hidden-answer access, provider failure, budget exhaustion and stale editor diff.
- [ ] Persist every run/model/tool/policy artifact and expose a redacted trace.
- [ ] Implement bounded planning, replanning, verification and stop behavior.
- [ ] Add circuit breaking and deterministic fallback without fabricated evidence.
- [ ] Connect real blind teacher comparison and adjudication storage.
- [ ] Import, review and score at least 100 eligible real cases; production remains blocked until the gate passes.

### Task 7: Complete React integration and critical journeys

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/RunnerPanel.tsx`
- Modify: `web/src/components/ExamWorkspace.tsx`
- Modify: `web/src/components/MentorDock.tsx`
- Modify: `web/src/pages/*.tsx`
- Create: `web/e2e/`
- Test: Vitest and browser E2E against the production-like stack.

**Interfaces:**
- Produces: a real Web App whose visible capabilities reflect backend state and policy.
- Consumes: PlatformClient, identity session, sync snapshot, durable judging and Mentor trace.

- [ ] Add production build test that fails without API configuration.
- [ ] Replace domain-specific fetch/config branches with PlatformClient.
- [ ] Connect registration, bootstrap, sync, run, submit, two exam modes, Mentor, quality and export/delete.
- [ ] Implement recoverable loading, queue, offline, conflict, quota and dependency failure states.
- [ ] Prove all critical journeys on desktop and mobile; save traces/screenshots as release artifacts.

### Task 8: Add entitlements and hard cost controls

**Files:**
- Create: `services/runner/gateway/migrations/005_entitlements.sql`
- Create: `services/runner/gateway/src/entitlements/`
- Create: `web/src/components/UsageStatus.tsx`
- Modify: execution and Mentor dispatch modules.
- Test: atomic quota, replay, concurrency, reset and budget tests.

**Interfaces:**
- Produces: atomic `authorizeAndReserve`, `commitUsage`, `releaseReservation` and audited admin grant.
- Consumes: authenticated learner, execution estimate and model token/cost result.

- [ ] Write race tests proving concurrent requests cannot exceed quota.
- [ ] Implement Free/Pro entitlement and usage ledger.
- [ ] Reserve quota before Judge0/DeepSeek work and reconcile actual usage after completion.
- [ ] Add environment monthly budgets, alerts and hard fallback rules.
- [ ] Show accurate remaining usage and reset times in the Web App.

### Task 9: Add production operations and security gates

**Files:**
- Create: `services/runner/gateway/src/observability/`
- Create: `infra/observability/`
- Create: `docs/security/huawei-test-threat-model.md`
- Create: `docs/runbooks/`
- Create: `.github/workflows/verify-production.yml`
- Modify: gateway startup and all external adapters.

**Interfaces:**
- Produces: traces, metrics, redacted logs, alerts, backup/restore proof, security scan results and runbooks.
- Consumes: trace IDs from PlatformClient through gateway, DB, Judge0 and model calls.

- [ ] Instrument RED and business metrics without learner source or secrets.
- [ ] Add dashboards and alert tests for API, queue, judge, AI, sync and cost.
- [ ] Add repository-grounded threat model and verify each required mitigation.
- [ ] Automate PITR backup restoration and reconciliation report for RPO 15m/RTO 60m.
- [ ] Run load, failure and containment game days and attach reports to CI evidence.

### Task 10: Create dual deployment and progressive delivery

**Files:**
- Create: `infra/modules/`
- Create: `infra/environments/demo/`
- Create: `infra/environments/china-production/`
- Create: `.github/workflows/deploy-demo.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `docs/runbooks/release-and-rollback.md`

**Interfaces:**
- Produces: immutable versioned deployment for Demo and China production with separate state and secrets.
- Consumes: verified frontend bundle, gateway image, migrations and production evidence manifest.

- [ ] Implement reusable network, compute, database, Redis, object store, secret, monitoring and Judge0 modules.
- [ ] Deploy global Demo with limited data/quotas and explicit Demo status.
- [ ] Select the China provider only after verifying the user's account, trial eligibility and filing path; implement one provider adapter.
- [ ] Deploy private China pre-production and run full acceptance.
- [ ] Add ICP/licensing evidence input, canary promotion and automatic rollback.

### Task 11: Final acceptance and launch

**Files:**
- Create: `artifacts/release-evidence/<version>/`
- Modify: `README.md`
- Modify: `openspec/changes/productionize-fullstack-learning-platform/tasks.md`
- Test: complete `npm run verify`, production E2E, security, load, restore and browser acceptance.

**Interfaces:**
- Produces: signed release evidence manifest mapping every OpenSpec scenario to automated or human proof.
- Consumes: all previous milestone reports.

- [ ] Verify 754/754 trusted judge packs and at least 100 eligible real Mentor cases.
- [ ] Verify no unaccepted Critical/High security findings and every SLO/recovery/cost gate.
- [ ] Reconcile migrated data and remove legacy production authority/fallbacks.
- [ ] Run independent desktop/mobile acceptance for both planes.
- [ ] Promote only if every hard gate is green; otherwise publish the exact blocker without changing the definition of completion.

## Recommended execution order

Start Tasks 1–4 sequentially because identity, data ownership and durable submissions define every later seam. Run Task 5 content production and Task 6 human evaluation in parallel with Tasks 7–10 once their tooling exists. Do not wait until the final week to seek teachers, create hidden tests, apply for ICP filing or verify a domestic cloud account; those are the critical external paths.

## Definition of “100%”

This plan reaches 100% only when all OpenSpec tasks and scenarios have passing evidence. It does not mean the service can never fail. It means there is no known core flow still implemented as a mock/local-only fallback, every catalog problem has a trusted judge pack, Mentor has real adjudicated quality evidence, production recovery/security/SLO gates have been exercised, and the two deployment planes are genuinely running under their declared constraints.

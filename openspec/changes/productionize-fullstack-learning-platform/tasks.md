## 1. Baseline and executable contracts

- [x] 1.1 Capture the current frontend, gateway, runner, storage, quality and 754-problem coverage baselines as machine-readable reports.
- [x] 1.2 Define `/api/v1` OpenAPI schemas, shared error envelopes, capability health and idempotency contracts with failing contract tests first.
- [x] 1.3 Create a production-like local stack with gateway, PostgreSQL, Redis, object storage and isolated Judge0, plus one-command startup and health verification.
- [x] 1.4 Add CI jobs for gateway/web tests, typecheck, build, migrations, contracts and local-stack smoke checks without weakening the existing Mentor gate.

## 2. Production identity and authorization

- [x] 2.1 Add database migrations and repositories for users, credentials, sessions, devices, verification/recovery tokens, roles and audit events.
- [x] 2.2 Implement Argon2id registration, verification, sign-in, rotating cookie sessions, CSRF protection, recovery, sign-out and session revocation with abuse tests.
- [x] 2.3 Enforce owner/role authorization at every protected repository and route, including cross-learner and reviewer/admin negative tests.
- [x] 2.4 Implement anonymous identity upgrade with idempotent ownership migration and reconciliation evidence.
- [x] 2.5 Make production startup fail when permissive identity, default credentials, weak secrets or unsafe cookie/origin settings are detected.

## 3. Authoritative learning data

- [x] 3.1 Add normalized migrations and repositories for learner profiles, semantic events, attempts, drafts, progress, exams, mastery projections and delayed reviews.
- [x] 3.2 Implement transactional idempotent event ingestion, monotonic versions, conflict responses and deterministic projection jobs.
- [x] 3.3 Add authenticated snapshot/bootstrap, incremental sync, export and deletion endpoints with retention and audit behavior.
- [x] 3.4 Build the browser outbox and migration importer for existing localStorage data with dry-run, retry, conflict and per-user reconciliation reports.
- [x] 3.5 Switch cross-device progress, attempts, exams and learning recommendations to server authority while retaining offline drafts only.

## 4. Durable sandboxed code judging

- [x] 4.1 Add durable submission, submission-attempt, judge-pack, execution-artifact and state-transition schemas and repositories.
- [x] 4.2 Replace in-memory submissions with create, poll, cancel, reconcile and idempotent dispatch flows backed by PostgreSQL and private Judge0.
- [ ] 4.3 Harden the Judge0 network and worker image with dedicated hosts, no credentials, blocked egress, resource limits, image scanning and destructive-code containment tests.
- [x] 4.4 Remove the production public-Judge0 fallback and add explicit degraded/queued client states and end-to-end execution tests.
- [x] 4.5 Add queue-age, runtime, verdict, retry, saturation and cost telemetry without logging source code or hidden cases.

## 5. 754-problem trusted judge-pack program

- [x] 5.1 Define the canonical judge-pack manifest, content hashing, oracle, provenance, review and promotion workflow with tamper tests.
- [x] 5.2 Build reference-solution execution, differential test generation, mutation testing, duplicate detection and four-language smoke tooling.
- [ ] 5.3 Produce and review the first 50 gold judge packs, then prove creation, submission and report flows end to end.
- [ ] 5.4 Expand reviewed packs in batches of 100 with automated coverage reports and no regression to previously trusted versions.
- [ ] 5.5 Reach 754/754 passing manifests and make catalog publication fail for missing, stale or untrusted judge packs.

## 6. Trustworthy Mentor production runtime

- [ ] 6.1 Persist immutable Mentor runs, steps, model calls, tool calls, evidence, policies, approvals, token/cost usage and stop reasons in PostgreSQL/object storage.
- [ ] 6.2 Bind Mentor context to authenticated learner, immutable submission, current editor diff, execution, AST/CFG, trusted RAG and learning-phase evidence.
- [ ] 6.3 Implement the bounded plan/tool/observe/replan/verify/stop loop with schema validation, mode policy, timeout, token, retry and budget controls.
- [ ] 6.4 Implement deterministic fallback, provider circuit breaker, truthful unavailable states and hidden-answer isolation with adversarial tests.
- [ ] 6.5 Connect the teacher workbench to real versioned cases, blind comparison, adjudication, calibrated model review and durable audit storage.
- [ ] 6.6 Import and adjudicate at least 100 eligible real cases and keep production promotion blocked until every segment and quality threshold passes.

## 7. Full React-to-backend integration

- [ ] 7.1 Introduce one typed PlatformClient and remove direct capability-specific fetch/config duplication.
- [x] 7.2 Add registration, sign-in, anonymous upgrade, session management and authenticated app bootstrap UI.
- [ ] 7.3 Connect drafts, progress, attempts, review, insights and daily plan to snapshot plus incremental synchronization.
- [ ] 7.4 Connect run, hidden submission, independent exam and AI-collaboration exam to durable server flows and policy guards.
- [ ] 7.5 Connect Mentor Dock and quality workbench to persisted runtime/quality data and display trace, evidence, costs and degraded states.
- [ ] 7.6 Add browser tests for every critical journey on desktop and mobile against the production-like stack.

## 8. Entitlements and cost control

- [ ] 8.1 Add plan, entitlement, quota-window, usage-ledger and administrative-grant schemas with atomic accounting.
- [ ] 8.2 Define Free and Pro limits for run, submit, Mentor, exam, history and reports and enforce them before external work is dispatched.
- [ ] 8.3 Add token/execution cost attribution, monthly environment budgets, alerts, hard stops and deterministic degradation.
- [ ] 8.4 Add learner-visible usage/reset status and audited admin entitlement controls without integrating real payment yet.

## 9. Reliability, security and operations

- [ ] 9.1 Add OpenTelemetry traces, structured redacted logs, RED metrics, business health, dashboards and actionable alerts.
- [ ] 9.2 Add dependency, container, IaC, license, secret and SAST scanning with expiring exception records and release enforcement.
- [ ] 9.3 Complete repository-grounded threat models for identity, multi-tenancy, Judge0, Mentor/RAG, admin and deployment boundaries and verify mitigations.
- [ ] 9.4 Configure encrypted backups and PITR, automate isolated restoration and publish reconciliation reports proving RPO 15 minutes and RTO 60 minutes.
- [ ] 9.5 Run load, spike, dependency-failure, restart, queue-reconciliation and worker-containment game days against declared SLOs.

## 10. Dual deployment and release engineering

- [ ] 10.1 Build immutable frontend/gateway images and OpenTofu modules for network, compute, PostgreSQL, Redis, object storage, secrets, monitoring and Judge0 worker pools.
- [ ] 10.2 Deploy the isolated global portfolio environment with demo data, low quotas, non-production labeling and no shared production secrets.
- [ ] 10.3 Select one China cloud based on the user's verified account/credits, instantiate its adapter and deploy a private production-like environment.
- [ ] 10.4 Add domain, ICP and applicable licensing evidence checks before public China promotion.
- [ ] 10.5 Implement migration, canary traffic, health gates, automatic rollback, database expand-contract rules and signed release evidence bundles.

## 11. Final production acceptance

- [ ] 11.1 Reconcile all migrated browser data and disable legacy local authority and permissive production modes.
- [ ] 11.2 Verify 754/754 judge coverage, 100+ real Mentor cases, zero unaccepted Critical/High findings and all end-to-end journeys.
- [ ] 11.3 Verify SLO load evidence, cost limits, backup restoration, RPO/RTO, incident runbooks, canary rollback and dependency degradation.
- [ ] 11.4 Conduct independent desktop/mobile acceptance for China production and global Demo and archive screenshots, traces and reports.
- [ ] 11.5 Promote only when every OpenSpec requirement maps to passing automated or signed human evidence; record any external legal or teacher-evidence blocker without falsifying completion.

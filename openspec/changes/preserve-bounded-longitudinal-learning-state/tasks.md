## 1. Retention Contracts

- [x] 1.1 Add browser red tests for the 500 total / 200 milestone / 300 recent invariant, deterministic ordering, and duplicate IDs.
- [x] 1.2 Add browser red tests proving activation metrics, lesson prerequisites, training resume, transfer evidence, and practicum completion survive more than 500 newer events.
- [x] 1.3 Add gateway red tests using equivalent histories and assert browser/gateway retained event-ID parity.
- [x] 1.4 Add backup and PostgreSQL-bootstrap regression tests for recoverable milestones and honest absence.

## 2. Browser Retention Projection

- [x] 2.1 Implement a pure browser `retainLearningEvents` policy with exact milestone keys, mandatory activation facts, deterministic ordering, and hard limits.
- [x] 2.2 Apply projection in learner-memory parse and append so load, record, import merge, and bootstrap all inherit the policy.
- [x] 2.3 Verify existing selectors consume the retained exact events without interface or mastery changes.

## 3. Gateway Retention Projection

- [x] 3.1 Implement the contract-equivalent gateway retention policy without changing PostgreSQL event retention.
- [x] 3.2 Apply projection to file/memory state load and append while preserving replay receipts and idempotency behavior.
- [x] 3.3 Document file-local bounded durability and PostgreSQL recovery authority.

## 4. Evaluation And Delivery

- [x] 4.1 Add and run a deterministic 5,000-event performance probe with elapsed-time and correctness output.
- [x] 4.2 Run focused tests, full tests, lint, typecheck, production build, strict OpenSpec validation, and diff check.
- [x] 4.3 Re-run real-browser activation, diagnosis, training resume, ability-page continuation, and backup export; verify import round trips in integration tests because the connected browser controller has no file-upload primitive.
- [x] 4.4 Record before/after evidence, limitations, decision, and next candidate in `docs/evolution/STATE.md`.

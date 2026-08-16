## 1. Contract and diagnosis

- [x] 1.1 Record the real-browser baseline, target, guardrails, and revert threshold in STATE.
- [x] 1.2 Verify the authoritative profile route accepts the current payload contract.
- [x] 1.3 Add red tests for same-id mutable replacement and immutable conflict preservation.

## 2. Minimal repair

- [x] 2.1 Classify mutable streams before exact-id immutable comparison.
- [x] 2.2 Reset retry metadata only on the replacement snapshot.
- [x] 2.3 Preserve relative order and content of all immutable operations.
- [x] 2.4 Add a bounded retry-reason projection and render it without raw detail.
- [x] 2.5 Canonicalize only a redundant embedded owner while preserving immutable evidence and queue position.
- [x] 2.6 Align account-migration event compatibility with the current authoritative learning contract.
- [x] 2.7 Refresh stale in-memory CSRF once on the explicit server error without retrying other unsafe failures.

## 3. Evaluation

- [x] 3.1 Run focused and full tests, lint, typecheck, build, strict OpenSpec, and diff checks.
- [x] 3.2 Exercise the existing authenticated browser queue only through normal retry and record before/after evidence.
- [x] 3.3 Run the honest Mentor quality gate and update STATE with the result and next opportunity.

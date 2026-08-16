## 1. Baseline and red tests

- [x] 1.1 Record the silent-eviction baseline, metrics, guardrails, evaluation scenarios, and revert threshold in `STATE.md`.
- [x] 1.2 Add a red test proving operation 1 disappears when operation 1,001 is enqueued today.
- [x] 1.3 Add red guardrails for exact duplicates, mutable replacement, oversized persisted files, ordered drain, and failed full-batch retry.
- [x] 1.4 Add a red integration test proving a 1,001-event snapshot cannot synchronize losslessly today.

## 2. Lossless capacity and batching

- [x] 2.1 Remove read-time truncation and implement a typed, pre-mutation 1,000-operation capacity signal.
- [x] 2.2 Preserve exact immutable duplicates and mutable-stream replacement at capacity.
- [x] 2.3 Drain a full ordered batch during snapshot assembly, accumulate versions/conflicts, retry the blocked operation, and continue.
- [x] 2.4 Preserve the ordinary bounded pending/retry path when a capacity-triggered drain fails.

## 3. Evaluation and review

- [x] 3.1 Pass focused outbox, synchronization, acknowledgement, and recovery suites.
- [x] 3.2 Pass full tests, lint, both typechecks, Web production build, Gateway health, and real authenticated browser synchronization.
- [x] 3.3 Pass strict OpenSpec/diff checks, run the Mentor gate honestly, complete ship review, and update `STATE.md` with before/after evidence and the next opportunity.

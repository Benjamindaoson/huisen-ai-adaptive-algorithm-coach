## 1. Baseline and red tests

- [x] 1.1 Record hypothesis, overlap baseline, target, guardrails, and revert threshold in STATE.
- [x] 1.2 Add a red concurrency test proving current code has no reusable coalescing orchestrator.
- [x] 1.3 Add a one-pass execution test for durable writes, state versions, and safe failure results.

## 2. Extract and serialize

- [x] 2.1 Extract one platform synchronization execution from App into a typed module.
- [x] 2.2 Add one-active/latest-trailing coalescing orchestration.
- [x] 2.3 Make automatic and manual triggers share one stable orchestrator.
- [x] 2.4 Preserve outbox, conflict adoption, issue projection, and anonymous behavior.

## 3. Evaluation

- [x] 3.1 Pass focused concurrency/execution tests, full tests, lint, and both typechecks.
- [x] 3.2 Pass Web build, Gateway health, and real authenticated browser synchronization.
- [x] 3.3 Pass strict specs/diff, run Mentor gate honestly, review, and update STATE.

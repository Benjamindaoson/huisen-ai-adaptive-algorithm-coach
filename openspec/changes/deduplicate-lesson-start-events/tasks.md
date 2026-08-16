## 1. Contract and red tests

- [x] 1.1 Record event-growth baseline, semantic key, guardrails, and rollback threshold in `docs/evolution/STATE.md`.
- [x] 1.2 Add failing learner-memory tests for repeat, separate lesson, independent learner, and imported-history cases.
- [x] 1.3 Add failing pedagogical-memory tests for repeat and separate-lesson projections.

## 2. Semantic idempotency

- [x] 2.1 Make `recordLearningSignal` preserve the first start event for a lesson.
- [x] 2.2 Make `recordPedagogicalSignal` preserve the first open projection for a lesson.
- [x] 2.3 Preserve all other event kinds, existing imports, and distinct lesson/learner facts.

## 3. Evaluation and learning

- [x] 3.1 Measure before/after event growth and downstream projection stability.
- [x] 3.2 Run focused/full tests, lint, typecheck, build, strict OpenSpec validation, and diff check.
- [x] 3.3 Record result, decision, limitation, and next candidates in `docs/evolution/STATE.md`.

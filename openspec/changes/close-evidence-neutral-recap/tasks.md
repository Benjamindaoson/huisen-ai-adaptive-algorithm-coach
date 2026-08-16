## 1. Baseline and red tests

- [x] 1.1 Record the passive-recap baseline, metric, guardrails, evaluation scenarios, and revert threshold in `STATE.md`.
- [x] 1.2 Add red component tests for misconception selection, corrected selection, one closure signal, visible mastery boundary, return, and persisted revisit.
- [x] 1.3 Add red projection tests for exact recommendation/source matching and malformed/stale feedback rejection.
- [x] 1.4 Add a mastery-neutral regression test for recap closure.

## 2. Learner-visible closure

- [x] 2.1 Implement a bounded exact-evidence recap reflection projection.
- [x] 2.2 Add the corrected-vs-misconception choice and “我现在明白了” confirmation to recovery recap only.
- [x] 2.3 Restore confirmed closure after rerender/reload and prevent duplicate signals.
- [x] 2.4 Add readable responsive styling without changing ordinary training behavior.

## 3. Evaluation and review

- [x] 3.1 Pass focused training cabin, lesson handoff, mastery, event-validation, and migration suites.
- [x] 3.2 Pass full tests, lint, both typechecks, Web production build, Gateway health, and a real browser recovery-recap flow.
- [x] 3.3 Pass strict OpenSpec/diff checks, run the Mentor gate honestly, complete ship review, and update `STATE.md` with before/after evidence and the next opportunity.

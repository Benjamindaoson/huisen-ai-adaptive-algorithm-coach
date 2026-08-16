## 1. Evaluation contract and red tests

- [x] 1.1 Record the baseline, primary metric, guardrails, and revert threshold in `docs/evolution/STATE.md`.
- [x] 1.2 Add failing pure-projection tests for matching, first-lesson, mismatched, and evidence-free states.
- [x] 1.3 Add a failing LessonPage test for the visible reason, payoff, evidence disclosure, and mastery boundary.

## 2. Evidence-bound handoff

- [x] 2.1 Implement a deterministic lesson-handoff view model that reuses the projected learning action.
- [x] 2.2 Pass the optional handoff from App to LessonPage without changing unlocking or stored events.
- [x] 2.3 Render an accessible plain-language card with progressive evidence disclosure and no empty-state claim.

## 3. Evaluation and learning

- [x] 3.1 Run focused and full tests, lint, typecheck, production build, strict OpenSpec validation, and diff check.
- [x] 3.2 Verify the matching reason and evidence in the real browser and confirm manual mismatch suppression in tests.
- [x] 3.3 Record before/after evidence, keep/revert decision, limitation, and next opportunity in `docs/evolution/STATE.md`.

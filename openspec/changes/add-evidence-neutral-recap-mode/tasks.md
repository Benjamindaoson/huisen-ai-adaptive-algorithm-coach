## 1. Contract and red tests

- [x] 1.1 Record baseline, metric, guardrails, and revert threshold in STATE.
- [x] 1.2 Add a failing component test for explanation-first recap with zero emitted signals.

## 2. Recap implementation

- [x] 2.1 Initialize verified recovery at explanation without mutating stored progress.
- [x] 2.2 Suppress learning signals across replay actions while preserving live transitions.
- [x] 2.3 Label the mode and evidence boundary visibly.

## 3. Evaluation

- [x] 3.1 Run focused/full tests, lint, typecheck, build, strict spec, and diff checks.
- [x] 3.2 Verify recap stage, live replay, return, and hard reload in the real browser.
- [x] 3.3 Run the honest Mentor gate and record decision, learning, and next candidate in STATE.

## 1. Route and validation contract

- [x] 1.1 Record baseline, target, guardrails, and revert threshold in `docs/evolution/STATE.md`.
- [x] 1.2 Add red route tests for encoded optional return identity and backward compatibility.
- [x] 1.3 Add red component tests for visible review context, explicit return, and evidence neutrality.

## 2. Return-aware recovery

- [x] 2.1 Extend the typed training route with optional return lesson and recommendation IDs.
- [x] 2.2 Generate the recovery link through the typed route builder.
- [x] 2.3 Validate recovery context against the current handoff projection in App.
- [x] 2.4 Render the compact training-cabin context and one-click return action.
- [x] 2.5 Merge local-only append events during server bootstrap so a hard refresh cannot erase pending feedback.

## 3. Evaluation and learning

- [x] 3.1 Run focused and full tests, lint, typecheck, build, strict spec validation, and diff check.
- [x] 3.2 Exercise confused handoff → source review → explicit return in the real browser.
- [x] 3.3 Confirm no learning event is emitted by return, run the honest Mentor gate, and update STATE.

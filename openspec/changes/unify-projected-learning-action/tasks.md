## 1. Action Contracts

- [x] 1.1 Add red pure tests for cold, partial, ready, and resumable bridge actions including destination and evidence.
- [x] 1.2 Add red parity tests proving Insights, BridgeEntryDiagnosis, and Mentor contribution use the projected action.
- [x] 1.3 Add preservation tests for review routes and runtime checkpoint priority.

## 2. Shared Projection

- [x] 2.1 Implement the pure projected bridge action value.
- [x] 2.2 Add the route-bounded Mentor fallback projection.
- [x] 2.3 Replace independent BridgeEntryDiagnosis and Insights action logic.
- [x] 2.4 Wire App route contribution to the shared action.

## 3. Evaluation And Delivery

- [x] 3.1 Run focused and full tests, lint, typecheck, build, strict OpenSpec validation, and diff check.
- [x] 3.2 Verify action label and destination parity in the real Insights and Today browser states.
- [x] 3.3 Record before/after evidence, limitations, decision, and next opportunity in `docs/evolution/STATE.md`.

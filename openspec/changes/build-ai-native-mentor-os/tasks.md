## 1. Mentor OS protocol and persistence

- [x] 1.1 Define and validate versioned run, command, context contribution, lifecycle event, checkpoint, approval, and stop-reason contracts.
- [x] 1.2 Implement an idempotent event-sourced Mentor OS store with in-memory and file-local adapters plus restart/retry tests.
- [x] 1.3 Add authenticated start, get, command, approval, event-cursor, and resume gateway endpoints.

## 2. High-signal context compiler

- [x] 2.1 Implement bounded priority compilation from goal, route, attempt, pedagogical events, learner twin, and trusted references with provenance.
- [x] 2.2 Reject forbidden raw/noisy/hidden-test context and record omissions when budgets compact history.
- [x] 2.3 Connect Today, Learn, Practice, Review, AI exam, and Insights context contributors to the compiler.

## 3. Dynamic policy runtime

- [x] 3.1 Wrap the existing dynamic Mentor engine behind Mentor OS commands and persist model/tool/replan/stop lifecycle events.
- [x] 3.2 Enforce independent-assessment denial, tool/time budgets, authority, evidence sufficiency, and answer-leakage policy before model and tool calls.
- [x] 3.3 Add learner approval for every proposed edit and persist accept/reject evidence before applying changes.

## 4. Ambient Mentor experience

- [x] 4.1 Build a persistent global Mentor dock showing goal, observation, hypothesis, evidence gap, tool activity, approval, verification, and one next action.
- [x] 4.2 Add lifecycle streaming with cursor recovery, checkpoint fallback, and honest DeepSeek/deterministic/unavailable states.
- [x] 4.3 Integrate the dock across learning modules and hard-suppress it during independent exams and independent transfer/review assessments.

## 5. Longitudinal outcome evaluation

- [x] 5.1 Implement deterministic sticky experiment assignment, exposure records, and versioned intervention metadata.
- [x] 5.2 Join Mentor runs to the next independent same-skill attempt, different-surface transfer, and delayed review without treating assisted passes as mastery.
- [x] 5.3 Add process/outcome/leakage/wrong-conclusion reports and a fail-closed release gate for insufficient longitudinal evidence.

## 6. Verification and migration

- [x] 6.1 Add migration and backup support for Mentor OS checkpoints, approvals, experiments, and outcome links.
- [ ] 6.2 Run focused and full tests, lint, typecheck, production build, strict OpenSpec validation, quality gates, and real-browser cross-route/recovery/assessment smoke tests. (All automated checks and cross-route/recovery browser flows passed; the final independent-assessment browser interaction remains to be rerun after the browser URL policy interrupted the last smoke step.)
- [x] 6.3 Record honest capability and outcome status; do not label unobserved learning effects as validated.

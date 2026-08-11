## 1. Problem intelligence

- [x] 1.1 Define and test the shared skill-classification and quality contract.
- [x] 1.2 Merge Golden 100 annotations into corpus generation and classify every standard problem.
- [x] 1.3 Emit classification coverage and review-queue quality reports.
- [x] 1.4 Make frontend recommendation and search consume persisted skills.

## 2. Learner memory

- [x] 2.1 Define learner profile, learning event and intervention types with strict parsers.
- [x] 2.2 Persist local learner memory and upgrade backup with backward compatibility.
- [x] 2.3 Record goal changes, attempts, hints and reference-answer unlocks as bounded events.

## 3. Learning orchestrator

- [x] 3.1 Define tool inputs/outputs and auditable AgentDecision schema.
- [x] 3.2 Implement deterministic plan orchestration with goal, mastery, due review and intervention evidence.
- [x] 3.3 Add Fastify profile, event and orchestrator routes with idempotency and input limits.
- [x] 3.4 Preserve deterministic fallback when the learning API or model is unavailable.

## 4. Agent-native experience

- [x] 4.1 Add goal onboarding and editable learner memory to Today.
- [x] 4.2 Show plan evidence, why-this-problem rationale and Agent execution state.
- [x] 4.3 Record hint usage and distinguish independent, assisted and answer-viewed completion.
- [x] 4.4 Add the mastery-check next action after assisted completion.

## 5. Production and extensibility

- [x] 5.1 Document frontend/backend deployment, environment variables and model-key isolation.
- [x] 5.2 Document repository and multi-Agent handoff adapters with deterministic judge boundaries.
- [x] 5.3 Add API, domain, component and corpus regression tests.
- [x] 5.4 Run OpenSpec validation, tests, lint, corpus gates, typecheck, build and browser smoke tests.

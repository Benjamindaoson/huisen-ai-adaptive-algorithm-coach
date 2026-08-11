## 1. Architecture and provider setup

- [x] 1.1 Add gateway-only Tree-sitter dependencies and a lazy four-language parser adapter with degradation tests
- [x] 1.2 Add a DeepSeek OpenAI-compatible tool-calling adapter that reads server-only environment variables, validates tool arguments, and preserves reasoning/tool messages

## 2. Semantic code intelligence

- [x] 2.1 Implement language-neutral syntax, control-flow, def-use, and source-range analysis with JavaScript, Python, Java, and C++ tests
- [x] 2.2 Implement bounded counterexample candidates, runtime probe plans, differential execution contracts, and verified/unverified hypothesis states

## 3. Learner digital twin

- [x] 3.1 Implement the learner twin schema and pure evidence projection for failure, assistance, independent success, transfer, misconception, and forgetting
- [x] 3.2 Persist Mentor sessions and twin projections with validation, bounded history, stable evidence references, and migration from current learner events

## 4. Trusted full-corpus retrieval

- [x] 4.1 Generate a compact retrieval index for all problem, solution, skill, and reviewed misconception documents with trust metadata
- [x] 4.2 Load and search the full index using Chinese BM25/bigrams, skill relevance, learner-state relevance, trust ranking, bounded excerpts, and stable citations

## 5. Dynamic Mentor runtime

- [x] 5.1 Implement a single validated Mentor observe/act loop with model-selected tools and arguments, repeat limits, replanning, explicit ask/finish actions, and deterministic fallback
- [x] 5.2 Add versioned Mentor session/turn endpoints, compatibility handling, privacy checks, provider telemetry, and API integration tests
- [x] 5.3 Run a real DeepSeek tool-call experiment using the environment key without logging or persisting the secret

## 6. Socratic learning loop and workspace

- [x] 6.1 Implement prediction-first session phases, response evaluation, minimum intervention, edit/run observation, transfer task selection/generation, and mastery verification
- [x] 6.2 Replace the primary four-level Coach tab with a persistent editor-side Mentor timeline and inline prediction/reflection controls
- [x] 6.3 Add client parsing, local fallback, accessibility, timeline interaction tests, and truthful runtime/trust labels

## 7. Documentation and verification

- [x] 7.1 Document architecture, DeepSeek configuration, privacy, trust tiers, runtime modes, local execution, migration, and known limits
- [x] 7.2 Run focused red/green tests, full tests, lint, typecheck, corpus/index builds, production build, API smoke checks, model experiment, and real-browser primary-flow verification
- [x] 7.3 Perform ship-readiness review and reconcile every requirement against implementation evidence

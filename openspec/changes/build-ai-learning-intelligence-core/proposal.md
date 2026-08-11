## Why

The product currently exposes an agent-shaped learning workflow, but most decisions are deterministic and the model cannot inspect code, retrieve grounded learning evidence, execute tools, or verify its own conclusions. Reliable judging is also limited to a very small subset of the 754-problem corpus, so AI feedback and mastery claims cannot yet be trusted at product scale.

## What Changes

- Introduce a server-side, permissioned learning-agent runtime that performs an observe → tool call → evidence → action loop and returns a complete audit trace.
- Add deterministic code-diagnostic tools for syntax, input parsing, boundary-risk, complexity-risk, and failing-test evidence; judge results remain authoritative.
- Add local hybrid retrieval over curated problem statements, skills, verified solutions, and learner evidence with explicit source references.
- Replace score-only mastery updates with a calibrated Bayesian evidence model that distinguishes independent, assisted, failed, and transfer attempts.
- Add typed Planner, Diagnostician, Tutor, and Assessor handoffs with separate tool permissions and bounded execution budgets.
- Surface the real runtime trace, evidence, diagnostic hypothesis, Socratic next action, and mastery impact in the problem workspace.
- Add content-quality gates and machine-readable verification status so unverified material cannot be presented as trusted judge evidence.
- Document the later production phases—full-corpus verification, scalable sandbox, voice interview, accounts, and multi-tenant persistence—without representing them as delivered by this change.

## Capabilities

### New Capabilities

- `trusted-problem-evidence`: Machine-readable provenance, verification status, runnable-test coverage, and content-quality gates.
- `code-diagnostics`: Deterministic code inspection and judge-grounded diagnostic evidence with no model-authored verdicts.
- `grounded-learning-retrieval`: Hybrid retrieval across problems, skills, verified solutions, and prior learning evidence with citations.
- `probabilistic-mastery`: Bayesian skill mastery updates that account for assistance, failure, transfer, and evidence confidence.
- `tool-using-learning-agent`: Permissioned tool execution, bounded observe-act loops, typed role handoffs, and auditable traces.
- `agentic-tutor-experience`: Problem-workspace UI for real agent state, evidence, Socratic actions, and mastery impact.

### Modified Capabilities

- `learning-orchestrator`: Replace descriptive pseudo-tool traces with results returned by an executable tool registry.
- `learner-memory`: Record agent runs, diagnostic evidence references, transfer outcomes, and probabilistic mastery observations.
- `problem-intelligence`: Distinguish readable, solution-present, sample-judgeable, hidden-judgeable, and verified content states.

## Impact

- Gateway: new diagnostic, retrieval, mastery, tool-registry, and agent-runtime modules plus `/agent/run` API.
- Web: new agent client/state types and a redesigned tutor panel consuming real traces.
- Corpus: quality metadata and verification-report generation are extended without changing archived source material.
- Tests: deterministic tool behavior, permission enforcement, trace integrity, mastery calibration, retrieval citations, API validation, and browser interactions.
- Dependencies: avoid external AI/vector dependencies in this phase; retrieval and static diagnostics use deterministic local implementations and the existing optional OpenAI-compatible provider.

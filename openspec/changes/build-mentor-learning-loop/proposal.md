## Why

The current learning Agent executes real functions but follows a fixed four-step workflow, uses regex-level code diagnostics, retrieves only the current problem by default, and presents mostly templated hints. It therefore cannot understand a learner's program deeply, test its own diagnosis, adapt a teaching conversation, or establish a durable learning advantage.

This change replaces that facade with one evidence-bound Mentor Agent whose decisions, tool arguments, replanning, verification, stopping condition, and learner-model updates are observable and testable.

## What Changes

- Replace the fixed role-labelled Agent runtime with a single dynamic Mentor loop that can call tools with validated arguments, replan from observations, request more evidence, and finish early.
- Add Tree-sitter-backed syntax analysis, control-flow and def-use summaries, bounded runtime tracing, counterexample generation, and differential execution through the existing judge seam.
- Add a learner digital twin that tracks skill belief, misconception evidence, assistance dependence, independent transfer, forgetting, and evidence confidence.
- Build a full-corpus trusted retrieval index over problems, solutions, skills, misconceptions, and learner events with stable citations and verification tiers.
- Add a multi-turn Socratic protocol that asks for a prediction, evaluates the learner response, gives the minimum useful intervention, observes the next edit/run, and schedules a transfer check.
- Replace the hidden four-level coach tab with a persistent Mentor timeline beside the editor, showing observations, hypotheses, missing evidence, tool actions, verification, and the next learner action.
- Integrate DeepSeek through its OpenAI-compatible tool-calling interface using only server-side environment variables, with deterministic safety fallback and explicit runtime mode.
- **BREAKING**: `/agent/run` is superseded by versioned `/mentor/sessions` and `/mentor/sessions/:id/turns` endpoints. The old endpoint remains temporarily available as a compatibility adapter but is no longer the primary web flow.

## Capabilities

### New Capabilities

- `semantic-code-intelligence`: Parse supported languages, summarize control/data flow, instrument bounded traces, generate counterexamples, and verify hypotheses through execution.
- `learner-digital-twin`: Maintain evidence-calibrated skill, misconception, assistance, transfer, and forgetting state.
- `trusted-learning-retrieval`: Search the complete corpus and learner evidence with stable citations and explicit verification tiers.
- `dynamic-mentor-runtime`: Execute a validated model-driven tool loop with tool arguments, replanning, budgets, safe fallback, and an explicit finish condition.
- `socratic-learning-loop`: Run prediction-first, minimum-intervention teaching turns and validate learning through edits and transfer tasks.
- `mentor-workspace`: Present the Mentor as a persistent timeline integrated with the coding workspace rather than a secondary hint tab.

### Modified Capabilities


## Impact

- Gateway: new Mentor domain modules, DeepSeek adapter, corpus index adapter, session store, endpoints, validation, and tests.
- Web: new Mentor client, session state, timeline workspace, interaction tests, and removal of the four-level button flow as the primary experience.
- Corpus pipeline: trusted Mentor retrieval index and verification metadata.
- Dependencies: Tree-sitter parser and grammars for JavaScript, Python, Java, and C++.
- Operations: `DEEPSEEK_API_KEY`, optional model/base URL variables, persistent Mentor session file, model latency/cost and tool-trace telemetry.

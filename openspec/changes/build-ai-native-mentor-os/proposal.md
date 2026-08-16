## Why

The product now has evidence-backed Mentor tools, learning telemetry, adaptive review, and dual-mode exams, but AI remains fragmented across task-specific panels. To become AI-native, one durable Mentor must own the learning loop across routes, compile minimal high-signal context, choose bounded tools dynamically, expose its evidence and uncertainty, and be evaluated by the learner's next independent performance rather than chat engagement.

## What Changes

- Introduce a persistent Mentor Run that survives route changes and resumes from a checkpoint instead of restarting as a page-local chat.
- Compile route, curriculum, current attempt, semantic learning events, learner-twin evidence, and trusted corpus references into a bounded context packet with explicit provenance.
- Add policy-controlled dynamic tool execution, learner approval for edits, evidence sufficiency checks, replanning, stop reasons, and complete execution traces.
- Make Mentor presence ambient across Today, Learn, Practice, Review, AI-collaboration Exam, and Insights while keeping independent assessment AI-free.
- Stream run lifecycle events and recover incomplete runs without duplicating tool actions.
- Add experiment assignments and outcome joins so releases are gated by next independent attempt, transfer, retention, leakage, and wrong-conclusion metrics.
- Keep the architecture as one deep Mentor OS module with deterministic specialist tools; do not add cosmetic role-named Agents.

## Capabilities

### New Capabilities

- `persistent-mentor-session`: Durable cross-route Mentor runs, checkpoints, lifecycle stream, idempotent resume, and explicit stop reasons.
- `mentor-context-compiler`: Minimal provenance-bound context packets assembled from product state, trusted retrieval, code evidence, and the learner twin.
- `mentor-policy-runtime`: Dynamic bounded tool selection, evidence-aware replanning, human approval, independent-mode denial, and auditable execution traces.
- `ambient-mentor-experience`: A consistent Mentor surface and proactive next action across learning routes without hiding AI in a single tab.
- `mentor-outcome-evaluation`: Experiment assignment, transcript/process evaluation, and longitudinal independent-learning outcome gates.

### Modified Capabilities

None. Existing completed changes remain compatible inputs to Mentor OS.

## Impact

- Gateway: new Mentor OS session/runtime module, context compiler, lifecycle endpoints, persistence adapter, policy checks, and evaluation records.
- Web: a global Mentor dock, run stream client, route-aware context contributions, checkpoint recovery, and independent-assessment suppression.
- Data: versioned session, context packet, tool execution, approval, experiment, and outcome records; no raw keystroke storage.
- Operations: DeepSeek remains optional; the system fails honestly to deterministic evidence tooling when unavailable. Existing Judge0, Tree-sitter, corpus, learner memory, and benchmark modules are reused.

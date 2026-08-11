# Mentor Learning Loop Design

## Outcome

Replace the fixed role-labelled Agent and four-level hint panel with one evidence-bound Mentor that can understand program structure, test hypotheses, maintain a learner twin, retrieve across the full corpus, conduct a prediction-first dialogue, and expose its work in a persistent editor-side timeline.

## External seam

The deep module is `runMentorTurn(request, adapters)`. Callers provide the current session, problem, public judge evidence, source snapshot, learner response, and bounded adapters. They receive a versioned session projection and semantic timeline. Model completion, parsing, retrieval, execution, storage, and fallback stay behind this interface.

## Internal modules

- `mentor-code-intelligence`: lazy Tree-sitter parsing, structural CFG/def-use evidence, probe plans, counterexample candidates, and differential verification contracts.
- `mentor-twin`: pure projection of skill belief, misconceptions, assistance, independent transfer, confidence, and forgetting.
- `mentor-retrieval`: full-corpus index loading and trust-aware Chinese/skill ranking.
- `deepseek-mentor-provider`: native tool-call turns with local schema validation and server-only credentials.
- `mentor-engine`: observe/act loop, budgets, tool registry, session phases, safe fallback, ask/finish actions, and timeline trace.
- `mentor-store`: bounded session and twin persistence.
- `MentorTimeline`: always-visible editor-side session presentation and inline learner responses.

## Truth rules

- Judge outcomes are immutable evidence.
- Hidden tests and secrets never enter model context.
- AST/CFG/def-use are structural observations, not correctness proof.
- A diagnosis becomes supported only after execution evidence reproduces it.
- Candidate solutions can inspire hypotheses but cannot establish expected output.
- Assisted success schedules independent transfer instead of declaring mastery.

## Provider modes

- `deepseek`: native model tool loop with selected arguments and explicit finish.
- `deterministic`: the same tool registry driven by a bounded safe policy.
- `fallback`: a model attempt failed validation or availability and the safe policy took over; the rejection is visible in the timeline.

## Acceptance

The implementation is accepted only when the same real browser flow proves: a failed submission starts a Mentor session; syntax evidence and full-corpus citations appear; the Mentor asks a prediction; a learner response causes a different next action; a tool-backed verification event appears; and the timeline remains visible without switching to an AI tab.

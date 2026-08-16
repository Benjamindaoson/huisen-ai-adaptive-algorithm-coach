## Context

The current gateway has a fixed `runLearningAgent` plan, a provider that can only select a role/tool name, regex diagnostics, and a default evidence resolver containing only the current problem. The web UI exposes this through a four-level hint tab. The corpus contains 754 problem records, but every evidence item has a trust state and only a small reviewed subset has executable tests.

The new design keeps the judge as the verdict authority and makes the Mentor a single deep module. Its external interface is one turn request and one observable timeline response; model calls, parsing, retrieval, execution, learner-state updates, and fallback are internal adapters at explicit seams.

## Goals / Non-Goals

**Goals:**

- Make tool selection, arguments, observations, replanning, and stopping genuinely dynamic when DeepSeek is configured.
- Produce code findings grounded in syntax nodes, control/data-flow summaries, bounded traces, and judge-verified counterexamples.
- Maintain a durable learner twin with misconception, assistance, transfer, forgetting, probability, and confidence state.
- Search the entire local corpus and learner history while retaining verification tiers and stable citations.
- Run a multi-turn prediction-first teaching protocol and expose it as a persistent editor-side timeline.
- Fail closed: the judge owns verdicts, hidden tests never enter model context, and an unavailable model yields an honestly labelled deterministic mentor.

**Non-Goals:**

- Claim formal proof of arbitrary program correctness.
- Expose hidden-test inputs or reference solutions before the existing unlock policy permits them.
- Create multiple conversational Agent personas.
- Replace Judge0 isolation or add production account/billing infrastructure in this change.

## Decisions

### One deep Mentor module

`runMentorTurn(request, adapters)` is the external seam. The module owns the observe/act loop, budgets, phase transitions, validation, trace construction, and final response. Internal adapters cover model completion, syntax parsing, program execution, retrieval, and session persistence. This replaces four shallow role labels with one interface whose result is directly testable.

### Native DeepSeek tool calls

The model adapter uses the OpenAI-compatible `/chat/completions` endpoint with function tools and passes assistant tool calls plus tool results back on every step. Each function has a strict local JSON validator even when provider strict mode is unavailable. The model can choose tool arguments, repeat tools when evidence changes, call `ask_learner`, or call `finish`; it cannot emit a judge verdict. The default orchestration route is the non-reasoning `deepseek-chat` alias, configurable via `DEEPSEEK_MODEL`, because tool selection must complete inside the learner request budget; the provider may resolve that alias to a newer backend model. The key is read only from `DEEPSEEK_API_KEY` or the existing server-side provider variable.

### Tree-sitter-backed code intelligence with safe fallback

The gateway loads Tree-sitter grammars for JavaScript, Python, Java, and C++. It emits a language-neutral syntax tree summary, function/loop/branch nodes, def-use facts, simple control-flow edges, and source ranges. Parse failures return explicit degraded evidence rather than silently using regex. Runtime evidence is obtained only through the existing execution adapter with bounded generated inputs; instrumentation is limited to language-safe probe insertion and never changes the authoritative submission verdict.

### Hypotheses must be executable

Static findings are hypotheses. `generate_counterexample` creates bounded public-shaped candidate inputs; `verify_hypothesis` executes the original submission and, when available, a trusted reference solution on the same input. A hypothesis becomes `supported` only when observable outputs diverge consistently. Otherwise it remains `unverified`.

### Learner twin as evidence projection

The twin stores per-skill beta belief, confidence, last practice time, forgetting half-life, assistance ratio, independent pass count, transfer count, and misconception evidence. Updates are pure functions over typed observations. The server stores the projection with the Mentor session, while the web backup retains a compatible summary.

### Full-corpus trusted retrieval

A build script creates a compact retrieval document for every problem, solution, skill, and reviewed misconception source. The gateway loads the index once and ranks with Chinese character/bigram BM25, skill overlap, learner-state relevance, and trust multipliers. Candidate/unverified content can support exploration but cannot be presented as authoritative.

### Persistent timeline UI

The Mentor timeline is always present beneath the editor toolbar and above runner details. It streams/updates six semantic event types: observation, hypothesis, missing-evidence, tool, verification, and learner-action. Prediction and reflection prompts are inline forms. The legacy four-level panel remains only as a compatibility fallback during migration.

## Risks / Trade-offs

- [Native grammar packages increase install size] → Keep them gateway-only and load parsers lazily by language.
- [Generated counterexamples may be invalid] → Validate against stated input shape, cap count/size, and label unverified inputs explicitly.
- [Model loops can be expensive or stall] → Enforce 8 steps, per-tool repeat limits, 20-second model timeout, and deterministic finish fallback.
- [Tree-sitter does not provide a full semantic compiler] → Label CFG/def-use as structural evidence and require runtime verification before causal claims.
- [Most corpus solutions are unverified] → Preserve trust tiers and never use candidate solution output as judge authority.
- [The current repository has no tracked baseline] → Avoid destructive git operations and verify through tests/build/runtime evidence rather than diff assumptions.

## Migration Plan

1. Add new modules and endpoints without removing `/agent/run`.
2. Generate and load the Mentor retrieval index.
3. Switch the problem workspace to the persistent timeline when `VITE_LEARNING_API_URL` is configured; keep an explicit local fallback.
4. Keep existing learner events and derive the first twin projection from them.
5. After browser and model experiments pass, mark `/agent/run` compatibility-only in documentation.

Rollback is a frontend configuration change back to the existing Coach path; the new endpoints and stored sessions are additive.

## Open Questions

- None blocking implementation. Production-scale embedding infrastructure and formal compiler-grade analysis remain future optimizations, not hidden requirements of this change.

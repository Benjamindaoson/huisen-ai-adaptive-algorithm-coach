# AI Learning Intelligence Core Design

## Objective

Turn the current deterministic learning orchestrator into an honest, auditable learning-agent runtime. The runtime must be useful without a configured model, become more capable when a model is configured, and never allow model text to override judge evidence.

## Approved product direction

The user approved the previously recommended sequence: trusted judge evidence first, code intelligence and grounded retrieval second, a learner model third, and genuine tool-using/multi-role Agent behavior on top. This document narrows that direction to the smallest coherent phase that can be implemented and verified in the current local-first architecture.

Three approaches were considered:

1. Add more AI UI and prompts to the existing frontend. Fast, but it would preserve the current pseudo-Agent problem.
2. Build a permissioned server-side intelligence core and connect the existing workspace to it. This is the selected approach because every visible Agent claim can be backed by an executed tool result.
3. Replace the product with a managed external agent framework and vector database. This would increase operational complexity before the corpus and judge evidence are trustworthy.

## Architecture

```text
Problem workspace
  → POST /agent/run
  → Agent Runtime (budget + role policy)
      → problem evidence retrieval
      → static code inspection
      → judge-evidence interpretation
      → learner evidence retrieval
      → Bayesian mastery projection
      → tutor action selection
  → typed trace + citations + next action + mastery impact
  → workspace Tutor panel
```

The runtime executes deterministic tools first. If an OpenAI-compatible provider is configured, the model may choose among allowed tools and select a teaching action, but the server validates every call and every result. When no model is available, the same tool registry executes a deterministic plan so local-first behavior remains intact.

## Components

### Trusted problem evidence

Every problem receives separate status for readable content, solution presence, public sample coverage, hidden-test coverage, and verification. `practiceReady` remains backward compatible but is no longer interpreted as judge-ready.

### Code diagnostics

The first version deliberately avoids pretending to perform full semantic program analysis. It performs language-aware syntax heuristics, input-parser checks, loop/recursion and complexity-risk detection, boundary-pattern inspection, and maps these observations to actual public/hidden judge outcomes. Every diagnostic fact records its tool and evidence reference.

### Grounded retrieval

Retrieval combines normalized token overlap and skill overlap over the current problem, a bounded catalog slice, verified solution metadata, and learner events. Results contain stable references and short excerpts. No retrieved item may claim verification that is absent from corpus metadata.

### Probabilistic mastery

Each skill starts with a prior probability. Independent passes increase mastery most; assisted passes increase it only slightly; failures decrease it; independent transfer passes provide the strongest evidence. Confidence is derived from weighted evidence rather than raw attempt count.

### Agent runtime and roles

Planner can read profile, mastery, and catalog evidence. Diagnostician can inspect code and judge evidence. Tutor can read diagnostic results and choose a bounded hint action but cannot call judge or read a full reference solution below level four. Assessor can select transfer tasks but cannot reuse Tutor free text. Handoffs contain `traceId`, role, task, allowed tools, evidence references, budget, result, and confidence.

### User experience

The existing Coach panel becomes an execution view: current Agent state, evidence citations, diagnosis, one concrete learner action, mastery impact, and an expandable tool trace. It must clearly distinguish local deterministic execution, model-assisted execution, and fallback.

## Error handling and safety

- Unknown tools, disallowed tools, excess steps, malformed arguments, and model verdict conflicts fail closed.
- Judge results are immutable evidence.
- Source code is sent only to the configured gateway endpoint and is never added to learner event storage.
- Retrieval excerpts are bounded and citations are required.
- Model failure falls back to deterministic orchestration.

## Testing strategy

- Unit tests for every tool, permission rule, mastery update, retrieval citation, and trace invariant.
- API tests for validation, deterministic fallback, provider-assisted tool selection, and unsafe output rejection.
- UI tests for loading, result, fallback, evidence expansion, and no fabricated Agent status.
- Full lint, typecheck, root tests, gateway tests, production build, local server health check, and browser smoke test.

## Explicitly deferred phases

Full 754-problem verification, production Postgres/Redis migration, horizontally scalable sandbox queues, speech interview, system-design whiteboard, accounts, teacher CMS, plagiarism detection, and experimentation dashboards remain separate implementation phases. They are tracked in the roadmap and must not be shown as available until independently verified.

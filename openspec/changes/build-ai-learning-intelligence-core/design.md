## Context

The React/Vite client already supports local drafts, attempts, learner events, deterministic mastery, an evidence-grounded Coach UI, and an optional Fastify gateway. The current learning orchestrators construct descriptive tool traces but do not execute a model-directed tool loop. Corpus quality metadata also conflates readable/solution-present content with judge-ready evidence. The first production-shaped intelligence phase must stay local-first, preserve Judge0 authority, work without an AI provider, and avoid sending source code into learner-memory storage.

## Goals / Non-Goals

**Goals:**

- Execute real, permissioned diagnostic/retrieval/mastery tools and return auditable results.
- Give the problem workspace judge-grounded, cited, Socratic feedback.
- Represent content and mastery confidence honestly.
- Preserve deterministic fallback and the existing OpenAI-compatible provider boundary.
- Define typed role handoffs that are useful now and extensible to asynchronous agents later.

**Non-Goals:**

- Verify all 754 problems in this change.
- Build a full AST/CFG engine, scalable vector database, or production queue.
- Implement accounts, multi-tenancy, voice interviews, teacher CMS, or plagiarism detection.
- Allow model text to author or alter a judge verdict.

## Decisions

### Server-side executable tool registry

The gateway owns a typed tool registry. Each tool declares its name, allowed roles, input validator, execution budget, and result schema. The runtime records actual start/end/result data. This replaces traces assembled before any tool has executed. A managed agent framework was rejected because the current product needs strict judge and privacy boundaries more than framework breadth.

### Deterministic core with optional model policy

The runtime always has a deterministic plan. A configured provider may select an allowed next tool or teaching action, but the server validates the selection and can fall back at any step. This preserves offline/local-first behavior and makes tests reproducible.

### Lightweight diagnostics before full program analysis

Version one uses language-aware lexical/static heuristics plus concrete judge results. It detects parser/API mismatches, suspicious bounds, recursion/loop complexity risks, and compile/runtime evidence. It does not claim semantic proof. A full Tree-sitter/CFG subsystem remains a later isolated capability.

### Local hybrid retrieval

Retrieval uses normalized lexical tokens plus skill overlap, with stable references and verification metadata. This phase avoids embeddings and an external vector store because the problem set is small enough for bounded in-memory search and trusted metadata is the more urgent constraint.

### Bayesian mastery observations

Mastery is updated as posterior odds from weighted observations: independent pass, assisted pass, failure, and transfer pass. Values are bounded and confidence grows with effective evidence weight. The event log remains the source of truth; projections are reproducible.

### Typed role handoffs

Planner, Diagnostician, Tutor, and Assessor share one online runtime but have separate tool permissions. Handoffs are data contracts, not independent chat personas. This creates real multi-role isolation without pretending that asynchronous multi-agent infrastructure exists.

## Risks / Trade-offs

- [Heuristic diagnostics can be wrong] → Label every hypothesis with confidence and evidence; never call it a proven root cause.
- [Lexical retrieval misses semantic matches] → Combine skill overlap now and retain a clean retriever interface for embeddings later.
- [Model provider emits unsafe actions] → Strict schemas, role allowlists, maximum step budgets, and deterministic fallback.
- [Mastery priors may be poorly calibrated] → Expose probability and confidence separately and add outcome metrics before claiming personalization lift.
- [Corpus metadata remains incomplete] → Fail closed for judge-ready claims and generate a verification backlog.

## Migration Plan

1. Add versioned tool/runtime APIs without removing `/agent/plan` or `/coach/diagnose`.
2. Add the web client and Tutor execution view behind gateway availability; local Coach remains fallback.
3. Extend corpus reports with non-breaking quality fields.
4. After telemetry confirms stability, make the runtime the preferred Coach path.
5. Rollback consists of removing `VITE_LEARNING_API_URL`; the browser-local learning loop continues to work.

## Open Questions

- Provider-specific native tool-calling formats remain adapter work; the first model path uses the existing OpenAI-compatible JSON response contract.
- Full content verification targets and production storage are tracked as subsequent OpenSpec changes after this core is verified.

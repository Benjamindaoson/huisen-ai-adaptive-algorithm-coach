## Context

The repository already contains a dynamic Mentor engine, deterministic code tools, trusted corpus retrieval, learner-twin projection, evidence envelopes, and route-specific learning experiences. The missing seam is a durable application-level Mentor OS: the current React Mentor owns session state locally, contexts are assembled independently by callers, and there is no unified lifecycle/outcome plane. The design follows the research in `docs/research/2026-08-12-silicon-valley-ai-native-coding-learning-architecture.md`.

## Goals / Non-Goals

**Goals:**

- Present one deep `MentorOS` interface that owns start, contribute-context, act, approve, resume, and observe behavior.
- Preserve complete evidence lineage while sending the model only minimal high-signal context.
- Separate deterministic learning/assessment policies from model-controlled evidence acquisition.
- Make the Mentor continuous and visible across learning routes while strictly disabling it in independent assessment.
- Join intervention traces with later independent outcomes and quality gates.

**Non-Goals:**

- Multiple cosmetic role Agents, unrestricted autonomous code edits, browser computer use, or direct access to hidden test answers.
- Replacing deterministic skill projection, Judge0 isolation, trusted-content levels, or the existing benchmark gate with model judgment.
- Claiming causal learning gains before controlled experiments pass.

## Decisions

1. **One deep Mentor OS module, deterministic specialist tools.** The external interface is a small command/event protocol; Tree-sitter, execution, retrieval, learner-twin and pedagogy remain internal adapters. This provides locality and avoids shallow role wrappers. Alternative rejected: a graph of Planner/Teacher/Reviewer personas whose messages are not independently verifiable.
2. **Event-sourced session with checkpoints.** Every accepted command writes an immutable, idempotent lifecycle event and a derived checkpoint. A restart resumes after the last committed event, preventing duplicate tool execution. Alternative rejected: storing only the latest chat transcript.
3. **Context compiler with budgets and provenance.** Route contributions are validated and normalized; compiler prioritizes current goal, attempt/run evidence, pending learner question, recent same-skill events, trusted references, then older summaries. Raw code is included only for code-analysis runs; raw keystrokes and arbitrary history are excluded.
4. **Policy before model and before tool.** Independent assessment hard-denies Mentor actions. Edits require learner approval. Retrieval authority, tool quotas, time budgets, leakage rules, and stop conditions are deterministic. The model can choose only allowed tools and must replan from returned evidence.
5. **Lifecycle stream as a projection, not the source of truth.** SSE is used for perceived continuity, while polling/checkpoint GET remains the recovery path. Events expose observed facts, hypotheses, missing evidence, tool activity, proposed action, approval state, verification, and stop reason.
6. **Outcome evaluation is longitudinal.** A run is evaluated by process rubrics plus the next unassisted same-skill attempt, different-surface transfer, and delayed review. Experiment assignment is deterministic and sticky. Release requires guardrails and a configured probability/effect threshold; engagement alone cannot pass.
7. **Progressive migration with a fail-closed primary journey.** Existing `/mentor/*` endpoints remain for compatibility, but the primary problem workspace MUST bootstrap a route-scoped `/mentor-os/*` run before submission analysis. Its visible timeline may wait for that checkpoint; it MUST NOT bypass the runtime with an untracked direct Mentor request. The bootstrap is headless because the problem workspace already owns the single visible Mentor surface.

## Risks / Trade-offs

- **[Long contexts or latency]** → compile bounded packets, just-in-time retrieval, cache deterministic analysis, and expose progress events.
- **[Agent performs duplicate side effects after retry]** → command idempotency keys, event sequence constraints, and committed execution artifacts.
- **[AI leaks answers or contaminates assessment]** → route policy hard denial, reference redaction, bounded diffs, and leakage regression gates.
- **[Persistent state contains sensitive raw data]** → semantic events only, bounded code snapshots only for explicit attempts, retention/version contracts, export/delete support.
- **[A polished dock overstates capability]** → show provider mode, evidence strength, missing evidence, execution list, and stop reason; unavailable mode emits no fake evidence.
- **[Outcome joins are sparse]** → report `not-observed`; never substitute chat satisfaction for learning evidence.

## Migration Plan

1. Add versioned protocol, in-memory/file adapters, compiler, and tests behind new endpoints.
2. Add global dock in read-only/recommendation mode and suppress it in independent exams.
3. Route problem Mentor and AI exam actions through OS commands with approval records.
4. Add SSE/recovery, Postgres adapter, experiments, and outcome joins.
5. Remove page-local session ownership after parity and recovery tests pass. Rollback keeps existing endpoints and hides the global dock.

## Open Questions

- Production retention duration and organization-level teacher access rules require deployment policy, not implementation guessing.
- A causal release threshold will remain configured but closed until enough real longitudinal cohorts exist.

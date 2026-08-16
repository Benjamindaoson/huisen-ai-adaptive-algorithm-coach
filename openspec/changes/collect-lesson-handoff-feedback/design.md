## Context

Run 35 added a deterministic, evidence-bound handoff explanation. It already has a stable lesson ID and a minimal set of event references, but there is no response contract. Component-only state would disappear on reload and could not be synchronized, evaluated, or distinguished from learning evidence.

The frontend and gateway independently validate the same learning-event vocabulary. Platform migration has its own event/data allowlist. All three must accept the new bounded fact or the product would appear to save feedback while silently quarantining it.

## Goals / Non-Goals

**Goals:**

- Persist a two-choice response tied to one exact recommendation evidence set.
- Restore the latest active response after navigation or reload.
- Suppress duplicate identical responses while allowing an auditable choice change.
- Give confused learners a useful explanation and a route back to the preceding training.
- Keep the signal out of mastery, scoring, and teacher evaluation.

**Non-Goals:**

- Collect free text or sentiment prose.
- Treat `helpful` as proof of learning or `unclear` as proof of weakness.
- Ask an LLM to rewrite the explanation in this slice.
- Build a public aggregate dashboard before real responses exist.

## Decisions

### Bind feedback to a deterministic recommendation ID

The handoff projection SHALL derive `recommendationId` from the lesson ID and ordered minimal evidence references using a deterministic bounded fingerprint. The event stores `{ lessonId, recommendationId, choiceId }`, where `choiceId` is exactly `helpful` or `unclear`.

Alternative considered: bind only to lesson ID. Rejected because the same lesson can be recommended from a different evidence set later.

### Keep immutable revisions and project one active response

A changed choice appends a new event, preserving audit history. Projection sorts matching events and treats the newest as active. Repeating the already-active choice returns the existing memory unchanged.

Alternative considered: mutate or replace the earlier event. Rejected because synchronized append-only events must remain auditable and idempotent.

### Validate symmetrically across all sync boundaries

Frontend memory, gateway validation, and platform migration SHALL share the event kind, `recommendationId` key, two-choice allowlist, and required lesson semantics. Focused contract tests must fail if one side drifts.

### Recovery is deterministic and local

Selecting `unclear` SHALL reveal that the sequence is based on prerequisites rather than a weakness label and provide a link to review the source training. No model call is required, so the recovery is immediate and available offline.

### Feedback is product evidence, not mastery evidence

Existing mastery, lesson progress, pedagogical projection, and learning-effect metrics SHALL ignore the new event unless a future explicitly specified product-feedback projection consumes it.

## Risks / Trade-offs

- [Recommendation fingerprint collision] → Include lesson ID and a 64-bit deterministic evidence fingerprint; the ID is telemetry identity, not a security boundary.
- [Rapid toggling creates revisions] → Suppress same-as-active clicks in both UI and memory; retain genuine changes for audit.
- [Confusion recovery may still be insufficient] → The bounded signal creates evidence for prioritizing a later model-assisted rewrite, without pretending the current fallback solved every confusion.
- [Schema drift between web/gateway/outbox] → Add mirrored positive and negative contract tests and run both typechecks.

## Context

Run 37 made confusion actionable by linking to the exact source training. That link currently contains only the source lesson ID. The immersive training page therefore cannot distinguish ordinary training from a recovery review, and `window.history.back()` is neither an explicit learning action nor a reliable return contract.

## Goals / Non-Goals

**Goals:**

- Preserve exact return lesson and recommendation identity in a typed, encoded route.
- Validate the return context against the current evidence-derived handoff.
- Tell the learner why this review opened and where they will return.
- Return to the recommendation in one explicit click without changing learning evidence.

**Non-Goals:**

- Mark review as course completion or mastery.
- Force the learner to finish the source training before returning.
- Add a new event or analytics payload in this slice.
- Trust arbitrary query parameters as adaptive-learning evidence.

## Decisions

### Carry both return lesson and recommendation identity

The training route SHALL optionally carry `returnLessonId` and `recommendationId`. Both values are required before recovery context can render. Keeping the recommendation ID prevents a stale lesson-only link from being presented as the current AI decision.

### Validate against the current pure handoff projection

The application SHALL project the handoff for the return lesson from current learning events and accept recovery context only when its recommendation ID matches the route and its `sourceLessonId` matches the open training lesson. Invalid, incomplete, stale, or forged context degrades to an ordinary training page.

### Make return explicit but evidence-neutral

The training cabin SHALL show a bounded banner: the learner is reviewing this source because the recommendation was unclear, and can return to the named lesson in one click. Clicking return only navigates. It SHALL NOT emit lesson completion, training completion, transfer, mastery, or feedback events.

### Preserve backward compatibility

Existing `#/training/:lessonId` links SHALL parse and render unchanged. Optional query parameters are encoded in a stable generated order.

### Reconcile append-only events without losing pending local facts

Server bootstrap SHALL merge valid local and remote learning events by immutable event ID. Remote data wins an ID conflict; local-only events remain queued and visible until synchronization succeeds. Mutable progress, practice, and exam state keep their existing server-authority rules.

This decision was added after the real-browser hard-refresh test exposed that an unsynced `unclear` response could be replaced by a server snapshot. A soft navigation test did not reveal the loss.

## Risks / Trade-offs

- [The evidence set changes during review] → Revalidate on render; hide stale context rather than redirecting under a false rationale.
- [Query values are forged] → Treat them as navigation hints only and require a matching current projection.
- [The learner returns before reviewing] → Allow it; coercing completion would create fake evidence and harm trust.
- [More copy crowds the cabin] → Use one compact contextual banner above diagnosis and reuse existing visual tokens.
- [A stale local event conflicts with a server event] → The server version wins only for the same immutable ID; unrelated local append-only facts are preserved.

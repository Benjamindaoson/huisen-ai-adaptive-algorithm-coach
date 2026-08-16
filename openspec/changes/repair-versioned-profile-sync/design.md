## Context

`createPlatformOutbox.enqueue` currently checks an exact operation id before it identifies mutable streams. A profile write with the same deterministic id but an evolved payload therefore throws `Outbox idempotency conflict`. Profile and state writes are already modeled as latest-snapshot-wins when their ids differ, so the same-id branch contradicts the stream contract.

## Goals / Non-Goals

**Goals:** make mutable snapshot replacement independent of operation-id reuse, preserve immutable evidence, keep FIFO flush order for surviving operations, and recover the real browser queue through the product retry.

**Non-Goals:** clear the outbox, skip a failed operation, expose raw errors, relax server validation, or change event/attempt idempotency.

## Decisions

### Classify the stream before exact-id comparison

For `profile` and `state`, enqueue SHALL first remove the previous operation from the same learner/stream and append the current snapshot with retry metadata reset. For `event` and `attempt`, enqueue SHALL retain strict semantic comparison. The only compatibility normalization is removal of a redundant top-level payload `learnerId` when it exactly equals the immutable operation envelope owner; all evidence fields remain exact.

### Latest snapshot replaces retry metadata

A new mutable snapshot represents the product's current authoritative local view. It SHALL reset `attempts` and `lastError`; carrying the old failure would misrepresent the new operation.

### Preserve immutable ordering

Replacing a mutable snapshot may move that snapshot to the tail, while every surviving immutable operation retains its relative order. No immutable operation is removed.

When a legacy immutable operation differs only by the redundant owner field, the canonical current operation SHALL replace it at the same array index and reset retry metadata. This repairs the transport envelope without changing evidence or ordering.

## Risks / Trade-offs

- [A profile update moves behind existing events] → This is acceptable because each operation is self-contained and the server accepts events independently; preserving immutable FIFO evidence is more important than pinning profile first.
- [Schema evolution is incompatible with the server] → Normal flush remains blocked and the existing safe UI reports the honest pending state.
- [Mutable replacement hides a real conflict] → Server-side optimistic concurrency remains authoritative for state streams; only local duplicate-snapshot enqueue is changed.

## Context

`LessonPage` correctly emits `lesson-started` from an effect when a lesson mounts. The learner-memory boundary currently deduplicates only by random event ID, so remounts and retries create semantically identical events. `recordSignal` also projects every signal into pedagogical memory, where each duplicate becomes another `lesson-opened` event.

Both stores are bounded, but duplicate lifecycle facts can evict useful events, expand server outbox batches, and make replay evidence look stronger than it is. Existing history may already contain duplicates and must remain auditable.

## Goals / Non-Goals

**Goals:**

- Persist at most one start/open milestone for a lesson in the current learner lifecycle.
- Preserve the first event ID and timestamp.
- Keep different lessons and independently initialized learner memories separate.
- Reduce future event growth without changing the emitting UI.

**Non-Goals:**

- Rewrite or delete historical duplicate events.
- Deduplicate attempts, hints, checkpoints, completions, or transfers.
- Invent a course-reset lifecycle before the product has an explicit reset event.
- Change server schemas or retention limits.

## Decisions

### Enforce idempotency at domain append boundaries

`recordLearningSignal` SHALL return the existing memory when a `lesson-started` signal has the same `lessonId` as any stored `lesson-started` event. `recordPedagogicalSignal` SHALL likewise return existing memory when its projected `lesson-opened` evidence reference already exists.

Alternative considered: pass events into `LessonPage` and suppress the effect. Rejected because any other caller, retry, or future UI could reintroduce duplicates, and the two memory stores would still need coordinated behavior.

### Preserve the earliest fact

The first start event is the activation fact. Later mounts are delivery retries, so they SHALL NOT replace the ID or timestamp.

Alternative considered: keep the latest open time. Rejected because `lesson-started` is defined as a milestone rather than a page-view analytic; overwriting would erase audit history.

### Keep the change prospective

Parsing and loading existing memories SHALL not delete duplicates. Projections already use set semantics for lesson progress, and preserving imported events avoids silent data mutation. New signals stop future growth.

### Different learner memories define separate lifecycles

The current schema has no reset identifier. A newly initialized memory for a different learner, or an empty reset memory created by an explicit future flow, records its own first start. An in-place course reset is out of scope until represented by a bounded lifecycle event.

## Risks / Trade-offs

- [A learner intentionally revisits a completed lesson] → Treat the revisit as navigation, not a new start fact; future engagement analytics should use a dedicated page-view event rather than corrupting learning evidence.
- [Existing duplicate history remains] → Preserve auditability and filter projections; document that improvement is prospective.
- [A future course reset needs a new start] → Require an explicit lifecycle/reset identifier before changing the semantic key.

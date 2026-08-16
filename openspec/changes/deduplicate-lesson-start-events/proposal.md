## Why

Repeatedly opening the same lesson currently appends another learner `lesson-started` event and another pedagogical `lesson-opened` event. Real browser history produced 15 start references for one lesson, inflating sync payloads and replay evidence without recording a new learning fact.

## What Changes

- Treat `lesson-started` as one semantic milestone per learner and lesson lifecycle, independent of generated event IDs.
- Preserve the first event and timestamp when duplicate start signals arrive.
- Apply the same semantic idempotency to pedagogical `lesson-opened` projection.
- Preserve independent start facts for a different lesson or a different learner memory.

## Capabilities

### New Capabilities

- `semantic-learning-event-idempotency`: Prevent lifecycle milestones from multiplying when UI mounts or retries emit the same bounded learning fact.

### Modified Capabilities

None.

## Impact

- Changes learner-memory and pedagogical-memory append behavior for one bounded event kind.
- Reduces future local storage, server outbox, sync, and replay growth.
- Does not rewrite existing history, alter event schemas, change completion evidence, or add dependencies.

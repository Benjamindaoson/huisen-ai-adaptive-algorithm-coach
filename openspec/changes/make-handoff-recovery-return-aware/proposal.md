## Why

The AI handoff now reacts to confusion, but its review link drops the identity of the recommendation the learner was trying to understand. The source training opens in an immersive surface with only a generic history-back control, so the learner cannot see why they are reviewing or reliably return to the recommended lesson.

## What Changes

- Carry the exact return lesson and recommendation identity through the typed training route.
- Accept the return only when the current evidence still produces the same handoff and the reviewed lesson is its exact source.
- Show a compact recovery context inside the training cabin with the recommended lesson title and a one-click return.
- Keep review navigation and return outside mastery, unlocking, and completion evidence.
- Preserve valid local append-only learning events when a server bootstrap arrives before their outbox sync completes.

## Capabilities

### New Capabilities

- `return-aware-handoff-recovery`: Preserve, validate, explain, and complete the round trip from a confused handoff to source review and back.

### Modified Capabilities

None.

## Impact

- Extends the hash route shape, existing lesson/training page props, and append-only event reconciliation at server bootstrap.
- Adds no new learning event, model call, dependency, or server contract.
- Preserves old training URLs and invalidates stale or forged return context safely.

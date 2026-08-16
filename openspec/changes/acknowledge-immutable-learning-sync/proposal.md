## Why

Every authenticated synchronization rebuilds and replays the learner's complete immutable event and attempt history even after the server has already accepted it. Server idempotency prevents corruption, but network work, source hashing, CSRF exposure, and failure probability grow with learning history; this now deserves correction because Run 43 made synchronization ordering deterministic enough to isolate the remaining replay cost.

## What Changes

- Record a bounded, per-account acknowledgement only after the authoritative server accepts an immutable event or attempt.
- Bind each acknowledgement to immutable kind, stable payload ID, and canonical payload fingerprint so an ID with changed content is never silently skipped.
- Seed acknowledgements from an authenticated bootstrap because its events and attempts are already authoritative server records.
- Skip only exact acknowledged immutable payloads when assembling later snapshots; continue sending profiles and mutable states normally.
- Keep acknowledgement persistence best-effort: missing, corrupt, full, or unavailable local storage may cause a safe duplicate replay but must never lose an unsent operation.
- Measure immutable sends for an unchanged 100-event learner before and after, then prove one new event and every failed event still retry.

## Capabilities

### New Capabilities

- `immutable-sync-acknowledgement`: Safe, fingerprint-bound local acknowledgement and replay suppression for server-accepted learning events and attempts.

### Modified Capabilities

None.

## Impact

- Affects Web platform synchronization, the durable browser outbox, authenticated bootstrap adoption, local non-sensitive sync metadata, and their tests.
- Does not change Gateway routes, server storage, learning-event wire formats, backups, user-visible learning state, or anonymous behavior.
- Adds no dependency and does not make browser storage an authority for learning outcomes.

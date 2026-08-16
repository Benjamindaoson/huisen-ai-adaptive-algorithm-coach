## Context

Run 43 serialized automatic and manual synchronization, exposing a separate cost problem: each snapshot still rebuilds every immutable event and attempt even after the server has accepted it. The Gateway already gives authoritative success responses, immutable endpoints are idempotent, and bootstrap returns authoritative events and attempts. Browser storage is durable enough for an optimization hint but is not a learning authority and can be missing or corrupt.

The public test seams are one snapshot synchronization (`executePlatformSync`), durable outbox flushing, and authoritative bootstrap acknowledgement. Tests observe API calls, queue retention, and persisted acknowledgement behavior rather than internal helper calls.

## Goals / Non-Goals

**Goals:**

- Suppress exact, already accepted immutable payloads on later snapshot assembly.
- Preserve at-least-once delivery for every unacknowledged, failed, or changed payload.
- Reuse authoritative bootstrap records to avoid needless replay after session restoration or another device's writes.
- Bound and validate local acknowledgement metadata.
- Keep the behavior independently measurable and reversible.

**Non-Goals:**

- Do not change Gateway APIs, server storage, event retention, or mutable-state synchronization.
- Do not make local acknowledgements proof of mastery or a security boundary.
- Do not solve cross-tab serialization or replace server idempotency.
- Do not add acknowledgement data to learner backup/export.

## Decisions

### Store account-, kind-, ID-, and fingerprint-bound acknowledgements

The ledger stores only `learnerId`, immutable kind, payload ID, a SHA-256 fingerprint of canonical JSON, and acknowledgement time. A matching ID with changed content produces a different fingerprint and is sent again so the server can reject the immutable conflict.

Alternative: store only IDs. Rejected because accidental or corrupt same-ID content would be silently hidden. Alternative: store full payloads. Rejected because it duplicates sensitive learning data and grows storage unnecessarily.

### Treat acknowledgement persistence as best-effort optimization

Outbox removal remains based only on server success. After a successful immutable response, acknowledgement persistence is attempted before dequeueing, but storage failure cannot turn an accepted write into a permanently blocked operation. Missing acknowledgement safely causes a later idempotent replay.

Alternative: fail the flush when acknowledgement storage fails. Rejected because it would convert an optional performance cache into a durability dependency.

### Never let acknowledgements remove existing queued work

The ledger is consulted only when assembling new immutable operations. Operations already present in the durable outbox continue through normal at-least-once flushing, even if an acknowledgement exists. This protects crash windows and old queues.

### Seed from authoritative bootstrap

After an authenticated bootstrap succeeds, its event and attempt payloads are fingerprinted and recorded before the normal post-bootstrap snapshot can assemble. Server records therefore become safe acknowledgement evidence without another replay.

### Bound the ledger by recent acknowledgement time

Keep at most 10,000 validated entries. Eviction can cause safe duplicate replay but cannot lose server data. Unknown versions, malformed entries, invalid fingerprints, and parse failures read as an empty ledger.

## Risks / Trade-offs

- [Fingerprint computation still scans local history] → Network and server work drop to zero for acknowledged history; later work can add a server cursor/index if hashing becomes measurable.
- [Browser storage is cleared or evicted] → The client safely replays through idempotent server endpoints.
- [Storage quota blocks acknowledgement persistence] → Ignore the optimization failure after authoritative success and preserve ordinary sync correctness.
- [Crash occurs between acknowledgement and outbox dequeue] → The queued operation still flushes once more; acknowledgement never deletes it.
- [A changed payload under the same ID is malicious or corrupt] → Fingerprint mismatch forces the server conflict path instead of silently accepting local metadata.
- [Ledger reaches its bound] → Old entries are evicted and may replay; data is not lost.

## Migration Plan

Introduce a new versioned local key with no conversion requirement. Existing clients start with an empty ledger and safely replay once; successful responses and bootstrap populate it. Rollback consists of removing ledger reads/writes—the server remains idempotent and the old replay behavior resumes.

## Open Questions

- Whether a future server-issued compact attempt/event acknowledgement cursor can replace most local fingerprints once incremental synchronization is used across all devices.

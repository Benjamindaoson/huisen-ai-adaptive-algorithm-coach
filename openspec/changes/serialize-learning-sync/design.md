## Context

`synchronizePlatform` currently reads React state, assembles outbox operations, flushes, adopts conflicts, and updates UI. A 700 ms automatic effect and the account-panel retry can enter it concurrently. Independent outbox objects share localStorage but not a mutex, and independent write flows can rotate CSRF or rewrite mutable entries while another flush is active.

## Goals / Non-Goals

**Goals:** one active execution, latest-call coalescing, no stranded snapshot, extracted one-pass execution, and unchanged durable queue semantics.

**Non-Goals:** introduce cross-tab locking, add a server cursor/ack ledger, redesign state conflict policy, or stop idempotent replay of already-server-known history.

## Decisions

### Coalesce to the latest snapshot

The orchestrator SHALL keep one active Promise. Calls arriving while it is active replace the pending trailing snapshot. After the active execution resolves, exactly the latest pending snapshot executes. All overlapping callers observe the same Promise and settle only after the trailing snapshot is handled.

### Separate execution from React projection

The extracted executor SHALL assemble and flush profile, events, states, and attempts, returning bounded sync status, state versions, and conflicts. App SHALL remain responsible for updating visible status and adopting authoritative bootstrap after reported conflicts.

### Preserve durable evidence

The executor SHALL use the current outbox implementation. It may skip re-enqueueing an immutable id already pending, but SHALL never clear, reorder, or overwrite immutable evidence.

## Risks / Trade-offs

- [A later snapshot arrives after the worker's final loop check] → JavaScript cannot interleave another call without an await; the Promise cleanup reaction is registered before callers can schedule a later continuation.
- [A failing execution strands a queued snapshot] → The one-pass executor returns a bounded pending result instead of throwing, so the coalescing loop can consume the latest queued input.
- [Extraction changes closure semantics] → Focused execution tests plus real authenticated browser sync are mandatory.

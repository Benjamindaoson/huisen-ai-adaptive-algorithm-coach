## ADDED Requirements

### Requirement: Mutable snapshots survive compatible frontend evolution

The system SHALL replace a queued profile or state snapshot with the newest local snapshot for the same learner and stream, even when a deterministic operation id is reused with different payload content.

#### Scenario: Profile payload evolves under the same operation id

- **WHEN** a queued profile operation and a newer profile operation share an id but contain different bounded profile payloads
- **THEN** the outbox contains exactly the newer profile snapshot with retry metadata reset

#### Scenario: State snapshot changes under the same operation id

- **WHEN** a queued state operation and a newer state operation target the same learner and state kind
- **THEN** the outbox contains only the newer state snapshot for that stream

### Requirement: Immutable evidence remains conflict-strict

The system SHALL reject a reused event or attempt operation id when its semantic content differs.

#### Scenario: Event id is reused with different evidence

- **WHEN** an event operation reuses an existing id with a different payload
- **THEN** enqueue fails with an idempotency conflict and the original event remains queued

#### Scenario: Legacy event repeats its envelope owner inside the payload

- **WHEN** an existing event differs from the current event only because its payload contains a top-level `learnerId` equal to the operation owner
- **THEN** the canonical event replaces it at the same queue position and every evidence field remains unchanged

### Requirement: Normal retry is the only recovery path

The system SHALL preserve all immutable queued operations and recover synchronization by enqueueing the current mutable snapshot followed by the existing ordered flush.

#### Scenario: Existing browser queue is retried after upgrade

- **WHEN** the learner activates the existing retry control
- **THEN** no immutable operation is deleted or skipped and the visible pending count reflects the real flush result

### Requirement: Retry failure is safely classifiable

The system SHALL map raw retry failures to a bounded learner-facing reason without exposing messages, endpoints, tokens, operation ids, or payloads.

#### Scenario: Server rejects an outdated record format

- **WHEN** a retry fails with an invalid-request family error
- **THEN** the recovery surface says `记录格式需要升级` and contains none of the raw failure detail

### Requirement: Current learning events survive account migration

The system SHALL keep the browser migration contract symmetric with the authoritative server contract for first-minute, training-session, and bridge-diagnostic learning events.

#### Scenario: Anonymous learner registers after starting bridge training

- **WHEN** the local history contains valid first-minute, training-session, or bridge-diagnostic events
- **THEN** those events are planned for server migration rather than quarantined as legacy data

### Requirement: Recoverable CSRF rotation is automatic and bounded

The system SHALL refresh the in-memory CSRF token and retry a write at most once only when the server explicitly reports `invalid-session-or-csrf`.

#### Scenario: Session cookie is valid but the in-memory CSRF token is stale

- **WHEN** a write receives `invalid-session-or-csrf` and the CSRF refresh endpoint succeeds
- **THEN** the client retries the original write once with the new token

#### Scenario: Network write fails

- **WHEN** a write fails without the explicit CSRF error code
- **THEN** the client does not retry the unsafe write implicitly

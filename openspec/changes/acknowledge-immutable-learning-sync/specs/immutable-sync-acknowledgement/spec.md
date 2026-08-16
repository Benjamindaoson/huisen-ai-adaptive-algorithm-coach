## ADDED Requirements

### Requirement: Server acceptance creates exact immutable acknowledgement
The client SHALL record an acknowledgement for an immutable learning event or attempt only after the authoritative server accepts that exact payload, and the acknowledgement SHALL be scoped by learner, immutable kind, payload ID, and canonical payload fingerprint.

#### Scenario: Accepted event is acknowledged
- **WHEN** the server accepts an event outbox operation
- **THEN** the client records an event acknowledgement bound to that learner, event ID, and canonical payload fingerprint

#### Scenario: Failed event is not acknowledged
- **WHEN** an event outbox operation fails before authoritative acceptance
- **THEN** the client retains the operation and records no matching acknowledgement

### Requirement: Exact acknowledged history is not replayed
Snapshot synchronization SHALL omit a historical event or attempt only when an exact fingerprint-bound acknowledgement exists and SHALL continue to assemble every unacknowledged or changed immutable payload.

#### Scenario: Unchanged hundred-event history
- **WHEN** a 100-event snapshot is synchronized successfully and then synchronized again without changes
- **THEN** the second snapshot sends zero immutable event operations

#### Scenario: One new event after acknowledgement
- **WHEN** one event is added after the prior history was acknowledged
- **THEN** the next snapshot sends the new event and does not replay the acknowledged history

#### Scenario: Same ID has changed content
- **WHEN** current immutable content has the same learner, kind, and payload ID but a different canonical fingerprint
- **THEN** the client does not treat the old acknowledgement as a match and sends the changed payload to the authoritative server

### Requirement: Existing durable operations preserve at-least-once delivery
Acknowledgement metadata SHALL NOT remove, reorder, or suppress an operation already stored in the durable outbox.

#### Scenario: Crash-window operation is already queued
- **WHEN** an exact acknowledgement exists while the corresponding immutable operation remains in the outbox
- **THEN** the outbox still attempts the queued operation and removes it only through the existing authoritative success path

### Requirement: Authoritative bootstrap seeds acknowledgement
The client SHALL treat authenticated bootstrap events and attempts as authoritative accepted payloads and SHALL record exact acknowledgements before normal snapshot synchronization resumes.

#### Scenario: Restored server history
- **WHEN** authenticated bootstrap returns existing events and attempts
- **THEN** the next unchanged snapshot does not replay those exact immutable payloads

### Requirement: Acknowledgement metadata is bounded and non-authoritative
The acknowledgement ledger SHALL validate its version and entries, retain no more than 10,000 recent entries, exclude source code and free-form learner content beyond the canonical fingerprint, and degrade to safe replay when missing, corrupt, or unwritable.

#### Scenario: Corrupt ledger
- **WHEN** stored acknowledgement data is malformed or has an unknown version
- **THEN** synchronization treats the ledger as empty and sends all otherwise eligible immutable payloads

#### Scenario: Storage cannot save acknowledgement
- **WHEN** authoritative acceptance succeeds but acknowledgement persistence fails
- **THEN** the outbox completes its normal success path and a later synchronization may safely replay the immutable payload

#### Scenario: Ledger exceeds capacity
- **WHEN** more than 10,000 valid acknowledgements are recorded
- **THEN** only the 10,000 most recent valid entries remain and evicted history may safely replay

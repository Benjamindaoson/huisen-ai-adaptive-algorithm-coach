## ADDED Requirements

### Requirement: Cloud synchronization has one active execution

The system SHALL run at most one authenticated learning synchronization execution per App instance across automatic and manual triggers.

#### Scenario: Manual retry overlaps automatic synchronization

- **WHEN** manual retry is requested while automatic synchronization is awaiting the server
- **THEN** no second execution starts concurrently

### Requirement: The latest overlapping snapshot is not stranded

The system SHALL replace pending intermediate snapshots with the newest snapshot and run that newest snapshot once after the active execution.

#### Scenario: Two state updates arrive during an active flush

- **WHEN** snapshot B and then snapshot C arrive while snapshot A is running
- **THEN** executions are A then C, snapshot B is coalesced, and all callers settle after C

### Requirement: Existing durable semantics are preserved

The extracted executor SHALL continue to return safe pending issues, state-version updates, and authoritative conflict evidence without deleting immutable operations.

#### Scenario: One-pass synchronization succeeds

- **WHEN** all queued profile, event, state, and attempt writes succeed
- **THEN** the executor reports synced plus observed state versions and leaves no pending outbox operation

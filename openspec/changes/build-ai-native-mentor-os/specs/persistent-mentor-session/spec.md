## ADDED Requirements

### Requirement: Durable cross-route Mentor run
The system SHALL maintain one versioned Mentor run per active learner goal across route changes and SHALL restore it from an authoritative checkpoint.

#### Scenario: Learner changes from lesson to practice
- **WHEN** the learner navigates while a Mentor run is active
- **THEN** the same run identity, pending question, evidence ledger, and next action SHALL remain available

#### Scenario: Learner opens a problem directly
- **WHEN** the problem workspace loads before a route-scoped run is available
- **THEN** the client SHALL bootstrap and recover that run without rendering a duplicate Mentor surface, and submission analysis SHALL wait rather than bypass the runtime

#### Scenario: A previous route checkpoint remains in browser state
- **WHEN** the learner opens a different problem or a different learner identity becomes active
- **THEN** the previous run SHALL NOT be supplied to the current submission analysis

### Requirement: Idempotent lifecycle and recovery
Mentor commands SHALL carry an idempotency key and produce ordered immutable lifecycle events plus a checkpoint.

#### Scenario: Client retries after a connection loss
- **WHEN** an already committed command is submitted again
- **THEN** the system SHALL return the committed result without repeating tool side effects

#### Scenario: Stream disconnects
- **WHEN** live event delivery fails
- **THEN** the client SHALL recover from the latest event cursor or checkpoint without losing the run

### Requirement: Explicit truthful termination
Every completed or paused run SHALL expose a stop reason, evidence sufficiency state, and pending learner action.

#### Scenario: Evidence remains insufficient
- **WHEN** the tool budget is exhausted without verified support
- **THEN** the run SHALL stop as `insufficient-evidence` and SHALL NOT present a confirmed diagnosis

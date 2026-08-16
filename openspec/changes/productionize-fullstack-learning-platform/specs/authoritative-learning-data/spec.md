## ADDED Requirements

### Requirement: Server is authoritative for learning state
The system SHALL persist profiles, learning events, attempts, exams, mastery projections, delayed reviews and Mentor evidence in PostgreSQL; browser storage SHALL be treated only as cache, draft or outbox.

#### Scenario: Same learner opens a second device
- **WHEN** the learner signs in from another device
- **THEN** the system reconstructs the same authoritative progress and pending work from server data

### Requirement: Learning events are explainable and idempotent
Learning state SHALL change only from validated semantic events with stable identifiers, evidence references and ownership; duplicate identical events SHALL be accepted once and conflicting replays SHALL be rejected.

#### Scenario: Offline outbox is synchronized twice
- **WHEN** an identical batch is retried after an uncertain network response
- **THEN** no mastery, attempt or usage value is counted twice

### Requirement: Conflict behavior is explicit
The system SHALL define field ownership and monotonic versions for drafts, append-only events, exam state and projections, and SHALL return a resolvable conflict rather than silently overwriting protected state.

#### Scenario: Stale exam mutation arrives
- **WHEN** a client submits an answer update against an older exam version
- **THEN** the server rejects or merges it according to the exam contract and returns the current version

### Requirement: Learners control their data
The system SHALL provide authenticated export and deletion workflows with status, audit evidence, retention policy and backup tombstone handling.

#### Scenario: Learner requests export
- **WHEN** an authenticated learner requests a portable export
- **THEN** the system produces a bounded-time archive of their profiles, events, attempts, exams and Mentor history without other learners' data

## ADDED Requirements

### Requirement: Learner goals are explicit and editable

The system SHALL store the learner's target, optional exam date, daily study minutes and preferred language as a versioned profile.

#### Scenario: Learner changes the exam date

- **WHEN** the learner saves a valid future exam date
- **THEN** the profile SHALL update with a new timestamp
- **AND** subsequent plans SHALL explain any resulting urgency change

### Requirement: Learning evidence is append-only

The system SHALL represent attempts, hints, answer unlocks and mastery checks as immutable, bounded events with stable IDs.

#### Scenario: Same event is synchronized twice

- **WHEN** the backend receives an event ID it already stores for the learner
- **THEN** it SHALL return the existing event without creating a duplicate

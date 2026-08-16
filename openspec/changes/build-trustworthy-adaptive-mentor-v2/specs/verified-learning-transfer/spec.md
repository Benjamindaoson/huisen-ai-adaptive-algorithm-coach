## ADDED Requirements

### Requirement: Transfer pass is durable evidence
The system SHALL record a transfer pass only when a learner passes a judgeable transfer problem after starting transfer, and SHALL bind it to the lesson, problem, and attempt.

#### Scenario: Independent transfer succeeds
- **WHEN** the learner starts a lesson transfer and later passes the mapped problem without disqualifying assistance
- **THEN** a `lesson-transfer-passed` event SHALL be stored with the lesson and attempt identifiers

### Requirement: Completion and transfer remain distinct
Derived lesson progress SHALL expose lesson completion and transfer verification as separate states.

#### Scenario: Lesson completed without transfer
- **WHEN** a learner completed lesson checkpoints but has not independently passed a transfer problem
- **THEN** the learning map SHALL show the lesson as completed but not transfer verified

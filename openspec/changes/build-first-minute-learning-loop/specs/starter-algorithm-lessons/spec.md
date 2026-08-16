## ADDED Requirements

### Requirement: Three starter algorithm lessons are available
The system SHALL provide array traversal, hash lookup, and two pointers as a sequenced set of beginner algorithm micro-lessons. Each lesson MUST include a plain explanation, observable state progression, prediction, local code completion, and a transfer handoff.

#### Scenario: Learner completes array traversal
- **WHEN** the learner passes the prediction and completion checkpoints
- **THEN** the lesson records completion and unlocks its eligible follow-up lessons

#### Scenario: Transfer task is unavailable
- **WHEN** the catalogue has no trustworthy matching task
- **THEN** the lesson preserves completion while honestly indicating that a transfer task cannot be opened

### Requirement: Starter curriculum preserves the existing foundation path
The starter curriculum MUST NOT reorder or alter the 12-lesson foundation curriculum's prerequisite contract.

#### Scenario: Existing foundation progress is loaded
- **WHEN** a learner has prior foundation lesson events
- **THEN** their foundation progress is derived exactly as before

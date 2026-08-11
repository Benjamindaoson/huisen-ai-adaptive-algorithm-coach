## ADDED Requirements

### Requirement: Durable lesson evidence
The system SHALL record owner-scoped lesson start, passed checkpoint, lesson completion, and transfer-start events through the existing local memory and signed synchronization contract.

#### Scenario: Lesson event synchronizes
- **WHEN** an authenticated learner records a valid bounded lesson event
- **THEN** the gateway accepts it idempotently and the learner can recover the same event after a service restart

#### Scenario: Invalid lesson metadata is submitted
- **WHEN** a lesson event contains unknown fields, free-form answer text, source code, an invalid lesson identifier, or semantically inconsistent data
- **THEN** both client parsing and gateway validation reject the event

### Requirement: Deterministic progress projection
The client SHALL derive lesson progress and the next available lesson deterministically from validated lesson events and prerequisite declarations.

#### Scenario: Prerequisite is completed
- **WHEN** all prerequisites for an incomplete lesson have lesson-completed evidence
- **THEN** that lesson becomes available and can be recommended

#### Scenario: Prerequisite is missing
- **WHEN** any prerequisite lacks lesson-completed evidence
- **THEN** the dependent lesson remains locked and cannot be marked available by a transfer-start event alone

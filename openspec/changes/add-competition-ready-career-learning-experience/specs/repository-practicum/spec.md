## ADDED Requirements

### Requirement: Project practicum exercises real engineering phases
The system SHALL provide a navigable repository practicum that requires requirement comprehension, multi-file diagnosis, planning, implementation, automated verification and reflection rather than a single algorithm answer.

#### Scenario: Learner completes the first practicum
- **WHEN** the learner fixes the defect and the project tests pass
- **THEN** the system records phase evidence, verification output and a reflection without treating mere page completion as mastery

### Requirement: Project guidance is minimally sufficient
The Project Mentor SHALL ask process questions and provide progressively scoped hints based on the current phase and failed verification, and SHALL NOT directly write files or reveal the complete patch.

#### Scenario: Learner is stuck during diagnosis
- **WHEN** the learner requests help before submitting a hypothesis
- **THEN** Mentor asks for an observable state or points to one relevant file boundary without providing the final edit

### Requirement: Practicum progress is recoverable and explainable
Project phase transitions SHALL produce validated, idempotent semantic events and recoverable progress containing no source code in telemetry.

#### Scenario: Learner refreshes during practicum
- **WHEN** the app reloads after a completed phase
- **THEN** the project reopens at the last validated phase with its evidence references and test status

### Requirement: Algorithm and project evidence remain distinct
Ability reporting SHALL distinguish algorithm practice, project engineering, independent completion and AI assistance evidence.

#### Scenario: Learner passes a project with assistance
- **WHEN** tests pass after Mentor hints were used
- **THEN** project verification increases while independent-completion evidence remains separately labeled

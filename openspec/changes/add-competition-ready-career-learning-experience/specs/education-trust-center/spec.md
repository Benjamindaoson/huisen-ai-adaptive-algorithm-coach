## ADDED Requirements

### Requirement: Learners can inspect education data boundaries
The system SHALL expose a primary navigation destination that identifies each learning-data category, its source classification, purpose, storage, retention behavior and whether it can affect authoritative mastery.

#### Scenario: Learner opens trust center
- **WHEN** the learner opens the trust center
- **THEN** the system distinguishes public, simulated, authorized-desensitized and learner-created data in plain language

### Requirement: Learners have visible data controls
The system SHALL expose export, deletion and local-cache controls with the current platform availability and SHALL NOT claim a server action succeeded before receiving authoritative confirmation.

#### Scenario: Backend is unavailable
- **WHEN** export or deletion authority is unavailable
- **THEN** the interface explains the limitation and preserves only safe local actions

### Requirement: AI education evaluation is bounded
Every AI report and trust view SHALL state that AI feedback is formative learning guidance, not a final evaluation by a teacher, school, employer or professional institution.

#### Scenario: Learner reads an ability report
- **WHEN** AI-generated guidance or diagnosis is displayed
- **THEN** the evaluation boundary and supporting evidence status are visible without requiring a terms document

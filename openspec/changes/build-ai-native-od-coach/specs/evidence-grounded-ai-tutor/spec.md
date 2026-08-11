## ADDED Requirements

### Requirement: Evidence-grounded diagnosis
The AI tutor SHALL ground a diagnosis in the current problem version, submitted code, execution result and available mastery evidence and SHALL identify which evidence supports its conclusion.

#### Scenario: Diagnose a wrong answer
- **WHEN** the latest sample submission contains a failed case
- **THEN** the tutor response cites the relevant code behavior and failed case and proposes a verifiable next action.

### Requirement: Progressive hint disclosure
The AI tutor SHALL support four hint levels and SHALL avoid revealing a complete solution before the user explicitly requests the final level or enters post-solution review.

#### Scenario: Ask for the first hint
- **WHEN** a user requests help without selecting a level
- **THEN** the tutor provides a level-one diagnostic question or observation and does not provide complete replacement code.

### Requirement: Hidden-test confidentiality
The system SHALL NOT expose hidden-test inputs or expected outputs to the browser or AI model.

#### Scenario: Explain an official wrong answer
- **WHEN** an official submission fails a hidden test
- **THEN** the tutor receives only an allowed failure category and sanitized evidence rather than the hidden test content.

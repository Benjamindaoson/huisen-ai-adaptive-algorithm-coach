## ADDED Requirements

### Requirement: Repository projects form a progressive path
The system SHALL provide four ordered repository projects with distinct engineering skills and explicit prerequisites.

#### Scenario: Beginner opens the project path
- **WHEN** a learner has no verified project completion
- **THEN** the first project is available and later projects show their prerequisite and locked status

#### Scenario: Prerequisite is completed
- **WHEN** all prerequisite projects have verified `practicum-completed` evidence
- **THEN** the next project becomes available without manual score editing

### Requirement: Every project has executable verification
Each project SHALL provide repository context, one editable work file, diagnosis and plan choices, project-specific executable tests and a structured reflection.

#### Scenario: Learner tests a correct implementation
- **WHEN** the current project implementation satisfies every project-specific case
- **THEN** the runner returns a structured all-pass result and the workbench advances to reflection

#### Scenario: Learner tests an incorrect implementation
- **WHEN** at least one project-specific case fails
- **THEN** the workbench remains in implementation and shows bounded failure evidence without revealing the complete patch

### Requirement: Project Mentor guidance is minimal and phase aware
The system MUST limit Project Mentor guidance to prediction, file-boundary or test-boundary prompts selected for the active project's current phase.

#### Scenario: Learner asks for help
- **WHEN** the learner requests a hint during diagnosis, planning or implementation
- **THEN** the system records a structured hint event and provides the next bounded prompt without writing source code

### Requirement: Project completion remains separate from independence
The system SHALL report executable project completion and hint dependence as separate evidence dimensions.

#### Scenario: Assisted project passes
- **WHEN** all tests pass after one or more hints
- **THEN** the system records project completion and the nonzero hint count without labelling the project independently completed

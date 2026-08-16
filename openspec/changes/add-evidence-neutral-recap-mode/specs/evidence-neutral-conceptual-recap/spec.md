## ADDED Requirements

### Requirement: Verified recovery starts a conceptual recap

The training cabin SHALL start a verified recovery review at the human-language explanation regardless of stored training progress, while ordinary training SHALL continue to resume at its stored stage.

#### Scenario: Completed source lesson is opened for recovery

- **WHEN** a learner with stored transfer-stage progress enters through verified recovery context
- **THEN** the cabin renders explanation stage 01 and labels the experience as quick recap

#### Scenario: Same learner opens ordinary training

- **WHEN** the same source lesson opens without recovery context
- **THEN** the cabin resumes at the stored stage

### Requirement: Recap replay does not duplicate learning evidence

The system SHALL allow live teaching transitions in recap mode without emitting learning signals.

#### Scenario: Learner replays an explanation

- **WHEN** the learner advances from explanation to observation in recap mode
- **THEN** the visible stage changes and no completion, start, transfer, or mastery event is emitted

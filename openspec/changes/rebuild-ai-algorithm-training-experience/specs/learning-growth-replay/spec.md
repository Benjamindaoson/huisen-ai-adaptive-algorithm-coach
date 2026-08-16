## ADDED Requirements

### Requirement: Evidence-based growth replay
The system SHALL turn persisted training milestones into a learner-readable replay containing the starting hypothesis, completed evidence, an explicit unverified item, and the next action rationale.

#### Scenario: Learner completes a cabin but not a transfer
- **WHEN** the learner completes explanation, observation, prediction, and constrained coding without a verified transfer
- **THEN** the replay reports the completed milestones and identifies independent transfer as unverified rather than calling the skill mastered

#### Scenario: Learner has verified transfer
- **WHEN** an independent transfer pass is recorded for the cabin lesson
- **THEN** the replay reports verified transfer evidence and directs the learner to the next available lesson or planned review

### Requirement: Training map explains daily direction
The system SHALL show a compact training map on Today that names the current skill, the learner's verified progress, and why the next mission is selected.

#### Scenario: New learner opens Today
- **WHEN** a learner without usable evidence opens Today
- **THEN** the map identifies the first starter skill, labels the state as a baseline, and links to the ten-minute mission

#### Scenario: Learner returns after a cabin
- **WHEN** a learner has persisted cabin milestones
- **THEN** the map reflects completed milestones and prioritises the next independently verifiable action

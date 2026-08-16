## ADDED Requirements

### Requirement: Evidence-bound entry diagnosis
The system SHALL derive an entry diagnosis from the learner's recorded attempts and learning events. The diagnosis SHALL identify whether it is a cold-start baseline or name the recorded evidence class on which its hypothesis relies.

#### Scenario: New learner has no learning evidence
- **WHEN** a learner has no recorded attempts or lesson events
- **THEN** the system presents a baseline diagnosis, states that it has not yet observed the learner's coding behaviour, and names the first training action that will create evidence

#### Scenario: Learner has recorded assistance dependence
- **WHEN** a learner has recorded hint or reference-use evidence before a passed attempt
- **THEN** the system presents the diagnosis as a hypothesis tied to prompt-dependence evidence and does not claim verified mastery

### Requirement: Ten-minute mission
The system SHALL associate each entry diagnosis with a named mission, a target skill, five ordered learning stages, an estimated ten-minute duration, and a stated independent transfer criterion.

#### Scenario: Starter lesson mission is created
- **WHEN** an available starter lesson is selected
- **THEN** the mission identifies the lesson's target skill and orders explain, observe, predict, build, and transfer before any completion is claimed

## ADDED Requirements

### Requirement: Cold-start mission explains the next learning action
When a learner has no effective submission evidence, the Today route SHALL render a single starter mission instead of opening a raw catalogue problem as the primary action. The mission MUST state the skill goal, estimated duration, prerequisite statement, expected gain, and a plain-language selection reason.

#### Scenario: New learner opens Today
- **WHEN** the learner has zero effective submissions and a starter lesson is available
- **THEN** the page shows the mission details and an action that opens that lesson

#### Scenario: Learner has practice evidence
- **WHEN** the learner has at least one effective submission
- **THEN** the existing adaptive plan remains the primary Today action

### Requirement: Mission supports recommendation comprehension measurement
The mission SHALL offer one explicit acknowledgement action after the learner reads why it was selected, and the event MUST not contain source code or free-text answers.

#### Scenario: Learner acknowledges the selection reason
- **WHEN** the learner activates the mission acknowledgement action
- **THEN** the system records a bounded recommendation-comprehension event

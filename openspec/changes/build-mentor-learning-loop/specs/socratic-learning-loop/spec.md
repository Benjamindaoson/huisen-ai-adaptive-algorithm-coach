## ADDED Requirements

### Requirement: Teaching begins with a learner prediction
For an unverified misconception, the Mentor SHALL ask the learner to predict a relevant state or output before revealing a corrective explanation.

#### Scenario: Learner prediction requested
- **WHEN** a diagnosis requires distinguishing two plausible misconceptions
- **THEN** the session enters awaiting-learner state with one focused prediction question and no full solution disclosure

### Requirement: Intervention is adapted to the response
The Mentor SHALL evaluate the learner response, choose the minimum useful intervention, and observe the next edit or execution before escalating.

#### Scenario: Correct prediction but incorrect code
- **WHEN** the learner predicts the state correctly but the next execution still fails
- **THEN** the Mentor narrows the intervention to implementation evidence rather than repeating the conceptual explanation

#### Scenario: Incorrect prediction
- **WHEN** the learner response conflicts with verified trace evidence
- **THEN** the Mentor explains the first divergent state and requests one bounded code change

### Requirement: Learning is checked through transfer
After an assisted success, the Mentor SHALL create or select a different same-skill transfer task and treat only an independent pass as transfer evidence.

#### Scenario: Assisted problem passes
- **WHEN** the original problem passes after Mentor assistance
- **THEN** the session schedules a transfer check and does not declare independent mastery

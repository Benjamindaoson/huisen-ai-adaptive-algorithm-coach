## ADDED Requirements

### Requirement: Learner-facing copy uses readable scale and plain language
High-attention learning surfaces SHALL use body text of at least 14px and supporting text of at least 12px. Mission and Mentor status copy MUST describe a learner action or evidence state in plain Chinese rather than foregrounding internal labels, trace IDs, model token counts, or decorative English.

#### Scenario: Learner reads a starter mission
- **WHEN** the mission is shown
- **THEN** its time, prerequisite, benefit, and reason use learner-facing copy at the declared typography floor

#### Scenario: Learner views an idle Mentor
- **WHEN** no attempt exists
- **THEN** the Mentor explains the first action needed for analysis without showing operational implementation details

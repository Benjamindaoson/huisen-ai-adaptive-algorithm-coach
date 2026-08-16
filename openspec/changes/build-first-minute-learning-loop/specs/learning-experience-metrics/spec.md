## ADDED Requirements

### Requirement: First-minute and learning-loop metrics are derived from bounded events
The system SHALL record and derive four metrics: time from initial mission exposure to first run, mission-reason acknowledgement, Mentor-mediated revision verification, and seven-day transfer eligibility/outcome. The metric view MUST represent missing evidence as not-yet-measurable.

#### Scenario: First run completes
- **WHEN** a learner records their first run after seeing a mission
- **THEN** the system can derive the elapsed first-run duration from bounded timestamps

#### Scenario: Mentor-guided revision passes
- **WHEN** a failed attempt is followed by a Mentor intervention and a passing revision
- **THEN** the system records a Mentor-revision-verified event without claiming causal learning effectiveness

#### Scenario: No seven-day transfer evidence exists
- **WHEN** no eligible transfer event has reached seven days
- **THEN** the metric reports not-yet-measurable rather than a retention percentage

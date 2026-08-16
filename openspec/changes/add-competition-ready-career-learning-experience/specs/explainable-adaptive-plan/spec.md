## ADDED Requirements

### Requirement: Recommendations expose their evidence
Each personalized recommendation SHALL show the learner goal, relevant skill gap, recent event or review signal, assistance dependency, confidence and stable evidence references used to select it.

#### Scenario: Evidence-backed recommendation is displayed
- **WHEN** sufficient validated learning events exist
- **THEN** the learner can inspect why this action is recommended now and which evidence would change the plan

### Requirement: Baseline plans are labeled honestly
The system SHALL distinguish evidence-based personalization from a cold-start baseline and SHALL NOT attribute a baseline recommendation to AI observation.

#### Scenario: New learner has no events
- **WHEN** no validated learner evidence is available
- **THEN** the plan is labeled as a baseline and requests a diagnostic action

### Requirement: Mastery updates remain deterministic
AI explanations SHALL NOT directly change mastery; only validated semantic events, independent transfer and delayed review SHALL update authoritative capability projections.

#### Scenario: Mentor recommends a topic
- **WHEN** Mentor states that a topic should be practiced
- **THEN** the recommendation is recorded separately from mastery until qualifying evidence occurs

## ADDED Requirements

### Requirement: Learner state retains multiple evidence dimensions
The system SHALL maintain per-skill belief, confidence, misconception evidence, assistance dependence, independent performance, transfer performance, last practice time, and forgetting half-life.

#### Scenario: Assisted success
- **WHEN** a learner passes after a hint or reference intervention
- **THEN** assistance dependence increases and independent mastery SHALL NOT increase as if the pass were unassisted

#### Scenario: Independent transfer
- **WHEN** a learner independently passes a different problem requiring the same skill
- **THEN** transfer evidence and mastery belief increase more than for an assisted pass

#### Scenario: Time decay
- **WHEN** no fresh evidence exists beyond the skill's forgetting interval
- **THEN** current belief decays while historical evidence and confidence provenance remain available

### Requirement: Twin updates are explainable
Every state update SHALL cite the learning event or judge evidence that caused it.

#### Scenario: Mentor displays mastery change
- **WHEN** the Mentor projects a mastery change
- **THEN** the response includes prior, posterior, confidence, misconception changes, and stable evidence references

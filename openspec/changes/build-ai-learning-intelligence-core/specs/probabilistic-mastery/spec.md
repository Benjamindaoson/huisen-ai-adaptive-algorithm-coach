## ADDED Requirements

### Requirement: Weighted mastery observations
The system SHALL update skill mastery from reproducible weighted observations and SHALL distinguish independent pass, assisted pass, failure, and transfer pass.

#### Scenario: Assisted pass
- **WHEN** a learner passes after receiving a hint or unlocking a reference answer
- **THEN** mastery increases less than for an independent pass and a transfer check remains due

#### Scenario: Independent transfer pass
- **WHEN** a learner independently passes a different problem for the same skill
- **THEN** mastery receives the strongest positive observation and the transfer check closes

### Requirement: Probability and confidence separation
The system SHALL expose mastery probability separately from evidence confidence.

#### Scenario: High prior with little evidence
- **WHEN** mastery probability is high but effective evidence is low
- **THEN** the product shows high estimated mastery with low confidence rather than a definitive mastered state

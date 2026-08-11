## ADDED Requirements

### Requirement: Explainable skill mastery
The system SHALL maintain a score, confidence, evidence count, recent error kinds and next review time for each skill using deterministic versioned rules.

#### Scenario: Update mastery after an independent pass
- **WHEN** a user passes a tagged problem without using a revealed solution
- **THEN** the related skill score and confidence increase and the evidence entry references the attempt that caused the update.

### Requirement: Reasoned daily plan
The system SHALL select due review, weak-skill and transfer practice items and SHALL display a concrete recommendation reason for each item.

#### Scenario: Recommend a due review
- **WHEN** a skill's next review time is in the past
- **THEN** the daily plan includes an appropriate unresolved problem and explains that the review is due.

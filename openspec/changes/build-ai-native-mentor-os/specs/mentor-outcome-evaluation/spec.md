## ADDED Requirements

### Requirement: Process and outcome evaluation
The evaluation plane SHALL score the full run transcript, tool process, state changes, leakage, wrong conclusions, and later independent outcomes separately.

#### Scenario: Mentor response sounds useful but next attempt fails
- **WHEN** conversational quality passes but unassisted same-skill or transfer performance does not improve
- **THEN** the release report SHALL not label the intervention effective

### Requirement: Sticky experiment assignment
Eligible learners SHALL receive deterministic, versioned experiment assignments and SHALL remain in the same arm for the experiment window.

#### Scenario: Learner returns on another day
- **WHEN** the same active experiment is evaluated
- **THEN** the learner SHALL retain the original assignment and exposure record

### Requirement: Evidence-gated release
Mentor policy or prompt versions SHALL be releasable only when configured outcome evidence and guardrails pass, including next-independent correctness, transfer, retention, leakage, and wrong-conclusion thresholds.

#### Scenario: Longitudinal sample is insufficient
- **WHEN** required independent outcome count is below the configured minimum
- **THEN** the gate SHALL remain closed and report the outcome as not observed

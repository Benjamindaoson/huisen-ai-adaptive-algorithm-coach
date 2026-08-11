## ADDED Requirements

### Requirement: The orchestrator produces evidence-grounded actions

The Learning Orchestrator SHALL return a trace ID, decision role, tool calls, evidence references, confidence and ordered learning actions.

#### Scenario: Learner has no submission evidence

- **WHEN** no mastery evidence exists
- **THEN** the orchestrator SHALL select baseline problems
- **AND** SHALL state that the plan is a baseline rather than personalized mastery advice

#### Scenario: Assisted solution passed

- **WHEN** the latest successful attempt followed a hint or reference-answer unlock
- **THEN** the orchestrator SHALL schedule a mastery check before marking the skill independently mastered

### Requirement: Deterministic systems remain authoritative

The orchestrator SHALL treat runner and judge results as immutable evidence and SHALL NOT receive hidden-test content.

#### Scenario: Model diagnosis conflicts with judge result

- **WHEN** model text claims a different correctness status from the judge
- **THEN** the product SHALL display the judge status as authoritative
- **AND** SHALL mark the conflicting diagnosis as invalid telemetry

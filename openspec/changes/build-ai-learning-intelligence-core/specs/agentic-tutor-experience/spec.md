## ADDED Requirements

### Requirement: Honest Agent execution view
The problem workspace SHALL show whether a result is deterministic, model-assisted, or fallback and SHALL only display tools that were actually executed.

#### Scenario: Successful Agent run
- **WHEN** a learner requests diagnosis
- **THEN** the UI shows the current hypothesis, cited evidence, one concrete learner action, mastery impact, and an expandable executed-tool trace

#### Scenario: Gateway unavailable
- **WHEN** the Agent API cannot be reached
- **THEN** the UI labels the local evidence Coach as fallback and does not claim a server Agent ran

### Requirement: Socratic intervention policy
The Tutor SHALL prefer questions, traces, and counterexamples before full solution disclosure and SHALL respect the existing four-level hint policy.

#### Scenario: Level-one request
- **WHEN** the learner requests the first hint level
- **THEN** the Tutor returns a locating question or evidence prompt without replacement code

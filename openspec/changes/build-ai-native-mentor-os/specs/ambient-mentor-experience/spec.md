## ADDED Requirements

### Requirement: Ambient route-aware Mentor
Today, Learn, Practice, Review, AI-collaboration Exam, and Insights SHALL expose the same Mentor identity, run state, observed evidence, uncertainty, executed tools, and one recommended next action.

#### Scenario: Non-specialist opens the product
- **WHEN** no active coding attempt exists
- **THEN** the Mentor SHALL explain the current learning goal in plain language and offer one concrete next learning action instead of showing an empty chat box

### Requirement: Observable working timeline
The interface SHALL distinguish observation, hypothesis, missing evidence, tool execution, approval request, verification, and stop events.

#### Scenario: Mentor is testing a diagnosis
- **WHEN** a tool is executing
- **THEN** the interface SHALL show what is being run, which evidence it seeks, and whether the conclusion changed afterward

#### Scenario: Durable analysis is still starting
- **WHEN** a runnable submission exists but the route-scoped Mentor runtime has not committed its checkpoint
- **THEN** the visible Mentor SHALL state that it is establishing a recoverable analysis record and SHALL NOT silently send an untracked analysis request

### Requirement: Honest capability state
The interface SHALL distinguish model-backed Agent operation, deterministic fallback, unavailable services, and unobserved outcome dimensions.

#### Scenario: Model key or gateway is absent
- **WHEN** no model-backed runtime is available
- **THEN** the interface SHALL display the limited fallback and SHALL emit no fabricated model or tool evidence

### Requirement: Assessment isolation
Ambient Mentor UI SHALL be absent or locked throughout independent assessment, including navigation escape attempts.

#### Scenario: Learner changes the hash during an independent exam
- **WHEN** the browser route is manually changed
- **THEN** the application SHALL return to the restricted exam without rendering Mentor or reference surfaces

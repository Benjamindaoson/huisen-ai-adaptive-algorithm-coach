## ADDED Requirements

### Requirement: Dynamic bounded Agent loop
When a model is configured, it SHALL be able to select an allowed tool and parameters, inspect results, replan, request more evidence, and stop; the complete trace SHALL be persisted.

#### Scenario: First hypothesis lacks execution evidence
- **WHEN** static analysis suggests a cause but does not verify it
- **THEN** the model MAY select bounded test generation and execution before confirming or rejecting the hypothesis

### Requirement: Deterministic policy enforcement
Policy SHALL be evaluated independently of the model before every command and tool action.

#### Scenario: Independent assessment is active
- **WHEN** any Mentor command is requested from an independent exam or hidden transfer assessment
- **THEN** the runtime SHALL deny model, retrieval, hint, reference, and edit actions and record the denial

### Requirement: Learner-controlled edits
The runtime SHALL never apply model-generated code automatically; proposed changes SHALL be bounded diffs with accept or reject decisions.

#### Scenario: Mentor proposes a correction
- **WHEN** a code change is generated
- **THEN** the learner SHALL inspect and explicitly accept or reject it before state changes, and the decision SHALL be evidence in the run

### Requirement: Evidence-qualified claims
A confirmed diagnosis SHALL cite executed or authoritative evidence sufficient for its confidence; otherwise it SHALL remain a hypothesis.

#### Scenario: Tool result contradicts the hypothesis
- **WHEN** differential execution does not reproduce the proposed cause
- **THEN** the runtime SHALL reject or replan the hypothesis and SHALL NOT repeat it as confirmed

### Requirement: Question-scoped learning evidence
Every learner question SHALL target exactly one skill declared by the current problem, and a supported learner response SHALL update only that targeted skill.

#### Scenario: Model selects an unrelated skill
- **WHEN** the model asks a learner question with a target skill outside the current problem skills
- **THEN** the runtime SHALL reject the action, return the rejection as tool evidence, and allow the model to replan

#### Scenario: Legacy prompt has no target skill
- **WHEN** a persisted learner prompt predates question-scoped skill evidence
- **THEN** a supported response SHALL update at most the first current problem skill and SHALL NOT fan out across every problem skill

### Requirement: Visible adaptive training target
The prediction interface SHALL name the human-readable skill selected for the current learner question and explain that the response contributes evidence only to that skill.

#### Scenario: Targeted prediction is waiting
- **WHEN** a pending learner question has a recognized target skill
- **THEN** the interface SHALL show the localized skill title beside the prediction action without exposing the expected concept or internal confidence

#### Scenario: Legacy prompt has no recognized target
- **WHEN** a pending learner question has no recognized target skill
- **THEN** the prediction action SHALL remain usable without rendering an empty or internal-id target card

### Requirement: Learner action precedes Agent trace
When the Mentor is waiting for a learner prediction, the current question and response action SHALL be presented before submission metadata, AI receipts, event history, and tool execution details.

#### Scenario: Prediction is pending with a long Agent trace
- **WHEN** the current Mentor cycle contains multiple observations and tool executions
- **THEN** the learner SHALL encounter the targeted question and prediction action first, while every trace and evidence disclosure remains available below

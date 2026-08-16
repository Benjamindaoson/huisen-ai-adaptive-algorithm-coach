## ADDED Requirements

### Requirement: Prerequisite algorithm knowledge graph
The curriculum SHALL model high-frequency algorithm skills as versioned nodes with prerequisite edges, learner-friendly objectives, visualization kinds, review intervals, transfer mappings, and reviewed content authority.

#### Scenario: Learner opens a locked node
- **WHEN** required prerequisite evidence is missing
- **THEN** the graph SHALL identify the smallest incomplete prerequisite and prevent false mastery claims

#### Scenario: Graph contains a cycle or missing skill
- **WHEN** curriculum validation encounters an invalid edge, duplicate node, cycle, or unknown transfer skill
- **THEN** the build and quality gate SHALL fail

### Requirement: Five-stage learn-by-practice lesson
Every active curriculum node SHALL provide a 5–10 minute plain-language explanation, interactive state visualization, prediction checkpoint, partial coding task, and complete practice task.

#### Scenario: Non-specialist begins a lesson
- **WHEN** a learner opens an available node
- **THEN** the lesson SHALL introduce one mental model in ordinary language before presenting formal terminology or complete code

#### Scenario: Prediction is incorrect
- **WHEN** a learner predicts the next program state incorrectly
- **THEN** the lesson SHALL explain the specific state transition and require another learner action before advancing

### Requirement: Minimal remediation and return
Failed practice SHALL route to the smallest relevant incomplete prerequisite only when the problem-skill mapping and evidence support that route, and the lesson SHALL preserve the originating problem as a return target.

#### Scenario: Remediation lesson completes
- **WHEN** the learner completes the prescribed prerequisite activity
- **THEN** the product SHALL offer immediate return to the original problem with the prior attempt still visible

#### Scenario: Error cause is unknown
- **WHEN** evidence does not support a specific prerequisite
- **THEN** the product SHALL request more evidence or offer a general skill route without presenting a confirmed diagnosis

### Requirement: Transfer and delayed review own mastery
Lesson completion SHALL remain separate from mastery; mastery SHALL require an unassisted reviewed or hidden transfer and SHALL be re-evaluated after a configured delay.

#### Scenario: Transfer problem passes independently
- **WHEN** a learner passes a different-surface transfer without assistance
- **THEN** the system SHALL record transfer evidence and schedule a delayed review

#### Scenario: Delayed review is missed or failed
- **WHEN** the review becomes due without a successful independent result
- **THEN** confidence SHALL decay according to deterministic rules and the node SHALL return to the review queue

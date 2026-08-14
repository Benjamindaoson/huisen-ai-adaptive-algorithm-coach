## ADDED Requirements

### Requirement: Versioned algorithm bridge graph
The system SHALL represent the algorithm bridge as a versioned directed acyclic graph in which every curriculum node declares its identifier, version, prerequisites, skill identifiers, observable objective, misconceptions, learning activities, transfer contract, review intervals, authority level, and canonical content hash.

#### Scenario: Valid curriculum is loaded
- **WHEN** the application loads a curriculum version whose nodes have valid prerequisites, known skills, immutable hashes, and no cycles
- **THEN** the system exposes that version as an available algorithm bridge curriculum

#### Scenario: Invalid curriculum is loaded
- **WHEN** a curriculum contains a cycle, unknown prerequisite, unknown skill, duplicate identifier, invalid review interval, or content that does not match its canonical hash
- **THEN** the system rejects that version and keeps the last valid curriculum active

### Requirement: Two entry runways share one graph
The curriculum SHALL provide a programming-foundation runway and an algorithm-bridge runway within the same prerequisite graph rather than maintaining independent course products or progress models.

#### Scenario: Learner needs programming foundations
- **WHEN** diagnostic evidence shows that the learner cannot yet reliably trace basic control flow or complete a small syntax task
- **THEN** the system starts the learner at the smallest unmet foundation node and shows how that node leads toward algorithm problem solving

#### Scenario: Learner already has syntax foundations
- **WHEN** diagnostic evidence shows stable basic Python use but a gap in modeling, data-structure selection, implementation, debugging, or validation
- **THEN** the system skips satisfied foundation nodes and enters the corresponding algorithm-bridge node

### Requirement: Curriculum covers the bridge outcome
The target curriculum SHALL organize nodes into program execution, problem modeling, high-frequency patterns, structures and search, and mixed unseen transfer, while marking not-yet-released nodes unavailable rather than presenting empty or pretend-complete lessons.

#### Scenario: Learner views the full learning map
- **WHEN** the learner opens the algorithm bridge map
- **THEN** the system shows the five curriculum segments, current available nodes, prerequisites, evidence state, and explicitly marked future nodes

#### Scenario: Learner opens an unavailable node
- **WHEN** the learner selects a node whose reviewed learning and transfer content is not released
- **THEN** the system explains that the node is not yet available and offers the nearest available prerequisite without recording lesson progress

### Requirement: Every node uses a five-stage learning unit
Every available curriculum node MUST provide plain explanation, observable state visualization, learner prediction, constrained local coding, and a different-surface transfer handoff in that order.

#### Scenario: Learner progresses through a node
- **WHEN** the learner completes a verified action in the current stage
- **THEN** the system records bounded stage evidence and unlocks the next stage while keeping one primary action visible

#### Scenario: Learner answers a prediction incorrectly
- **WHEN** the learner selects an incorrect state prediction
- **THEN** the system explains the relevant misconception in plain language, allows retry, and does not mark the stage as passed

### Requirement: Curriculum language is understandable before it is professional
Every available node SHALL explain the concept in plain Chinese and visible state changes before introducing the professional term, and MUST NOT require compiler-internal vocabulary to complete the lesson.

#### Scenario: Non-specialist opens a lesson
- **WHEN** the lesson first renders
- **THEN** the learner sees the practical objective, everyday explanation, estimated time, and first learning action before optional professional detail

### Requirement: Formal curriculum content is trusted and reviewable
Canonical explanations, answers, examples, misconceptions, mappings, and transfer tasks used for formal learning evidence MUST be human-reviewed; model-generated material SHALL remain candidate content until automatic execution and human promotion succeed.

#### Scenario: Model produces a new analogy or transfer variant
- **WHEN** the model generates candidate instructional content
- **THEN** the system labels it as AI-generated candidate content and prevents it from affecting formal completion or mastery evidence

#### Scenario: Candidate content passes only automatic checks
- **WHEN** candidate content passes schema, reference solution, test, similarity, and leakage checks but has no human decision
- **THEN** the system may retain it for review but MUST NOT use it in a formal mastery assessment

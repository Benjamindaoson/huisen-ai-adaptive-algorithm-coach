## ADDED Requirements

### Requirement: Evidence-bound entry diagnosis
The system SHALL conduct a short entry diagnosis using the learner's goal, available study time, prior evidence, state prediction, basic implementation, and problem-modeling actions, and SHALL bind every diagnosis claim to evidence or mark it as an unverified baseline hypothesis.

#### Scenario: New learner completes the entry diagnosis
- **WHEN** a learner with no prior evidence completes the diagnostic actions
- **THEN** the system presents the most likely current bottleneck, supporting observations, remaining uncertainty, recommended entry node, and one ten-minute next task

#### Scenario: Learner abandons the diagnosis
- **WHEN** the learner leaves before enough diagnostic evidence is collected
- **THEN** the system preserves completed actions, labels the plan as incomplete baseline guidance, and offers a resumable next action

### Requirement: Diagnostic placement is challengeable
The system SHALL let a learner attempt a prerequisite-bypass challenge and SHALL use the verified result rather than self-reported confidence to change placement.

#### Scenario: Learner passes a bypass challenge independently
- **WHEN** the learner passes a trusted challenge without disallowed assistance
- **THEN** the system records the evidence, skips the satisfied prerequisite, and explains why the plan changed

#### Scenario: Learner does not pass a bypass challenge
- **WHEN** the learner fails or abandons the challenge
- **THEN** the system recommends the smallest unmet prerequisite without penalizing the learner or lowering unrelated skills

### Requirement: Today presents one explainable primary mission
The Today experience SHALL present one primary algorithm-bridge mission with its goal, estimated time, prerequisite, expected learning gain, recommendation reason, confidence, and completion criterion in ordinary Chinese.

#### Scenario: Learner has a due delayed review
- **WHEN** a high-priority delayed review is due
- **THEN** Today selects that review as the primary mission and explains that it is checking whether earlier learning was retained

#### Scenario: Learner has no reliable history
- **WHEN** the system has insufficient learning evidence
- **THEN** Today labels the mission as a baseline starting task and states which action will make the next recommendation more personal

### Requirement: Plans change only from explainable events
The system SHALL replan from validated diagnostic, training, assistance, submission, transfer, and delayed-review events; free-form model opinion MUST NOT directly change prerequisites, mastery, or readiness.

#### Scenario: New evidence changes the next task
- **WHEN** a validated event changes the highest-priority learning need
- **THEN** the system produces a new plan version that cites the event, states what changed, and supersedes but does not delete the prior plan

#### Scenario: Model suggests a different route without new evidence
- **WHEN** the model proposes a route change that is not supported by a validated event
- **THEN** the system may show it as a suggestion but keeps the authoritative plan unchanged

### Requirement: Learning context continues across surfaces
Today, the learning map, training cabin, problem workspace, review queue, insights, and exam SHALL read the same curriculum version and authoritative learner projection.

#### Scenario: Learner moves from a lesson to a transfer task
- **WHEN** the learner starts the transfer stage
- **THEN** the problem workspace receives the originating curriculum node, assistance policy, verification mode, and return destination

#### Scenario: Learner returns on another device
- **WHEN** an authenticated learner opens the application after server synchronization
- **THEN** the system restores the current mission, completed stages, pending remediation, due reviews, and readiness evidence without relying on one browser's local storage

### Requirement: The first useful run is reachable quickly
The first-time journey SHALL let a new learner reach and run a meaningful state-observation or local-code action without browsing the full problem library or configuring advanced settings.

#### Scenario: New learner follows the recommended path
- **WHEN** the learner opens TIA and accepts the baseline diagnostic mission
- **THEN** the interface leads directly from diagnosis to the first runnable learning action with no unrelated navigation requirement

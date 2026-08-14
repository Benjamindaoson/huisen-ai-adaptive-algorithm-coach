## ADDED Requirements

### Requirement: Readiness is multidimensional
The algorithm bridge report SHALL present separate evidence for problem understanding, modeling, implementation, debugging, validation, independence, hint dependence, transfer, and retention, and MUST NOT hide those dimensions behind a single unexplained score.

#### Scenario: Learner opens the readiness report
- **WHEN** readiness evidence exists
- **THEN** the system shows each dimension's current state, strongest evidence, unresolved gap, confidence, and next action

#### Scenario: Evidence is sparse
- **WHEN** a dimension lacks enough valid evidence
- **THEN** the report displays “evidence insufficient” and the smallest task that can provide the missing evidence

### Requirement: Final assessment has explicit prerequisites
The system SHALL unlock the final algorithm bridge assessment only when required foundation and core-pattern skills have independent transfer evidence and no blocking delayed review is overdue.

#### Scenario: Learner satisfies the assessment gate
- **WHEN** all required skills meet the configured evidence threshold
- **THEN** the system unlocks the no-AI assessment and explains the gate evidence

#### Scenario: Learner does not satisfy the assessment gate
- **WHEN** one or more required skills lack evidence or have a blocking retention gap
- **THEN** the system keeps the assessment locked, lists the specific gaps, and offers the highest-priority preparation task

### Requirement: Final assessment enforces no-AI independence
The final assessment SHALL disable Mentor actions, course retrieval, reference answers, solution history, generated diffs, and cross-route access to protected learning content while the session is active.

#### Scenario: Learner starts the final assessment
- **WHEN** an eligible learner begins the assessment
- **THEN** the system starts a timed, resumable session with explicit integrity policy, trusted task versions, and protected route state

#### Scenario: Learner attempts to open protected help
- **WHEN** the learner navigates to Mentor, reference, lesson answer, or solution history during the active assessment
- **THEN** the application blocks or redirects the action and records an integrity event without exposing the protected content

### Requirement: Bridge completion requires unfamiliar integrated work
The system SHALL grant algorithm bridge completion only from trusted performance on unfamiliar integrated tasks plus an explanation of key state, complexity, and boundary cases.

#### Scenario: Learner passes the integrated assessment
- **WHEN** the learner meets the configured task, independence, explanation, and integrity criteria
- **THEN** the system records a versioned bridge outcome, names the demonstrated scope, and preserves the underlying evidence

#### Scenario: Learner passes public samples but lacks trusted verdicts
- **WHEN** the available evidence covers only public samples or unreviewed tasks
- **THEN** the system marks the outcome as incomplete and does not issue a completion claim

### Requirement: Outcome claims have narrow meaning
Every bridge outcome SHALL state that it represents preparation for a defined algorithm screening level and SHALL NOT claim complete job readiness, guaranteed employment, salary, or qualification as an AI algorithm engineer.

#### Scenario: Learner completes the bridge
- **WHEN** the completion report is generated
- **THEN** the report distinguishes demonstrated algorithm-screening evidence from untested mathematics, machine learning, system engineering, project delivery, and workplace collaboration

### Requirement: Completion leads to applied project evidence
After algorithm bridge completion, the system SHALL recommend an appropriate project practicum that uses demonstrated skills in a realistic multi-step task and keeps project evidence separate from algorithm assessment evidence.

#### Scenario: Learner accepts the practicum handoff
- **WHEN** the learner chooses the recommended next stage
- **THEN** the system creates a project mission with prerequisites derived from the bridge outcome and begins a separate engineering-evidence track

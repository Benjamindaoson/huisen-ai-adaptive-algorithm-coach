## ADDED Requirements

### Requirement: Completion, success, and mastery are separate facts
The system SHALL store and present task success, lesson completion, and mastery evidence as distinct states, and none of them SHALL silently substitute for another.

#### Scenario: Learner completes all lesson stages
- **WHEN** the learner finishes explanation, observation, prediction, and constrained coding
- **THEN** the system records lesson completion and marks independent transfer as pending rather than declaring mastery

#### Scenario: Learner passes a task after viewing high-level help
- **WHEN** a submission passes after the learner viewed a solution-level hint or reference answer
- **THEN** the system records assisted task success and schedules a different-surface independent transfer without increasing independent mastery

### Requirement: Assistance is measured per attempt
Every verification attempt SHALL carry an assistance policy and an immutable assistance ledger covering Mentor hints, reference views, generated diffs, external-answer declarations, and policy violations.

#### Scenario: Learner requests a permitted minimal hint
- **WHEN** the current verification mode allows a location-level or conceptual hint
- **THEN** the system records the help level and continues the attempt under the resulting evidence class

#### Scenario: Learner accesses disallowed help
- **WHEN** a transfer or no-AI assessment detects a disallowed Mentor, reference, retrieval, or answer action
- **THEN** the system invalidates that attempt for independent mastery while preserving it as learning activity

### Requirement: Independent transfer uses a different surface
A mastery-eligible transfer MUST test the same target skill through a materially different problem surface and MUST use a trusted judge or reviewed assessment contract.

#### Scenario: Learner passes a valid transfer independently
- **WHEN** the learner solves a trusted different-surface task within the assistance budget and the verdict is accepted
- **THEN** the system records independent transfer evidence for the mapped skills and schedules delayed reviews

#### Scenario: Transfer task repeats the lesson answer structure too closely
- **WHEN** similarity or leakage checks show that the transfer can be solved by copying the lesson template with superficial edits
- **THEN** the system excludes the task from mastery-eligible transfer and requests another verified variant

### Requirement: Delayed review checks retention
After independent transfer, the system SHALL schedule review opportunities at 1, 7, and 30 day target intervals, adjusted only by explicit deterministic scheduling rules.

#### Scenario: Delayed review becomes due
- **WHEN** the current time reaches a review due date and no higher-risk obligation supersedes it
- **THEN** Today prioritizes an unseen or changed-surface review and explains which retained skill it is checking

#### Scenario: Learner passes delayed review independently
- **WHEN** a trusted review attempt passes within the allowed assistance policy
- **THEN** the system records retention evidence, advances the review schedule, and shows the evidence in the contribution ledger

#### Scenario: Learner fails delayed review
- **WHEN** a trusted delayed review fails
- **THEN** the system lowers only the affected retention/readiness dimensions, schedules targeted refresh work, and preserves prior historical evidence

### Requirement: Mastery projection is deterministic and auditable
Mastery, independence, hint dependence, transfer, misconception recurrence, and forgetting SHALL be projected from validated events by versioned deterministic rules with a learner-readable contribution ledger.

#### Scenario: Projection changes after valid evidence
- **WHEN** a qualifying event is accepted
- **THEN** the projection records the affected skill, dimension, delta or state transition, rule version, event identifiers, evidence references, and timestamp

#### Scenario: Model emits a mastery opinion
- **WHEN** a model response claims that the learner has mastered or forgotten a skill
- **THEN** the system treats the statement as non-authoritative commentary unless matching validated events independently produce that state

### Requirement: Untrusted evidence cannot grant mastery
Candidate content, local-only unverifiable verdicts, missing skill mappings, stale curriculum versions, and malformed events MUST NOT create formal mastery or readiness evidence.

#### Scenario: Offline learner completes a server-verified transfer task
- **WHEN** the required judge is unavailable and the client can only run an untrusted local check
- **THEN** the system preserves the attempt as pending verification and does not grant mastery until trusted validation succeeds

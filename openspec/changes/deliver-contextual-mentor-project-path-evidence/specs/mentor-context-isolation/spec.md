## ADDED Requirements

### Requirement: Active Mentor events are workspace scoped
The system SHALL show active Mentor events only from the idempotent run for the current route kind and route reference.

#### Scenario: Learner moves from a coding problem to a practicum
- **WHEN** the learner navigates to a practicum whose workspace key differs from the active problem workspace
- **THEN** the system clears the visible problem timeline and starts or recovers the practicum-scoped Mentor run

#### Scenario: Learner returns to a previous workspace
- **WHEN** the learner returns to a workspace that already has a scoped run
- **THEN** the system recovers that workspace's run without creating a duplicate or showing another workspace's hypotheses

### Requirement: Current scope is visible
The system SHALL display the current workspace and task reference adjacent to the active Mentor timeline.

#### Scenario: Practicum timeline is shown
- **WHEN** the active workspace is a repository practicum
- **THEN** the timeline identifies that practicum reference and labels its events as current-workspace evidence

### Requirement: Stale cached state fails closed
The system MUST NOT reuse a cached Mentor run when its stored route key differs from the requested workspace key.

#### Scenario: Legacy learner-wide cache exists
- **WHEN** cached state belongs to the learner but contains a different route key
- **THEN** the system ignores it for active conclusions and starts or recovers the route-scoped run

## ADDED Requirements

### Requirement: Bounded pedagogical event model
The system SHALL record semantic learning events for predictions, plans, meaningful edit summaries, runs, tests, hints, references, submissions, diagnoses, remediation, transfers, and reviews without retaining raw keystrokes or arbitrary payloads.

#### Scenario: Meaningful edit is recorded
- **WHEN** source changes after a stable snapshot
- **THEN** the event SHALL contain bounded hash transitions, line counts, changed ranges, and paste band but SHALL NOT contain raw source text

#### Scenario: Unknown payload is submitted
- **WHEN** an event contains an unapproved kind, arbitrary property, hidden test, source code, stdin, stdout, or free-form answer
- **THEN** browser and gateway validators SHALL reject it

### Requirement: Deterministic learning-phase replay
The system SHALL project understanding, modeling, implementation, debugging, and validation phases from validated event order and expose the key evidence nodes that caused each transition.

#### Scenario: Learner debugs after a failed run
- **WHEN** a failed execution is followed by an edit or test event
- **THEN** the replay SHALL show a debugging phase linked to both events

#### Scenario: Evidence is insufficient for a phase
- **WHEN** only a problem-open event exists
- **THEN** the replay SHALL show understanding and SHALL NOT invent modeling or implementation activity

### Requirement: Explainable learner-twin projection
Mastery, misconception recurrence, independence, hint dependence, transfer, and forgetting SHALL be pure projections from validated events, with contribution ledgers identifying event IDs, rules, and deltas.

#### Scenario: Model proposes a learner score
- **WHEN** a model response includes a mastery or independence number
- **THEN** the system SHALL ignore that number unless deterministic event rules independently produce the same update

#### Scenario: Unassisted transfer succeeds
- **WHEN** a reviewed transfer passes without hint or reference events in its assistance window
- **THEN** transfer and independence contributions SHALL increase and cite the transfer attempt

#### Scenario: Assisted practice succeeds
- **WHEN** a problem passes after a hint or reference event
- **THEN** the system SHALL record task success but SHALL NOT treat it as independent mastery

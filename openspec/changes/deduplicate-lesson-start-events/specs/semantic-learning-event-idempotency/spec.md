## ADDED Requirements

### Requirement: Learner lesson-start milestones SHALL be semantically idempotent
Within one learner memory lifecycle, recording `lesson-started` more than once for the same lesson SHALL preserve exactly the first event, including its ID and timestamp.

#### Scenario: Repeated lesson mount
- **WHEN** three `lesson-started` signals with different generated IDs target `variables-state`
- **THEN** learner memory contains exactly one `lesson-started` event for `variables-state` and preserves the first signal's ID and timestamp

#### Scenario: Different lessons
- **WHEN** start signals target `input-output` and `variables-state`
- **THEN** learner memory contains one start event for each lesson

#### Scenario: Independent learner lifecycle
- **WHEN** a new empty learner memory records the same lesson that another learner previously started
- **THEN** the new learner memory records its own first lesson-start event

### Requirement: Pedagogical lesson-open projections SHALL be semantically idempotent
Within one pedagogical memory, repeated projections of the same lesson-start signal SHALL create only one `lesson-opened` event for that lesson evidence reference.

#### Scenario: Repeated pedagogical projection
- **WHEN** repeated `lesson-started` signals for `variables-state` project different pedagogical event IDs
- **THEN** pedagogical memory preserves one `lesson-opened` event with evidence `lesson:variables-state`

#### Scenario: Separate lesson evidence
- **WHEN** starts for two different lessons are projected
- **THEN** each lesson retains one separate `lesson-opened` event

### Requirement: Existing event history SHALL remain auditable
The prospective idempotency change MUST NOT delete or rewrite duplicate events already present during parsing or loading.

#### Scenario: Import historical duplicates
- **WHEN** a valid imported memory already contains multiple historical start events for one lesson
- **THEN** parsing preserves those events, while the next repeated start signal appends no additional duplicate

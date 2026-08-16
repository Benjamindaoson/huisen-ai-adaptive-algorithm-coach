## ADDED Requirements

### Requirement: Evidence metrics expose real denominators
The system SHALL expose numerator, denominator, minimum sample and evidence references for teacher adjudication, independent transfer and seven-day review evidence.

#### Scenario: No eligible sample exists
- **WHEN** a metric denominator is zero
- **THEN** the system shows `not-collected` and does not render a misleading zero-percent outcome

#### Scenario: A small real sample exists
- **WHEN** a metric has real eligible observations below its minimum sample
- **THEN** the system shows the observed fraction and `insufficient` with no effectiveness conclusion

#### Scenario: Minimum sample is reached
- **WHEN** a metric has at least the required number of eligible observations
- **THEN** the system shows `measurable` and the calculated rate with its evidence references

### Requirement: Teacher evidence is server authoritative
The system MUST count teacher quality evidence only from the server quality gate's eligible real adjudications.

#### Scenario: Local or synthetic review exists
- **WHEN** a local review or synthetic preview has been completed but the server reports zero eligible real cases
- **THEN** the teacher evidence metric remains `not-collected`

### Requirement: Transfer evidence requires an independent verified pass
The system MUST count a transfer success only when a transfer start is matched by a later unassisted verified transfer pass.

#### Scenario: Hint-assisted attempt passes
- **WHEN** a learner passes after assistance or without a matching transfer assignment
- **THEN** the event is excluded from the independent transfer numerator

### Requirement: Seven-day evidence respects elapsed time
The system MUST count a learner outcome as seven-day review evidence only when the source transfer is at least seven days old and a later verified review result exists.

#### Scenario: Transfer happened today
- **WHEN** the transfer evidence is less than seven days old
- **THEN** it is shown as not yet eligible and cannot enter the seven-day denominator

### Requirement: The product does not fabricate pilot outcomes
The system SHALL explicitly state that teacher and longitudinal evidence remain unproven until real eligible records satisfy the corresponding sample thresholds.

#### Scenario: Pilot dashboard is opened before evidence matures
- **WHEN** one or more evidence families are not collected or insufficient
- **THEN** the dashboard identifies what must happen next and prohibits an overall success claim

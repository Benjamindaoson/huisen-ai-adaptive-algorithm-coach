## ADDED Requirements

### Requirement: Focused five-stage training cabin
The system SHALL provide a dedicated training route that shows one active stage at a time and a visible five-stage progress rail for explain, observe, predict, build, and transfer.

#### Scenario: Learner opens an available training session
- **WHEN** the learner opens a training URL for an unlocked lesson
- **THEN** the system shows the entry diagnosis, the mission, and the explain stage without exposing a full reference implementation

#### Scenario: Learner reaches state observation
- **WHEN** the learner advances from explanation to observation
- **THEN** the system shows the curriculum's current program state and makes clear that it is a worked example rather than live hidden execution

### Requirement: Prediction and constrained coding are required before transfer
The system SHALL require a correct prediction and a correct constrained local coding completion before it enables the independent transfer action.

#### Scenario: Incorrect constrained completion
- **WHEN** the learner submits an incorrect local completion
- **THEN** the system provides a minimal conceptual cue and does not reveal the missing answer or enable transfer

#### Scenario: Correct constrained completion
- **WHEN** the learner completes the local coding checkpoint correctly
- **THEN** the system records the verified learning milestone and enables the independent transfer stage

### Requirement: Independent transfer protects solution independence
The system SHALL route the learner to a compatible existing problem in independent-assessment mode after the transfer action.

#### Scenario: Transfer problem exists
- **WHEN** the learner starts the transfer stage for a lesson with a compatible problem
- **THEN** the system records the transfer start and opens that problem without exposing the cabin's answer as a submission-ready reference solution

#### Scenario: Compatible transfer is unavailable
- **WHEN** no compatible trusted problem is available
- **THEN** the system preserves the completed cabin progress and explicitly states that independent verification remains pending

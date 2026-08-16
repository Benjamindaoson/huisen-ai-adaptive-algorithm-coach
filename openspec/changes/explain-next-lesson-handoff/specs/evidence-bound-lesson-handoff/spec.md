## ADDED Requirements

### Requirement: The lesson handoff SHALL explain a matching event-derived recommendation
When an immediate-transfer completion projects a specific foundation lesson, that lesson page SHALL identify the preceding completed training, explain that verified progress and prerequisites selected the current unlocked lesson, state the expected learning payoff, and expose the exact supporting event references.

#### Scenario: Matching next lesson
- **WHEN** the event projection selects `variables-state` after a verified immediate transfer and completed `input-output` prerequisite
- **THEN** the `variables-state` lesson shows a plain-language AI handoff containing the preceding training, the prerequisite-based reason, the lesson objective, and both event references

#### Scenario: First foundation lesson
- **WHEN** a verified immediate transfer selects `input-output` and no foundation prerequisite is required
- **THEN** the lesson handoff explains that `input-output` is the current unlocked first step and cites the transfer event

### Requirement: The lesson handoff SHALL not fabricate personalization
The system MUST render no AI recommendation claim when the current lesson does not exactly match the projected continuation lesson or when the required completion evidence is absent.

#### Scenario: Manual lesson exploration
- **WHEN** a learner opens an available lesson that is not the event-projected continuation
- **THEN** the lesson retains its normal objective and learning flow without an AI handoff card

#### Scenario: No transfer evidence
- **WHEN** a lesson opens without a verified immediate-transfer event
- **THEN** the system does not claim that AI selected the lesson from the learner's history

### Requirement: The lesson handoff SHALL preserve the mastery boundary
The personalized handoff SHALL state that the recommendation concerns the next learning step and does not prove durable mastery.

#### Scenario: Immediate success is not long-term mastery
- **WHEN** the handoff is based on one immediate-transfer completion
- **THEN** the visible explanation states that delayed review or later independent evidence is still required for durable mastery

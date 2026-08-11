## ADDED Requirements

### Requirement: Beginner curriculum map
The system SHALL present a reviewed zero-foundation curriculum ordered by explicit prerequisites, with Python as the default coding language and language-neutral explanations for algorithm concepts.

#### Scenario: New foundation learner opens the map
- **WHEN** a learner whose target is foundation opens the learning map without lesson evidence
- **THEN** the system highlights the first available prerequisite lesson and explains that later lessons unlock through learning evidence

#### Scenario: Returning learner opens the map
- **WHEN** a learner with completed lesson evidence opens the learning map
- **THEN** the system derives completed, available, and locked lesson states from the evidence and recommends the earliest available incomplete lesson

### Requirement: Honest curriculum scope
The system MUST label the initial curriculum as a zero-foundation starting route and MUST NOT imply that completing the initial twelve lessons is equivalent to full algorithm mastery.

#### Scenario: Learner reads the map header
- **WHEN** the initial learning map is rendered
- **THEN** it describes the route as a starting foundation and distinguishes lesson completion from transfer-proven mastery

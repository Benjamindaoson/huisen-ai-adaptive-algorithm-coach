## ADDED Requirements

### Requirement: Fading-scaffold lesson flow
Each lesson SHALL guide the learner through plain explanation, state observation, prediction, Python completion, and transfer in that order, while displaying one primary action at a time.

#### Scenario: Learner completes a prediction
- **WHEN** the learner selects the correct checkpoint answer
- **THEN** the system explains why it is correct, records checkpoint evidence, and unlocks the completion stage

#### Scenario: Learner answers incorrectly
- **WHEN** the learner selects an incorrect checkpoint answer
- **THEN** the system gives a plain-language correction, keeps the checkpoint retryable, and does not record a passed checkpoint

#### Scenario: Learner completes lesson scaffolding
- **WHEN** the learner supplies the reviewed completion answer after passing the checkpoint
- **THEN** the system records lesson completion and presents a separate transfer action without claiming independent mastery

### Requirement: Non-specialist presentation
The lesson SHALL use plain Chinese, everyday analogies, and visible state changes by default; professional terminology SHALL be secondary and compiler-internal terminology SHALL not be required to understand the lesson.

#### Scenario: Learner reads a lesson
- **WHEN** a lesson is first rendered
- **THEN** the plain title, objective, analogy, and current state frame appear before professional terminology or extended detail

## ADDED Requirements

### Requirement: A lesson handoff SHALL accept one of two bounded responses
An evidence-bound lesson handoff SHALL offer `这正是我需要的` and `我不明白为什么`, and SHALL persist the selected choice with the lesson ID and deterministic recommendation ID without storing free text.

#### Scenario: Helpful response
- **WHEN** the learner selects `这正是我需要的`
- **THEN** the product records a sync-compatible `lesson-handoff-feedback` event with `choiceId: helpful` and states that the response does not affect mastery

#### Scenario: Unclear response
- **WHEN** the learner selects `我不明白为什么`
- **THEN** the product records `choiceId: unclear`, explains that the sequence does not label the learner as weak, and offers a link to review the preceding training

### Requirement: The latest response SHALL be the active response
For one recommendation ID, the system SHALL restore the newest valid choice, suppress another identical active choice, and retain a changed choice as a newer immutable revision.

#### Scenario: Repeat identical response
- **WHEN** `helpful` is already active and the same response is recorded again
- **THEN** no additional learning event is appended

#### Scenario: Change response
- **WHEN** `helpful` is active and the learner then selects `unclear`
- **THEN** a newer event is appended and `unclear` becomes the active response after reload

#### Scenario: Different recommendation evidence
- **WHEN** the same lesson is later recommended with a different evidence set
- **THEN** its response is stored and projected independently under a different recommendation ID

### Requirement: Feedback validation SHALL be symmetric and bounded
Frontend parsing, gateway validation, and platform migration MUST accept only `helpful` or `unclear` with valid lesson and recommendation IDs, and MUST reject or quarantine unknown choices, missing identifiers, and free-form fields.

#### Scenario: Valid synchronized event
- **WHEN** a valid feedback event is parsed, batched through the gateway, and planned for migration
- **THEN** every boundary accepts it as one bounded event

#### Scenario: Invalid choice
- **WHEN** a feedback event contains `choiceId: explain-everything` or lacks `recommendationId`
- **THEN** frontend and gateway validation reject it and migration does not send it

### Requirement: Feedback SHALL NOT change learning mastery
The response SHALL remain product-experience evidence and SHALL NOT contribute to lesson completion, transfer verification, skill mastery, or teacher-quality claims.

#### Scenario: Feedback-only history
- **WHEN** learner history contains only a lesson-handoff feedback event
- **THEN** lesson progress and mastery remain unchanged

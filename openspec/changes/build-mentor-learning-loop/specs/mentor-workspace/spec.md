## ADDED Requirements

### Requirement: Mentor timeline is persistent in the coding workspace
The coding workspace SHALL show the Mentor timeline without requiring the learner to switch to a separate AI tab.

#### Scenario: Problem opens
- **WHEN** a learner opens a problem with the learning gateway configured
- **THEN** the editor-side workspace shows the current Mentor phase, latest observation, hypothesis, missing evidence, and next learner action

### Requirement: Timeline exposes evidence and verification state
The timeline SHALL render observation, hypothesis, missing-evidence, tool, verification, learner-question, and learner-action events with concise citations and explicit runtime mode.

#### Scenario: Tool finishes
- **WHEN** the Mentor completes syntax analysis or execution verification
- **THEN** a timeline event identifies the tool, bounded input summary, result, evidence references, and verification status

### Requirement: Learner can continue a Socratic session inline
The timeline SHALL accept prediction and reflection responses and submit them to the same persisted Mentor session.

#### Scenario: Prediction response
- **WHEN** the learner answers the inline prediction question
- **THEN** the response is appended to the session and the next Mentor turn updates without losing editor code or runner state

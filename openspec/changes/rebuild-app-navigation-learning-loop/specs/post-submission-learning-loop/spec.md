## ADDED Requirements

### Requirement: Separate reference answer

The problem workspace SHALL separate reference thinking and code from the ordinary problem description.

#### Scenario: Open reference before submitting

- **WHEN** the learner has not made a sample submission and chooses Reference Answer
- **THEN** the application asks for confirmation before revealing it

#### Scenario: Open reference after submitting

- **WHEN** at least one sample submission exists for the current problem and language
- **THEN** the application reveals the available reference thinking, complexity, and language code without another warning

### Requirement: Evidence-first submission feedback

After a sample submission, the result view SHALL present the verdict, case evidence, a coach diagnosis, and explicit next actions in one flow.

#### Scenario: Wrong answer

- **WHEN** actual output differs from expected output
- **THEN** the result identifies the failing case and displays expected and actual output
- **AND** the coach diagnosis cites that evidence
- **AND** the learner can retry, request a stronger hint, or open the reference answer

#### Scenario: Model service unavailable

- **WHEN** the configured model service is absent or fails
- **THEN** the application supplies a labeled local evidence diagnosis rather than an empty or failed AI panel

### Requirement: Honest result semantics

The application SHALL distinguish custom Run, public sample submission, and official hidden-test acceptance.

#### Scenario: All public samples pass

- **WHEN** all available public samples pass
- **THEN** the UI states that public samples passed
- **AND** it does not claim official acceptance unless hidden tests were executed

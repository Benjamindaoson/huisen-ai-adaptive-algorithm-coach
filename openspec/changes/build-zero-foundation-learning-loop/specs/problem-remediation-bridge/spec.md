## ADDED Requirements

### Requirement: Contextual prerequisite remediation
The system SHALL map a failed practice attempt to at most one relevant reviewed prerequisite lesson using explicit skill mappings and SHALL label the recommendation as support rather than verified diagnosis.

#### Scenario: Failed attempt has a mapped lesson
- **WHEN** the latest practice attempt fails and the problem skills map to an incomplete lesson
- **THEN** the problem workspace offers a short lesson link that states the relevant concept and preserves the failed attempt in history

#### Scenario: No suitable lesson exists
- **WHEN** the failed problem has no reviewed lesson mapping or the mapped lesson is already complete
- **THEN** the workspace does not display an unrelated remediation link

### Requirement: Transfer back to practice
The system SHALL select an existing complete runnable problem for a completed lesson's transfer skill when one is available and SHALL record transfer-start evidence before navigation.

#### Scenario: Learner starts transfer
- **WHEN** the learner activates the transfer action for a completed lesson with a matching problem
- **THEN** the system records lesson-transfer-started and opens the selected problem workspace

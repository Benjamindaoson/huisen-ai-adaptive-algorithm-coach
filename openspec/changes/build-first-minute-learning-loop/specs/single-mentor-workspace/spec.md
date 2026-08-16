## ADDED Requirements

### Requirement: Problem workspace has exactly one Mentor surface
The problem route SHALL render one contextual Mentor surface and MUST NOT render the global Mentor dock beside it.

#### Scenario: Learner opens a problem
- **WHEN** a normal learning problem route loads
- **THEN** the workspace contains the runner-scoped Mentor and no duplicate persistent dock

### Requirement: Mentor diagnosis waits for evidence
The contextual Mentor SHALL not produce a diagnosis before the learner has run or submitted code. Before evidence exists it MUST explain what action will enable analysis.

#### Scenario: Learner has not run code
- **WHEN** the workspace has no attempt
- **THEN** the Mentor shows a pre-run expectation rather than an error diagnosis

#### Scenario: Learner has a failed attempt
- **WHEN** a failed run or sample submission is recorded
- **THEN** the Mentor becomes visible with analysis bound to that attempt

### Requirement: Learner can enter focus mode
The problem workspace SHALL provide an explicit focus-mode toggle that prioritizes editor, runner, and contextual Mentor while remaining reversible.

#### Scenario: Learner enters focus mode
- **WHEN** the learner activates focus mode
- **THEN** nonessential reading context is hidden and an exit action remains available

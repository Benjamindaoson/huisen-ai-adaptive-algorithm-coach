## ADDED Requirements

### Requirement: Explicit independent exam mode
The independent exam SHALL use a fixed absolute deadline, resumable answers, bounded execution, and final judging while disabling Mentor, reference answers, historical solutions, and AI assistance.

#### Scenario: Independent exam resumes
- **WHEN** the browser refreshes before the absolute deadline
- **THEN** the same question set, drafts, mode, and deadline SHALL be restored without extending time

#### Scenario: Assistance is requested
- **WHEN** the learner tries to open Mentor or a reference during an independent session
- **THEN** the feature SHALL remain unavailable and the exam SHALL continue without exposing the content

### Requirement: Auditable AI-collaboration exam mode
The AI-collaboration exam SHALL provide bounded planning, delegation, code review, test generation, correction, and oral follow-up interactions while recording the attempt, prompts, tool actions, diffs, tests, and learner decisions.

#### Scenario: AI proposes a code change
- **WHEN** the interview agent returns an edit
- **THEN** the learner SHALL be able to inspect and accept or reject a bounded diff and the decision SHALL be recorded

#### Scenario: Learner validates generated code
- **WHEN** the learner creates or runs a test that exposes an AI error and then corrects it
- **THEN** the report SHALL cite the test, correction diff, and explanation as AI-collaboration evidence

### Requirement: Multi-dimensional evidence report
Exam reports SHALL present algorithm ability, independent completion, hint dependence, and AI collaboration separately with evidence, observed/not-observed state, and confidence.

#### Scenario: Independent mode finishes
- **WHEN** no AI-collaboration evidence is available
- **THEN** AI collaboration SHALL be marked `not-observed` rather than zero or inferred

#### Scenario: Public samples are the only judge
- **WHEN** hidden judging is unavailable for a problem
- **THEN** the report SHALL say `public-sample simulation` and SHALL NOT call the result an official acceptance

### Requirement: Evidence-driven retry plan
The report SHALL produce a retry set from failed skills, repeated misconceptions, assistance dependence, and due review evidence without merging dimensions into one opaque total.

#### Scenario: Learner opens a retry recommendation
- **WHEN** an exam report contains a supported weakness
- **THEN** the product SHALL open a relevant lesson or fresh problem and preserve a link back to the report evidence

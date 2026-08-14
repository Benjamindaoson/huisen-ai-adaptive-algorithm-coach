## ADDED Requirements

### Requirement: Remediation is bound to an immutable attempt
Every remediation recommendation SHALL reference the original problem, immutable attempt snapshot, execution result, evidence used, target skill, recommended curriculum node, and return position.

#### Scenario: Mentor diagnoses a failed attempt with sufficient evidence
- **WHEN** the attempt evidence supports a known misconception or prerequisite gap
- **THEN** the system creates a remediation link that identifies the evidence, explains the gap in plain language, and offers the smallest matching learning node

#### Scenario: Current editor differs from the diagnosed attempt
- **WHEN** the learner edits code after the diagnosed attempt was captured
- **THEN** the remediation view continues to cite the diagnosed snapshot and displays that the current code has changed

### Requirement: Insufficient evidence triggers evidence collection
The Mentor MUST distinguish a supported diagnosis from a hypothesis and SHALL request the smallest useful observation before prescribing a specific lesson when evidence is insufficient.

#### Scenario: Failure output cannot distinguish two causes
- **WHEN** the available code and runtime evidence support multiple plausible causes
- **THEN** the Mentor asks for a state prediction, targeted run, test, or plan explanation and does not claim a confirmed misconception

#### Scenario: Additional evidence resolves the cause
- **WHEN** the requested observation produces discriminating evidence
- **THEN** the Mentor updates the same analysis timeline, records the evidence, and either recommends a minimal lesson or explains that no lesson is needed

### Requirement: Remediation selects the smallest unmet prerequisite
The system SHALL choose the earliest unmet prerequisite that can address the supported gap rather than assigning an entire chapter or restarting the learner's route.

#### Scenario: Gap has multiple prerequisite ancestors
- **WHEN** a supported target node depends on several incomplete ancestors
- **THEN** the system selects the closest required ancestor that lacks evidence and explains the dependency chain

#### Scenario: Learner already proved a prerequisite
- **WHEN** the learner has valid independent evidence for a prerequisite
- **THEN** the system does not assign that prerequisite solely because the current task failed

### Requirement: Learner returns to the original task after remediation
Completing the minimal lesson SHALL return the learner to the original problem, language, draft, attempt history, and diagnostic context, and SHALL show how the practiced concept relates to the blocked step.

#### Scenario: Learner completes the remediation node
- **WHEN** the learner finishes the constrained coding stage of the recommended node
- **THEN** the system offers one primary action to return to the original task and preserves the transfer verification requirement

#### Scenario: Learner leaves remediation midway
- **WHEN** the learner navigates away before completion
- **THEN** the system preserves both the original task context and completed remediation stages and makes the branch resumable from Today

### Requirement: Missing mappings are handled honestly
Only trusted problem-to-skill and skill-to-curriculum mappings SHALL produce specific remediation recommendations.

#### Scenario: No trusted mapping exists
- **WHEN** the failed task or diagnosed gap has no human-reviewed curriculum mapping
- **THEN** the system states that precise remediation is unavailable, offers a general debugging action, and does not create false mastery or lesson evidence

### Requirement: Remediation help remains minimal
The remediation experience MUST NOT expose a submission-ready implementation for the original problem before independent transfer is complete.

#### Scenario: Learner asks for the full original solution during remediation
- **WHEN** the current policy is minimal teaching or independent verification
- **THEN** the Mentor refuses direct solution insertion, explains the learning reason, and offers the next permitted conceptual or local-code action

## ADDED Requirements

### Requirement: Provenance-aware diagnosis dataset
The system SHALL validate every diagnosis fixture with language, learner band, error family, immutable attempt snapshot, execution evidence, expected localization and misconception labels, hint rubric, prohibited answer fragments, review status, and explicit provenance.

#### Scenario: Synthetic fixture is loaded
- **WHEN** a fixture declares `synthetic-mutation` provenance
- **THEN** it MAY participate in deterministic regression metrics but MUST NOT count toward the real-evidence release gate

#### Scenario: Public or first-party fixture is eligible
- **WHEN** a fixture has compatible provenance metadata and completed teacher adjudication
- **THEN** it SHALL count toward real-evidence coverage without being relabeled as a first-party learner submission

### Requirement: Six auditable Mentor metrics
The quality evaluator SHALL report error-line localization, misconception-label accuracy, evidence sufficiency, minimal-hint effectiveness, direct-answer leakage, and false-conclusion rate with fixture counts and segment breakdowns.

#### Scenario: Average hides an empty segment
- **WHEN** a required language, learner band, verdict, or error family has no eligible fixture
- **THEN** the release gate SHALL fail even if aggregate metric thresholds pass

#### Scenario: Unsupported confident diagnosis
- **WHEN** a response makes a high-confidence causal claim without a cited supporting execution or code observation
- **THEN** the evaluator SHALL count a false conclusion and an evidence-sufficiency failure

### Requirement: Diagnosis evidence binding
Every Mentor response presented for evaluation SHALL identify one attempt snapshot, its execution results, actual tool calls, and any current-editor diff.

#### Scenario: Editor changes after submission
- **WHEN** the current source hash differs from the analyzed attempt hash
- **THEN** the review record and Mentor timeline SHALL display the stale snapshot and bounded diff rather than imply the current code was analyzed

### Requirement: Blind human comparison workspace
The internal quality workspace SHALL randomize candidate ordering and collect teacher preference, rubric judgments, evidence references, leakage flags, notes, and adjudication status.

#### Scenario: Teacher completes a comparison
- **WHEN** all mandatory rubric fields are recorded
- **THEN** the decision SHALL be durably stored with reviewer identity, dataset version, candidate hashes, and timestamp

#### Scenario: Reviewers disagree
- **WHEN** two completed teacher reviews conflict
- **THEN** the case SHALL enter an adjudication queue and SHALL NOT be promoted automatically

### Requirement: Calibrated model judging and regression gate
Model judgments SHALL be stored separately from human decisions and SHALL become release-gate inputs only after meeting a configured agreement threshold on a held-out teacher-reviewed set.

#### Scenario: Model judge is uncalibrated
- **WHEN** held-out agreement is below threshold or has insufficient cases
- **THEN** model scores MAY prioritize a review queue but SHALL NOT promote content or pass the Mentor release gate

#### Scenario: Benchmark regression occurs
- **WHEN** any required metric, coverage segment, provenance count, or calibration threshold fails
- **THEN** `quality:mentor` SHALL exit non-zero and produce a machine-readable report identifying the failures

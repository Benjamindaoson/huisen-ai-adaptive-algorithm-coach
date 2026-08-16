## ADDED Requirements

### Requirement: Versioned diagnosis fixtures
The repository SHALL contain bounded, versioned Mentor diagnosis fixtures with expected misconception labels, optional expected source lines, evidence authority, and prohibited answer-leakage fragments.

#### Scenario: Invalid fixture is rejected
- **WHEN** a fixture omits its expected label or contains an out-of-range source line
- **THEN** the quality command SHALL fail with an actionable validation error

### Requirement: Reproducible Mentor quality report
The quality command SHALL score normalized predictions for line localization, misconception classification, unsupported high-confidence conclusions, hint usefulness, and answer leakage, and SHALL publish fixture count beside all rates.

#### Scenario: Benchmark report is generated
- **WHEN** all fixtures and predictions are valid
- **THEN** the command SHALL write a deterministic machine-readable report with current metrics and target thresholds

### Requirement: Human adjudication is source-bound and cannot be synthesized
The quality pipeline SHALL keep pending submissions, teacher gold labels, and Mentor predictions in separate versioned artifacts. A case SHALL become eligible only after a complete teacher adjudication is bound to the original submission hash and reviewed evidence.

#### Scenario: Model output is submitted as a teacher record
- **WHEN** an adjudication lacks a teacher identity, role attestation, source-hash binding, complete gold labels, or reviewed evidence references
- **THEN** the import command SHALL reject it and SHALL leave the case pending

#### Scenario: A valid teacher adjudication and prediction are supplied
- **WHEN** both artifacts reference the same imported case and immutable source hash
- **THEN** the quality command SHALL score the prediction against the teacher gold labels and count the case only if its provenance and coverage are eligible

### Requirement: Review queue is evidence- and coverage-aware
The repository SHALL generate a deterministic review queue that reports whether each pending case contains enough evidence for a teacher to adjudicate and SHALL summarize missing language, learner-band, and verdict coverage.

#### Scenario: Imported submission contains only a verdict and metadata pointer
- **WHEN** no problem statement, failed input/expected/actual triple, compiler diagnostic, or equivalent reviewed root-cause evidence is attached
- **THEN** the queue SHALL mark the case `evidence-incomplete` and SHALL NOT present it as ready for gold labeling

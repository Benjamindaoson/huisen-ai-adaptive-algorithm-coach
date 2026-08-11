## ADDED Requirements

### Requirement: Deterministic diagnostic observations
The system SHALL inspect submitted source code and judge evidence using deterministic tools and SHALL distinguish observations from hypotheses.

#### Scenario: Input parser mismatch
- **WHEN** source-code parsing patterns conflict with the problem input shape
- **THEN** the diagnostic result identifies the parser risk, cites the matching code line, and reports bounded confidence

### Requirement: Judge authority
No diagnostic tool or model SHALL modify, reinterpret, or fabricate the deterministic judge outcome.

#### Scenario: Model conflicts with Judge
- **WHEN** a model returns a conclusion inconsistent with the supplied judge outcome
- **THEN** the runtime rejects that output and uses deterministic evidence

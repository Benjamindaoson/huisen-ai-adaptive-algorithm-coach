## ADDED Requirements

### Requirement: Expected output authorities remain distinct
The system SHALL represent human-reviewed, reference-consensus, candidate, and unverified expected-output evidence as distinct authorities and SHALL expose stable provenance for every admitted expectation.

#### Scenario: Consensus does not impersonate review
- **WHEN** two independent reference executions agree on an output
- **THEN** the expectation is marked `reference-consensus` and not `human-reviewed`

### Requirement: Consensus requires independent successful executions
The system SHALL admit reference consensus only when at least two supported solutions from different languages execute successfully on the exact normalized input and produce the same normalized output.

#### Scenario: Reference outputs disagree
- **WHEN** successful reference implementations produce different outputs
- **THEN** the system returns no trusted expectation and records the disagreement as missing evidence

#### Scenario: Only one reference executes
- **WHEN** fewer than two independent implementations succeed
- **THEN** the system returns no trusted expectation

### Requirement: Reference source remains server-only
The system MUST NOT return reference source code through Mentor tool results, timeline events, browser APIs, or model messages.

#### Scenario: Consensus supports a diagnosis
- **WHEN** the Mentor uses a consensus expectation in differential execution
- **THEN** the browser receives only authority, output, digest, and execution evidence references

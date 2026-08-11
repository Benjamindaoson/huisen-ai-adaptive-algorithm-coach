## ADDED Requirements

### Requirement: Separate content and judge readiness
The system SHALL represent readable content, solution presence, public-sample coverage, hidden-test coverage, and verification as separate fields and MUST NOT infer judge readiness from solution presence alone.

#### Scenario: Unverified problem with a solution
- **WHEN** a problem has a complete statement and reference solution but no reviewed tests
- **THEN** it is readable and solution-present but not judge-ready or verified

### Requirement: Evidence provenance
Every trusted test or solution assertion SHALL include a stable provenance reference and review status.

#### Scenario: Agent cites a test result
- **WHEN** an Agent uses a test result as evidence
- **THEN** the response includes the problem, test class, and provenance reference

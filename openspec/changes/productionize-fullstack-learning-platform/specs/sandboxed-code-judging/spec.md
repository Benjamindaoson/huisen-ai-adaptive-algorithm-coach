## ADDED Requirements

### Requirement: Code execution is isolated and asynchronous
The system SHALL persist an immutable submission before dispatching it to a private Judge0 worker pool that has no production credentials, no unrestricted egress and enforced CPU, memory, process, file and wall-time limits.

#### Scenario: Untrusted program exhausts resources
- **WHEN** submitted code exceeds any configured resource limit
- **THEN** the worker terminates it, records a safe verdict and remains able to process later submissions

### Requirement: Submission state survives process failure
Submission identity, source hash, content version, status, aggregate verdict, timings and audit metadata SHALL be durable and reconcilable after gateway or worker restart.

#### Scenario: Gateway restarts during judging
- **WHEN** a gateway restarts after dispatch but before receiving completion
- **THEN** reconciliation resumes or safely requeues the submission without creating two scored attempts

### Requirement: Hidden tests remain server-only
Hidden inputs, expected outputs, oracle code, generation seeds and reference answers SHALL NOT appear in public builds, client responses, ordinary logs or model context.

#### Scenario: Failed hidden test is reported
- **WHEN** a submission fails a hidden test
- **THEN** the learner receives only the policy-approved aggregate and safe diagnostic metadata

### Requirement: All catalog problems have trusted judge packs
Production SHALL report 754/754 catalog problems with immutable judge-pack versions that satisfy the required oracle, hidden-case, boundary, language-smoke, integrity and review checks.

#### Scenario: Catalog adds or changes a problem
- **WHEN** a catalog build changes a problem without a passing judge pack for the new content hash
- **THEN** the content cannot be marked production-judged and the release coverage gate fails

### Requirement: No public-runner production fallback
Production clients SHALL use the configured private runner and SHALL display a service error or queued state when it is unavailable.

#### Scenario: Judge pool is unavailable
- **WHEN** the private runner health gate is red
- **THEN** the client does not send learner source code to any public third-party fallback

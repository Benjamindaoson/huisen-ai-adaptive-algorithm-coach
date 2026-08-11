## ADDED Requirements

### Requirement: Restricted language execution
The runner gateway SHALL accept only Java, Python, JavaScript and C++ requests and SHALL reject all other languages before submitting to Judge0.

#### Scenario: Reject unapproved language
- **WHEN** a browser submits code with language `bash`
- **THEN** the gateway returns a validation error and does not contact Judge0.

### Requirement: Enforced execution limits
The runner gateway SHALL enforce code/input/output size limits, a two-second execution limit, a memory limit, per-IP request-rate limit and one execution per request.

#### Scenario: Time out a loop
- **WHEN** an allowed-language program exceeds the execution time limit
- **THEN** the browser receives a normalized timeout result.

### Requirement: Private execution dependencies
The Docker deployment SHALL expose only the gateway host port and SHALL keep Judge0, PostgreSQL and Redis unavailable from the browser network.

#### Scenario: Inspect Compose ports
- **WHEN** the runner Compose stack is started
- **THEN** only the gateway has a published host port.

### Requirement: Safe browser integration
The frontend SHALL preserve editor text when execution fails and SHALL show standard output, compiler errors, runtime errors, timeout and unavailable-service outcomes distinctly.

#### Scenario: Runner service unavailable
- **WHEN** the configured gateway is unreachable
- **THEN** the page retains the edited code and displays an unavailable-service result.

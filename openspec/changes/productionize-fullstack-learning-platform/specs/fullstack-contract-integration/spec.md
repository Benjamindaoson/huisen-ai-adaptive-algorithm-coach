## ADDED Requirements

### Requirement: One versioned platform contract serves the Web App
The React application SHALL access remote capabilities through a single typed PlatformClient compatible with `/api/v1`, with request/response validation and contract tests shared with the gateway.

#### Scenario: Gateway response violates contract
- **WHEN** a response lacks a required field or contains an invalid state
- **THEN** the client rejects it as a platform error and does not corrupt local or server state

### Requirement: Production configuration is fail closed
Production builds SHALL require an API origin and SHALL verify identity, data, runner, Mentor and quality capabilities before enabling their corresponding actions.

#### Scenario: Production is built without API origin
- **WHEN** CI creates a production frontend without the required origin
- **THEN** the build or deployment gate fails instead of shipping a local-only application

### Requirement: Critical journeys are end-to-end verified
Automated browser tests SHALL prove registration, anonymous upgrade, catalog access, draft sync, run, hidden submission, independent exam, AI-collaboration exam, Mentor evidence, cross-device resume, export and sign-out against a production-like stack.

#### Scenario: Candidate release is evaluated
- **WHEN** any critical journey fails in the production-like environment
- **THEN** the release is blocked and retains the previous deployable version

### Requirement: Offline behavior cannot forge authority
The client SHALL support cached reading, drafts and semantic-event outbox while offline, but SHALL not create authoritative verdicts, scores, quotas or Agent tool traces.

#### Scenario: Learner submits while offline
- **WHEN** the network is unavailable during submission
- **THEN** the UI keeps the source draft and explains that no verdict exists until the server accepts and executes it

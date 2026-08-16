## ADDED Requirements

### Requirement: Service objectives are measured
Production SHALL publish RED metrics, traces, structured logs and business health for gateway, database, judge, Mentor and sync flows, with alerts tied to declared availability, latency, RPO and RTO objectives.

#### Scenario: Judge latency breaches objective
- **WHEN** the rolling P95 or queue age exceeds its threshold
- **THEN** an actionable alert identifies the affected environment and traceable submissions without exposing source code

### Requirement: Backups are restorable
PostgreSQL and object-store backup policies SHALL meet RPO 15 minutes and RTO 60 minutes, and a scheduled restoration exercise SHALL verify integrity in an isolated environment.

#### Scenario: Restore drill runs
- **WHEN** the latest backup and transaction logs are restored
- **THEN** automated checks reconcile users, events, submissions, exams and Mentor evidence and publish a signed drill report

### Requirement: Security controls are release gated
CI/CD SHALL scan dependencies, containers, secrets, licenses and infrastructure; production SHALL use least privilege, encrypted transport/storage, secret rotation, rate limits, audit retention and an approved threat model.

#### Scenario: Critical vulnerability is detected
- **WHEN** a candidate image contains an unaccepted Critical or High issue in an exposed runtime path
- **THEN** promotion is blocked until it is fixed or an expiring, reviewed exception is recorded

### Requirement: Releases are progressive and reversible
Production changes SHALL use immutable artifacts, database expand-contract migrations, health gates, progressive traffic and automated rollback while retaining newly accepted durable events.

#### Scenario: Canary error budget is exceeded
- **WHEN** the canary breaches its configured error or latency gate
- **THEN** traffic returns to the previous artifact and operators receive a rollback report

### Requirement: Capacity and failure are rehearsed
Before general availability and after material architecture changes, the system SHALL pass representative load, spike, dependency-failure and worker-compromise containment tests.

#### Scenario: DeepSeek and Redis fail simultaneously
- **WHEN** the game day injects both failures
- **THEN** core learning data remains correct, Mentor degrades honestly, judge state reconciles and recovery stays within objectives

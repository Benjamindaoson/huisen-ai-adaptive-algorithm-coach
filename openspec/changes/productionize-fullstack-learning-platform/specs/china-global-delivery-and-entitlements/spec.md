## ADDED Requirements

### Requirement: Deployment planes are isolated but reproducible
The China production plane and global portfolio plane SHALL use the same versioned application artifacts and contracts while maintaining separate data, secrets, quotas, domains and infrastructure state.

#### Scenario: Global demo is compromised or exhausted
- **WHEN** the global plane reaches quota or is disabled
- **THEN** China production data and availability remain unaffected

### Requirement: China launch checks compliance prerequisites
The China production pipeline SHALL require recorded domain, ICP and applicable post-launch filing prerequisites before public domain promotion; monetization SHALL require a separate recorded licensing decision.

#### Scenario: ICP evidence is absent
- **WHEN** a mainland-hosted public domain is selected for promotion without approved filing evidence
- **THEN** the deployment remains private or pre-production

### Requirement: Entitlements are enforced server-side
The system SHALL define Free and Pro entitlements for execution, Mentor, exams, history and reports, with atomic usage accounting, idempotency, reset windows and administrative audit.

#### Scenario: Free daily run quota is exhausted
- **WHEN** a learner requests another run after the atomic daily limit is reached
- **THEN** the server refuses dispatch, returns reset information and incurs no Judge0 or AI work

### Requirement: Cost has hard safety limits
Each environment and entitlement SHALL enforce maximum concurrency, execution time, model tokens, retries and monthly budget with alerts and graceful degradation.

#### Scenario: Monthly AI budget threshold is reached
- **WHEN** projected or actual provider spend reaches the hard limit
- **THEN** nonessential AI requests switch to the documented fallback while learning, exports and existing records remain available

### Requirement: Free demo is labeled honestly
The global free portfolio environment SHALL expose its limited dataset, quotas, retention and non-production SLO and SHALL not be used as evidence that production recovery or availability has passed.

#### Scenario: Recruiter opens system status
- **WHEN** the global demo status page loads
- **THEN** it identifies the environment as Demo and links to separately generated production evidence reports

## ADDED Requirements

### Requirement: Transactional PostgreSQL persistence
When Mentor database configuration is complete, the system SHALL persist sessions and learner twins transactionally in PostgreSQL, enforce learner ownership in queries, and retain bounded session/timeline history.

#### Scenario: Gateway restarts
- **WHEN** a stored Mentor session is requested after a gateway restart
- **THEN** the same learner can retrieve the session and another learner cannot

### Requirement: Explicit storage mode
The system SHALL expose whether it is using `postgres` or `file-local` storage and SHALL NOT silently fall back to files after a configured PostgreSQL store fails.

#### Scenario: Configured database is unavailable
- **WHEN** PostgreSQL mode is configured but initialization or a transaction fails
- **THEN** the Mentor endpoint fails safely instead of creating divergent local state

### Requirement: Signed learner ownership
When `MENTOR_AUTH_SECRET` is configured, the system SHALL require an unexpired HMAC-signed learner token whose subject matches every protected learner ID.

#### Scenario: Cross-learner access is attempted
- **WHEN** a valid token for learner A is used to access learner B's session or twin
- **THEN** the gateway returns an authorization error without revealing whether learner B exists

#### Scenario: Local auth is explicitly unconfigured
- **WHEN** no signing secret is configured
- **THEN** the gateway operates in an explicitly reported `permissive-local` identity mode for backward-compatible local development

### Requirement: Browser identity refresh
The frontend SHALL obtain, cache, attach, and refresh a signed anonymous learner credential without exposing the signing secret.

#### Scenario: Token nears expiry
- **WHEN** the cached token is expired or inside its refresh window
- **THEN** the browser obtains a new credential before issuing a protected Mentor request

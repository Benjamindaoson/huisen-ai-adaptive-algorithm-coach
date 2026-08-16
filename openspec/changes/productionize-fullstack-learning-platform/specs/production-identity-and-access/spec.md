## ADDED Requirements

### Requirement: Production identity is mandatory
The production gateway SHALL require cryptographically protected learner identity and SHALL refuse to start in permissive identity mode.

#### Scenario: Missing production identity secret
- **WHEN** a production process starts without valid identity and session secrets
- **THEN** startup fails before accepting traffic and reports the missing control without exposing secret values

### Requirement: Accounts and sessions are revocable
The system SHALL support registration, verification, sign-in, recovery, rotating sessions, sign-out, device listing and server-side revocation using secure cookies and CSRF protection.

#### Scenario: Revoked session is reused
- **WHEN** a client presents a session whose server-side record has been revoked
- **THEN** the request returns 401 and no learner data is disclosed or mutated

### Requirement: Authorization is resource scoped
Every protected query and mutation SHALL enforce learner ownership or reviewer/admin role at the data access seam and SHALL record sensitive administrative actions.

#### Scenario: Cross-learner identifier is guessed
- **WHEN** one learner requests another learner's profile, attempt, exam or Mentor run
- **THEN** the system returns a non-disclosing authorization response and records the denied access

### Requirement: Anonymous data can be claimed safely
The system SHALL allow a limited anonymous identity to be upgraded to a registered account through an idempotent, auditable ownership migration.

#### Scenario: Claim request is replayed
- **WHEN** the same valid anonymous-data claim is submitted more than once
- **THEN** each source record has one registered owner and the replay returns the original receipt without duplication

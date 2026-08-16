## ADDED Requirements

### Requirement: Learning-event vocabulary has one source

The system SHALL define every accepted learning-event kind and bounded data-key vocabulary in one dependency-free contract imported by device memory, account migration, and Gateway validation.

#### Scenario: A new event kind is introduced

- **WHEN** a developer adds a kind to the canonical contract
- **THEN** every consuming boundary receives the same literal kind without a second copied whitelist

### Requirement: Every canonical kind crosses all persistence boundaries

The system SHALL maintain one minimally valid conformance fixture per canonical kind and prove that device parsing, migration planning, and authoritative Gateway validation accept it.

#### Scenario: A kind lacks migration semantics

- **WHEN** a canonical kind cannot be accepted by account migration
- **THEN** the contract-conformance test fails instead of allowing silent quarantine

### Requirement: Production-like Gateway contains the shared contract

The system SHALL package the canonical contract in the Gateway image and preserve a healthy startup after the import is enabled.

#### Scenario: Docker allowlist omits the contract

- **WHEN** the production-like Gateway image is built without the shared module
- **THEN** build or startup verification fails and the change cannot be kept

## ADDED Requirements

### Requirement: Immutable source archive
The system SHALL copy every declared source root into `archive/original/` before any source-root removal and SHALL preserve each relative path and byte content.

#### Scenario: Archive source material
- **WHEN** the archive command processes the declared material roots
- **THEN** each source file exists beneath `archive/original/` at the same relative path.

### Requirement: Archive integrity manifest
The system SHALL write a manifest containing each archived file path, size and SHA-256 digest and SHALL reject a conflicting existing archived file.

#### Scenario: Detect conflicting archive destination
- **WHEN** an archive destination exists with a different SHA-256 digest
- **THEN** the archive command fails without overwriting that destination.

### Requirement: Verified source migration
The system SHALL move source roots only after source and archive manifest counts and digests are equal.

#### Scenario: Block unverified migration
- **WHEN** any source file differs from its archived digest
- **THEN** the migration command fails and leaves source roots in place.

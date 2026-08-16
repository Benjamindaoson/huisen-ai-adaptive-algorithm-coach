## ADDED Requirements

### Requirement: Authenticated sync failure is safely explained

The system SHALL make an authenticated sync failure discoverable and disclose local safety, bounded pending count, and a non-sensitive blocked category without exposing raw operation or error data.

#### Scenario: Learning event synchronization is blocked

- **WHEN** the outbox reports an event operation with remaining writes
- **THEN** the account recovery surface says valid records remain safe on this device and identifies `学习记录` plus the pending count

#### Scenario: Internal error contains sensitive implementation detail

- **WHEN** the outbox failure contains a URL, stack detail, or raw message
- **THEN** none of that detail appears in the projected issue or rendered account surface

### Requirement: Learner can retry and receives an honest result

The system SHALL offer one disabled-while-running retry action that uses the same synchronization routine as automatic retry and reports either cloud recovery or the remaining bounded blocker.

#### Scenario: Retry drains the outbox

- **WHEN** manual retry returns zero remaining operations
- **THEN** the surface announces that cloud synchronization recovered

#### Scenario: Retry is still blocked

- **WHEN** manual retry returns pending operations
- **THEN** the surface keeps local-safety copy and reports that items still await synchronization

### Requirement: Anonymous local-only truth is preserved

The system SHALL NOT show cloud recovery controls to an unauthenticated learner.

#### Scenario: Optional cloud restore fails while anonymous

- **WHEN** the internal status is error but no authenticated session exists
- **THEN** the visible status remains `仅保存在本机` without a retry action

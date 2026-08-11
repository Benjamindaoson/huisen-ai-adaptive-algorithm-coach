## ADDED Requirements

### Requirement: Per-language code draft recovery
The system SHALL save one code draft per problem and language in the current browser and SHALL restore that draft after navigation or refresh.

#### Scenario: Switch languages without losing work
- **WHEN** a user edits Python code, switches to Java, edits Java code, and returns to Python
- **THEN** the Python editor contains the last saved Python draft and the Java draft remains independently stored.

### Requirement: Distinct execution semantics
The system SHALL distinguish custom-input Run, public Sample Submit, and hidden-test Official Submit in its domain model and user interface.

#### Scenario: Run custom input
- **WHEN** a user selects Run
- **THEN** the system executes the current code once with the editable standard input and does not claim that the problem is accepted.

#### Scenario: Submit public samples
- **WHEN** a user selects Sample Submit on a problem with judgeable samples
- **THEN** every judgeable public sample is executed and shown with an individual verdict, and the interface states that passing samples is not equivalent to passing hidden tests.

### Requirement: Immutable bounded attempt evidence
The system SHALL record a code snapshot, language, mode, result summary and timestamp for each completed run or submit attempt and SHALL retain at most 20 recent attempts per problem and language in browser storage.

#### Scenario: Review a failed sample submission
- **WHEN** a sample submission contains a wrong answer
- **THEN** the stored attempt identifies the failed case and preserves the submitted code snapshot.

### Requirement: Portable versioned learning backup
The system SHALL export progress, drafts and attempts in a validated versioned JSON backup and SHALL import legacy version-1 progress backups without deleting valid current practice data.

#### Scenario: Reject a partially invalid version-2 backup
- **WHEN** any practice section in an imported version-2 backup fails schema validation
- **THEN** the system reports the failure and applies neither progress nor practice changes.

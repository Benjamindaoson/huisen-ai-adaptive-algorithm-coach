## ADDED Requirements

### Requirement: Structured problem records
The system SHALL generate a stable-ID JSON record for each extracted problem containing title, source paths, source types, collection metadata, structured learning sections, languages and completeness state.

#### Scenario: Extract complete HTML problem
- **WHEN** a source HTML file contains a title, description, input/output sections and language-labelled code blocks
- **THEN** its generated record contains those values in their corresponding structured fields.

### Requirement: Traceable duplicate groups
The system SHALL group exact normalized-body duplicates while retaining every source path and SHALL not automatically merge non-identical same-title records.

#### Scenario: Keep non-identical variants separate
- **WHEN** two records share a title but have different normalized bodies
- **THEN** both records remain available and are marked as variant candidates.

### Requirement: Incomplete material representation
The system SHALL represent title-only or thought-placeholder documents as `index-only` and SHALL not expose missing content as a complete solution.

#### Scenario: Index title-only document
- **WHEN** a Word document contains a title but no substantive problem content
- **THEN** the generated catalog includes an index-only entry with its source path.

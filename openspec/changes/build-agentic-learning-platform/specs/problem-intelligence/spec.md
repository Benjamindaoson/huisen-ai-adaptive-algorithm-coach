## ADDED Requirements

### Requirement: Every catalog problem has semantic classification metadata

The corpus builder SHALL emit one or more valid OD skill IDs, a classification source and a confidence value for every canonical problem.

#### Scenario: Golden annotation is available

- **WHEN** a canonical problem exists in the Golden 100 manifest
- **THEN** its stored skills SHALL use the Golden annotation
- **AND** its classification source SHALL identify the annotation status

#### Scenario: No explicit annotation exists

- **WHEN** a canonical problem has no Golden annotation
- **THEN** the builder SHALL infer skills from normalized title and content
- **AND** SHALL mark the result as inferred rather than verified

### Requirement: Content quality remains honest

The catalog SHALL expose completeness, solution language coverage, duplicate source count and review status without treating inferred data as human verified.

#### Scenario: Problem is index-only

- **WHEN** a problem has no complete statement
- **THEN** it SHALL remain searchable
- **AND** SHALL be excluded from practice recommendations and exams

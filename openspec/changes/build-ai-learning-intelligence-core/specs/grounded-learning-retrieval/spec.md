## ADDED Requirements

### Requirement: Cited hybrid retrieval
The system SHALL retrieve bounded problem, skill, solution, and learner evidence using lexical and skill similarity and SHALL return stable citations with every item.

#### Scenario: Retrieve related evidence
- **WHEN** the Diagnostician requests context for a problem and code observation
- **THEN** results are ranked, bounded, cite their source, and expose verification status

### Requirement: Verification-aware ranking
The retriever SHALL prefer verified evidence over unverified content when relevance is otherwise comparable.

#### Scenario: Similar verified and unverified solutions
- **WHEN** two similarly relevant solution items exist
- **THEN** the verified item ranks first and both retain truthful status labels

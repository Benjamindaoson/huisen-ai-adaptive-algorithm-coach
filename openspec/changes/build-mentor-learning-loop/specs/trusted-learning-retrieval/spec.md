## ADDED Requirements

### Requirement: Retrieval searches the complete corpus
The system SHALL search indexed problem statements, solutions, skills, misconceptions, and learner evidence across all locally available problem records.

#### Scenario: Problem diagnosis query
- **WHEN** the Mentor searches for evidence for a problem, skill, or misconception
- **THEN** results are ranked across the complete index and include stable references, bounded excerpts, kind, skill IDs, score, and verification tier

### Requirement: Trust affects authority
The system SHALL distinguish verified, candidate, and unverified evidence and SHALL prevent candidate or unverified solutions from becoming judge authority.

#### Scenario: Candidate solution retrieved
- **WHEN** a candidate solution is relevant
- **THEN** it may be cited as a hypothesis source but is visibly labelled candidate and cannot establish correctness

#### Scenario: Verified evidence available
- **WHEN** verified and unverified evidence are otherwise similarly relevant
- **THEN** verified evidence ranks higher and carries an authoritative eligibility flag

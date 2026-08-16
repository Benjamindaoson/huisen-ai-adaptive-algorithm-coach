## ADDED Requirements

### Requirement: Generated content has explicit provenance and trust
Every generated analogy, counterexample, test, or transfer problem SHALL begin as a versioned candidate with generator identity, prompt hash, source evidence, target skills, and trust state.

#### Scenario: Candidate is displayed internally
- **WHEN** generated content has not passed automated validation
- **THEN** it SHALL be labeled `candidate` and SHALL NOT count as trusted instruction or mastery evidence

### Requirement: Automatic validation precedes promotion
The content validator SHALL check schema, skill references, constraints, duplicate similarity, solution execution, test consistency, answer leakage, and bounded resource use before assigning `auto-validated`.

#### Scenario: Generated transfer has inconsistent tests
- **WHEN** its reviewed solution fails any generated or invariant test
- **THEN** validation SHALL fail with evidence and the candidate SHALL remain unpublished

#### Scenario: Candidate passes automation
- **WHEN** all deterministic checks pass
- **THEN** the content MAY become `auto-validated` but SHALL NOT become `human-verified`

### Requirement: Human promotion controls trusted use
Only an authorized human review SHALL promote generated content to `human-verified` and make it eligible for trusted lessons, official reports, or mastery validation.

#### Scenario: Reviewer promotes content
- **WHEN** a reviewer confirms correctness, pedagogy, difficulty, and non-leakage
- **THEN** the system SHALL store the decision, reviewer, content hash, validation evidence, and version

### Requirement: Expansion remains evidence-gated
Community, enterprise, recruiting, and repository-task expansion SHALL remain disabled until configured Mentor quality, learning-transfer, retention, and content-trust gates pass.

#### Scenario: Product has no longitudinal effect evidence
- **WHEN** minimum learner count, transfer lift, or delayed-retention requirements are unmet
- **THEN** the product SHALL expose the missing evidence internally and SHALL NOT claim validated learning outcomes

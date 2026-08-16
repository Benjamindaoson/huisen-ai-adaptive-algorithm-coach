## ADDED Requirements

### Requirement: Minimal provenance-bound context
The compiler SHALL build a versioned bounded context packet from the current goal, route, attempt evidence, semantic learning events, learner-twin projection, and trusted retrieval with a provenance reference for every claim.

#### Scenario: Context budget is exceeded
- **WHEN** available history is larger than the configured budget
- **THEN** the compiler SHALL prioritize current evidence and pedagogically meaningful same-skill events, compact older state, and report omitted categories

### Requirement: Context contribution validation
Route modules SHALL contribute only typed semantic context and SHALL NOT submit raw keystrokes, arbitrary hidden-test data, or unbounded transcripts.

#### Scenario: Caller contributes forbidden raw data
- **WHEN** a contribution contains raw keystrokes, hidden expected output, or an unknown payload
- **THEN** browser and gateway validators SHALL reject it before model invocation

### Requirement: Authority-aware retrieval
Retrieved content SHALL retain trust level, verification, content hash, and authority; model-generated candidates SHALL not be represented as reviewed truth.

#### Scenario: Candidate conflicts with reviewed content
- **WHEN** candidate content disagrees with a human-verified reference
- **THEN** the compiler SHALL prefer the reviewed reference and expose the conflict as non-authoritative context

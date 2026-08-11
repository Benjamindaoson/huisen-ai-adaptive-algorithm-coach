## ADDED Requirements

### Requirement: Function and call evidence
The code intelligence report SHALL identify bounded named function scopes and direct call edges with source ranges for JavaScript, Python, Java, and C++.

#### Scenario: Helper is called from entry point
- **WHEN** parsed source contains an entry function that calls a named helper
- **THEN** the report contains both function scopes and a caller-to-callee edge with stable evidence references

### Requirement: Dominator and reaching-definition evidence
The report SHALL compute structural dominator sets for reachable control-flow nodes and prior reaching-definition candidates for each bounded symbol use.

#### Scenario: Definition precedes branch use
- **WHEN** a variable is defined before a branch and used inside it
- **THEN** the use evidence includes the prior definition line and the branch node includes its structural dominators

### Requirement: Precision is honest
The report SHALL label its precision `structural-interprocedural` and SHALL NOT present path risks as verified causal diagnoses without runtime or differential evidence.

#### Scenario: Use may lack a prior definition
- **WHEN** a symbol use has no prior local definition
- **THEN** the system emits an unverified path-risk hypothesis rather than a verified error

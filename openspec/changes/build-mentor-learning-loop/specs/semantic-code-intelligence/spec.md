## ADDED Requirements

### Requirement: Supported source is parsed structurally
The system SHALL parse JavaScript, Python, Java, and C++ submissions with a Tree-sitter grammar and return language-neutral syntax, control-flow, def-use, and source-range evidence.

#### Scenario: Valid submission
- **WHEN** a supported-language submission is analyzed
- **THEN** the result contains parser identity, syntax nodes, control-flow edges, def-use facts, and bounded source ranges

#### Scenario: Parser degradation
- **WHEN** the grammar cannot parse part of a submission
- **THEN** the result explicitly reports degraded parse evidence and SHALL NOT silently present regex findings as AST facts

### Requirement: Causal diagnoses are execution verified
The system SHALL keep static findings as unverified hypotheses until a bounded counterexample or trace supports them through the execution adapter.

#### Scenario: Divergent execution
- **WHEN** generated input makes the submission output diverge from a trusted expected output
- **THEN** the hypothesis is marked supported with the input reference, execution reference, line range, and observed values

#### Scenario: No confirming evidence
- **WHEN** bounded verification cannot reproduce the hypothesis
- **THEN** the hypothesis remains unverified and the Mentor reports the missing evidence

## ADDED Requirements

### Requirement: Executable bounded tool loop
The Agent runtime SHALL execute registered tools through an observe-act loop with a maximum step budget and SHALL record actual inputs, outputs, duration, role, and evidence references.

#### Scenario: Deterministic fallback run
- **WHEN** no AI provider is configured
- **THEN** the runtime executes a deterministic allowed-tool plan and identifies the run as deterministic

#### Scenario: Disallowed tool request
- **WHEN** a role or model requests a tool outside its allowlist
- **THEN** execution fails closed, records the rejection, and continues only through a safe fallback

### Requirement: Typed role handoffs
Planner, Diagnostician, Tutor, and Assessor handoffs SHALL include trace ID, task, allowed tools, evidence references, remaining budget, result, and confidence.

#### Scenario: Diagnostician to Tutor handoff
- **WHEN** diagnostic evidence has been collected
- **THEN** the Tutor receives cited hypotheses but no authority to change the judge verdict

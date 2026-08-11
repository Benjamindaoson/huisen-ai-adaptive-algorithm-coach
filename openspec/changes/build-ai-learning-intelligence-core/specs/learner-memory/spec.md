## ADDED Requirements

### Requirement: Agent evidence events
Learner memory SHALL record safe Agent-run metadata, evidence references, teaching action, and mastery observation without persisting source code or raw standard input/output.

#### Scenario: Agent diagnosis completes
- **WHEN** an Agent run finishes
- **THEN** memory stores its trace reference and learning outcome metadata but excludes code and raw runner payloads

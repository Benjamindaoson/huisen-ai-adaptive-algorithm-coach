## ADDED Requirements

### Requirement: Static catalog discovery
The system SHALL provide client-side search and filters for title, body keywords, collection, score, tag and available reference language without requiring a server request.

#### Scenario: Search a known title
- **WHEN** a user searches for a known problem title
- **THEN** the matching catalog record appears before partial keyword matches.

### Requirement: Digital-book problem reading
The system SHALL render problem metadata, source variants, description, input/output, examples, solution material, complexity and reference code when present.

#### Scenario: Read an extracted problem
- **WHEN** a user opens a complete problem route
- **THEN** the page renders each available structured section and identifies the original source variant.

### Requirement: Split problem-solving workspace
The system SHALL present a desktop problem route as a two-pane workspace: a separately scrollable problem pane on the left and a code editor with test/result panel on the right. The left pane SHALL expose distinct "题目描述" and "解题思路" tabs so solution material is not mixed into the prompt by default.

#### Scenario: Reveal the solution deliberately
- **WHEN** a user opens a problem route
- **THEN** the "题目描述" tab is active and solution content is absent from the visible prompt.
- **WHEN** the user selects "解题思路"
- **THEN** the left pane renders the extracted solution material and complexity, while the editable code and test panel remain available on the right.

### Requirement: Local learning progress portability
The system SHALL store per-problem state locally and SHALL export/import a versioned JSON backup with merge and replace modes.

#### Scenario: Reject incompatible backup
- **WHEN** a user imports a backup with an unsupported version
- **THEN** the system reports the incompatibility and retains current local progress.

### Requirement: Learning-path navigation
The system SHALL provide the fixed first-release knowledge paths and show problem completion state within each path.

#### Scenario: Continue a path
- **WHEN** a user marks the current path problem as mastered
- **THEN** the path view identifies the next unresolved available problem.

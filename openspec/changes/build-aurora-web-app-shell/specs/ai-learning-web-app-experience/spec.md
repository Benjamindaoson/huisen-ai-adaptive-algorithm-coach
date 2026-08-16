## ADDED Requirements

### Requirement: Persistent navigable learner application shell
The application SHALL present six primary learner destinations—今日驾驶舱, 学习中心, 题库练习, 错因复练, 算法初试, and 能力模型—in persistent navigation, and each destination SHALL navigate to its existing real module route without reloading or losing browser learning state.

#### Scenario: Navigate between learner modules
- **WHEN** a learner activates any primary navigation destination
- **THEN** the matching route content is rendered, that destination is marked current, and other module state remains available

#### Scenario: Keep governance separate
- **WHEN** a learner views the primary navigation
- **THEN** the teacher quality workbench and backup actions are visually separated from the six-step learner journey but remain accessible

### Requirement: Real product data powers the redesigned experience
The application MUST render the existing catalog, learning, review, exam, insight, runner, and Mentor data contracts and MUST NOT substitute prototype-only counts or simulated business state.

#### Scenario: Display the complete problem catalog
- **WHEN** the loaded catalog contains 754 indexed problems
- **THEN** the 题库练习 destination reports 754 problems and searches and opens records from that catalog

#### Scenario: Preserve real learning decisions
- **WHEN** Today renders a recommendation
- **THEN** the task, reason, confidence, evidence count, and next actions originate from the existing learner state and orchestration result

### Requirement: Persistent evidence-aware Mentor surface
The application SHALL host Mentor OS outside individual page bodies so that the same run can follow route changes, SHALL allow the surface to collapse, and SHALL disclose whether it executed agent tools, only compiled context, is unavailable, or is suppressed by policy.

#### Scenario: Mentor follows a normal route change
- **WHEN** the learner navigates between normal learning modules
- **THEN** the Mentor surface remains available and contributes the new route context to the current Mentor run

#### Scenario: Independent assessment suppresses assistance
- **WHEN** an independent exam, transfer assessment, or delayed mastery review policy forbids assistance
- **THEN** Mentor, reference-answer, hint, and prohibited history surfaces are not rendered for that assessment

#### Scenario: Mentor service is unavailable
- **WHEN** no configured Mentor service can execute the run
- **THEN** the interface reports the unavailable or context-only state and does not present a fabricated agent result

### Requirement: Dedicated coding and exam workspaces remain functional
The redesigned application SHALL preserve the dedicated light problem workspace with problem content and code editor, real run and sample-submit actions, dual-mode exam entry, resumable exam sessions, and existing assessment restrictions.

#### Scenario: Open a problem from the catalog
- **WHEN** a learner opens a catalog problem
- **THEN** the dedicated two-pane problem workspace loads the real problem record, saved draft, runner controls, feedback, and permitted Mentor state

#### Scenario: Start either exam mode
- **WHEN** a learner selects independent or AI-collaboration mode and starts an exam
- **THEN** the existing exam session is created with the selected mode and its corresponding assistance policy

### Requirement: Unified light-canvas Aurora visual system
The application SHALL use a token-based visual system with a midnight navigation rail, light content canvas, consistent blue learner actions, mint verified-evidence states, and violet Agent identity, while keeping problem content and the code editor readable and non-dark by default.

#### Scenario: Consistent module presentation
- **WHEN** the learner visits any primary module
- **THEN** headings, cards, controls, status states, spacing, focus styles, and Mentor elements use the same semantic token system

#### Scenario: Reduced motion preference
- **WHEN** the operating system requests reduced motion
- **THEN** non-essential navigation, elevation, and timeline animations are disabled

### Requirement: Responsive and accessible application navigation
The application MUST provide keyboard-visible focus, semantic navigation landmarks, current-page state, sufficiently large interactive targets, and responsive compositions for desktop, compact desktop/tablet, and mobile widths.

#### Scenario: Use desktop navigation with keyboard
- **WHEN** a keyboard user tabs through the application rail
- **THEN** each destination has a visible focus indicator, accessible name, and current-page state

#### Scenario: Use the application on mobile
- **WHEN** the viewport is below the mobile breakpoint
- **THEN** the desktop rail is replaced by mobile navigation, module content becomes single-column, and all destinations remain reachable

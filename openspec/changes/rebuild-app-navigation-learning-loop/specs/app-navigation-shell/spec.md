## ADDED Requirements

### Requirement: Independent module routes

The application SHALL expose Today, Problems, Paths, Review, Exam, and Insights as independently addressable hash routes.

#### Scenario: Directly open a module

- **WHEN** the browser loads `#/problems`
- **THEN** the application displays the problem library page
- **AND** it does not render the Today, Paths, Review, Exam, or Insights page bodies below it

### Requirement: Responsive application navigation

The application SHALL provide a persistent left navigation on desktop module pages and an equivalent compact navigation on small screens.

#### Scenario: Active navigation item

- **WHEN** the learner is on `#/review`
- **THEN** the Review item has a programmatically and visually identifiable active state

### Requirement: Focused Today page

The Today page SHALL present one primary recommended learning action and no complete problem catalog or complete learning path grid.

#### Scenario: Learner has practice evidence

- **WHEN** attempts and mastery evidence exist
- **THEN** the primary action explains which evidence caused the recommendation

### Requirement: Consistent light visual system

The application SHALL use semantic design tokens and a light default canvas across module, problem, and exam views.

#### Scenario: Status colors

- **WHEN** success, warning, error, or AI identity is displayed
- **THEN** each color is used only for its defined semantic role

## ADDED Requirements

### Requirement: Mobile primary navigation has four learner goals
At a viewport width of 680px or less, the application SHALL render Today, Learn, Practice, and Me as the only primary mobile navigation destinations.

#### Scenario: Learner opens a mobile route
- **WHEN** the viewport width is 680px or less
- **THEN** the primary mobile navigation SHALL render exactly the four primary destinations and a More control.

### Requirement: Secondary mobile destinations remain accessible
The mobile More control SHALL expose Project, Review, Exam, Trust, and Quality, and SHALL indicate the active secondary destination. The existing Insights view SHALL be the primary "Me" destination.

#### Scenario: Learner is on a secondary destination
- **WHEN** the active route is Project, Review, Exam, Trust, or Quality on a mobile viewport
- **THEN** the More control SHALL expose that destination with `aria-current="page"`.

### Requirement: Navigation is keyboard accessible
The More control and its secondary destination tray SHALL use semantic buttons and links, SHALL expose expanded state, and SHALL close after a secondary link is selected.

#### Scenario: Learner toggles More
- **WHEN** the learner activates the More control
- **THEN** the control SHALL update `aria-expanded` and the secondary navigation tray SHALL become available to keyboard focus.

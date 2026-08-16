## ADDED Requirements

### Requirement: First Today mission opens training cabin
The system SHALL route an eligible first-time learner from the primary Today mission directly into the new training route.

#### Scenario: Eligible starter lesson
- **WHEN** Today selects an unlocked starter lesson for a learner without code-attempt evidence
- **THEN** its primary action opens the matching training route and records the mission exposure once

### Requirement: Legacy learning links remain available
The system SHALL preserve existing lesson routes and render their existing lesson experience for valid links.

#### Scenario: Existing lesson deep link
- **WHEN** a learner opens a valid legacy `#/learn/:lessonId` URL
- **THEN** the application continues to render the legacy lesson flow rather than failing or redirecting unexpectedly

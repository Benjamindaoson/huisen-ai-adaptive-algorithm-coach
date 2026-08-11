## ADDED Requirements

### Requirement: Resumable timed exam
The system SHALL persist exam state, remaining time and code drafts so an accidental refresh can restore an active exam without extending its deadline.

#### Scenario: Recover after refresh
- **WHEN** the page reloads during an active exam
- **THEN** the same problem states and drafts are restored and remaining time is calculated from the original deadline.

### Requirement: Exam integrity
The system SHALL hide solution content and AI answer-revealing actions during an active exam.

#### Scenario: Open a problem during an exam
- **WHEN** a user views an exam problem before submission
- **THEN** no reference solution, complete hint or hidden-test information is available.

### Requirement: Evidence-linked exam report
The system SHALL report score, time allocation, attempts, error categories and skill gaps and SHALL link each finding to the corresponding problem attempt.

#### Scenario: Review an incomplete exam
- **WHEN** an exam is submitted with an unfinished problem
- **THEN** the report identifies time spent, last attempt state and recommended follow-up practice for that problem's skills.

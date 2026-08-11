## ADDED Requirements

### Requirement: Four-language bounded state probes
The system SHALL generate diagnostic probes for JavaScript, Python, Java, and C++ that record a probe ID, source line, and at most three conservatively visible scalar expressions to stderr.

#### Scenario: Loop state is captured
- **WHEN** a control point has variables defined on earlier lines
- **THEN** the disposable instrumented copy emits a structured trace containing the selected variable values

### Requirement: Trace parsing is bounded and defensive
The system SHALL parse only Mentor-prefixed trace lines, enforce event and payload limits, and treat malformed trace data as diagnostic noise.

#### Scenario: Learner writes similar stderr text
- **WHEN** stderr contains ordinary or malformed text near a trace marker
- **THEN** the parser ignores it unless it satisfies the complete Mentor trace schema

### Requirement: Instrumentation never owns the verdict
The system MUST execute formal judgments against the learner's original source and SHALL label all instrumented observations `diagnostic-only`.

#### Scenario: Instrumented copy fails to compile
- **WHEN** diagnostic instrumentation fails but the original submission runs
- **THEN** the formal outcome remains the original submission outcome and the trace is reported unavailable

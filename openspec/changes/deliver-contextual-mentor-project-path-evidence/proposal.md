## Why

The product now has a real Mentor runtime and one complete repository practicum, but learners can still see stale diagnoses from another task, the practicum path is too narrow to build engineering progression, and learning-effect claims have no real denominators. The next release must make the AI context trustworthy, expand practice into a staged engineering curriculum, and collect evidence without fabricating teacher or seven-day outcomes.

## What Changes

- Isolate every active Mentor conclusion by workspace, task and immutable attempt/submission reference; render prior context only as explicitly labelled history.
- Replace the single practicum screen with a four-project progression covering boundary contracts, asynchronous data flow, cross-file state, and performance/testing.
- Give every practicum its own repository files, executable verification harness, skill prerequisites, phase-aware hints and completion evidence.
- Add a learning-effect evidence projection for teacher adjudication, independent transfer and seven-day return cohorts.
- Show sample-size and maturity states (`not-collected`, `insufficient`, `measurable`) instead of converting missing evidence into zero or success.
- Add a pilot evidence dashboard and server-compatible structured events; source code, free text and synthetic demo activity cannot count as real outcomes.

## Capabilities

### New Capabilities

- `mentor-context-isolation`: Active Mentor observations, hypotheses and next actions are scoped to the current workspace/task/attempt and stale records are visibly separated.
- `progressive-repository-practicums`: Learners progress through differentiated multi-file engineering projects with executable verification and minimal phase-aware guidance.
- `learning-effect-evidence`: The product computes auditable teacher-review, transfer and seven-day-return metrics only from eligible real events and exposes sample sufficiency.

### Modified Capabilities

None. The project has no synchronized main capability specs; this change introduces three new contracts.

## Impact

- Frontend Mentor context compilation, Mentor Dock rendering, project-practicum domain/UI, learning events and Insights/Quality surfaces.
- Gateway event validation and learning-effect projection endpoints or bootstrap payloads.
- Existing backup/outbox synchronization for new bounded event kinds.
- No new runtime dependency and no hidden answer/source-code telemetry.

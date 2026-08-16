## Context

The current Mentor Dock reuses one learner-wide run and appends route contributions into it. Because recovery returns the latest run events, a pagination practicum can display hypotheses from an earlier `readFileSync` submission. The practicum domain contains one JavaScript repository task and the Insights page has no unified maturity model for teacher, transfer or seven-day evidence. Existing primitives already include persistent Mentor runs, structured learning events, delayed-review scheduling and a durable quality workbench.

## Goals / Non-Goals

**Goals:**

- Make the visible Mentor timeline truthful for the exact active workspace and task.
- Provide four visibly differentiated repository projects that form an ordered beginner-to-engineering path.
- Compute teacher, independent-transfer and seven-day-review evidence with explicit denominators and maturity states.
- Reuse existing runner, backup and event synchronization contracts.

**Non-Goals:**

- Fabricating teacher adjudications, learner cohorts or seven days of elapsed behavior.
- Creating a general Git hosting service, collaborative IDE or arbitrary repository importer.
- Allowing generated project content to change mastery without executable and independent evidence.
- Completing the 754-problem hidden judge program in this change.

## Decisions

### Use one idempotent Mentor run per workspace key

The frontend SHALL derive `workspaceKey = routeKind:routeRef` and include it in the Mentor start idempotency key. A cached run is reusable only when its stored route key exactly matches. On route changes the visible timeline and checkpoint are cleared before recovery. This fixes the root cause without adding a second client-side event store or retrofitting metadata onto every historical event.

Alternative considered: filter events by text/evidence references inside one global run. This was rejected because tool and hypothesis events are not guaranteed to repeat the route reference, so filtering would be heuristic and unsafe.

### Keep project definitions declarative and verification project-specific

Each project SHALL declare order, prerequisites, skills, repository files, editable file, diagnosis/plan choices and a verification kind. A bounded harness factory maps the verification kind to deterministic JavaScript tests. The UI remains one reusable workbench and deep-links the selected project through the hash route.

Alternative considered: one React component per project. This was rejected because it would duplicate phase, evidence and accessibility behavior.

### Project progress unlocks from verified completion events

A project unlocks only when every prerequisite has a `practicum-completed` event. Starting, hints or passing a partial test do not unlock the next project. Existing first-project progress remains valid because identifiers and event contracts are preserved.

### Evidence metrics are projections, not mutable scores

The frontend SHALL project three evidence families:

- teacher adjudication from the server quality gate's eligible-real-case count;
- independent transfer from matched `lesson-transfer-started` and unassisted `lesson-transfer-passed` events;
- seven-day review from transfer evidence old enough to be eligible and a later verified review event.

Every metric carries numerator, denominator, target/minimum sample, evidence references and one of `not-collected`, `insufficient`, or `measurable`. Zero denominators render “尚未采集” rather than `0%`.

Alternative considered: show a composite learning-effect score. This was rejected because it hides missing denominators and mixes teacher quality with learner outcomes.

### Reuse existing synchronization and privacy boundaries

No source code or free-text reflection is added to learning telemetry. Existing bounded practicum and transfer/review events already pass through backup and server outbox validation. The new projection consumes those events and adds no third-party dependency.

## Risks / Trade-offs

- [One run per workspace increases run count] → Keep server retention bounded and use deterministic idempotency keys so revisits recover rather than duplicate.
- [Four projects can look complete without proving curriculum effectiveness] → Label them simulated teaching repositories and keep learning-effect maturity separate.
- [Seven-day evidence cannot exist immediately] → Render the next eligible date and sample insufficiency instead of manufacturing history.
- [Local quality reviews could be mistaken for eligible teacher evidence] → Only the server quality gate's eligible-real-case count contributes to the teacher metric.
- [Older cached Mentor state points at a learner-wide run] → Reuse it only for an exact route key; otherwise start/recover the scoped run.

## Migration Plan

1. Deploy route-scoped Mentor start behavior; existing runs remain readable but are no longer reused across workspaces.
2. Preserve `repo-pagination` identifiers and add three new project definitions and routes.
3. Add the evidence projection as a read-only Insights section; no migration of learner records is required.
4. Rollback removes the new UI/projection while existing events and server data remain valid.

## Open Questions

- Real teacher adjudication remains operational work: the imported 200 public submissions lack problem/failed-case evidence and cannot yet be counted.
- Seven-day cohort conclusions require elapsed time and real returning learners; this release only makes collection and honest display operational.

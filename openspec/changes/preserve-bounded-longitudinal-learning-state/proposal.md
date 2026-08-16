## Why

The browser and file-local learning stores retain only the newest 500 events, so long-lived learners can lose the exact activation, prerequisite, training, transfer, and project milestones that drive resume behavior and longitudinal metrics. Simply increasing or removing the limit would increase privacy, export, synchronization, and storage risk; the product needs deterministic bounded retention of high-value evidence.

## What Changes

- Add a deterministic retention projection that reserves a fixed portion of the 500-event budget for compacted longitudinal milestones and uses the remaining budget for recent activity.
- Preserve exact source events and evidence IDs; do not create synthetic mastery or rewrite historical event payloads.
- Apply the same observable retention contract to browser memory and file-local gateway storage while leaving PostgreSQL's complete signed-in event history authoritative.
- Re-project full PostgreSQL bootstrap history into the bounded browser view so signed-in restore recovers retained milestones.
- Keep existing learner-memory and backup formats readable; imports re-project whatever valid history is available without pretending to recover evidence that was already absent.
- Add retention evals for activation duration, lesson prerequisites, training resume, transfer/review scheduling, project completion, ordering, deduplication, and the hard 500-event bound.

## Capabilities

### New Capabilities

- `bounded-longitudinal-learning-state`: Deterministic, evidence-preserving compaction of learning events under a strict local retention budget.

### Modified Capabilities

None. There are no synchronized main specs in `openspec/specs/`; this change introduces its retention contract as a new capability.

## Impact

- Browser learning memory parsing, append, import/merge, and bootstrap adoption.
- File-local and in-memory gateway learning-store retention.
- Longitudinal selectors that already consume learning events; their interfaces remain unchanged.
- Backup payloads remain version 5 and learner memory remains version 1 because payload shape is unchanged; retention semantics become deterministic and migration occurs during parse/append.
- PostgreSQL schema and full event retention remain unchanged.
- No new runtime dependency, raw content field, billing behavior, or production data mutation.

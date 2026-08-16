## Why

Authenticated automatic synchronization and the visible manual retry both call the same long callback, but nothing prevents them from overlapping. Run 41 reproduced token rotation and queue-order symptoms while hot updates triggered overlapping work. The UI disables only a second manual click; it cannot serialize the automatic timer against manual recovery.

## What Changes

- Extract one platform-sync execution from `App.tsx` into a domain module.
- Add a latest-snapshot coalescing orchestrator: one active execution, at most one trailing execution containing the newest snapshot.
- Make automatic and manual calls share the same orchestrator instance.
- Preserve current outbox durability, mutable/immutable rules, optimistic state conflicts, safe issue projection, and server bootstrap adoption.

## Capabilities

### New Capabilities

- `serialized-learning-sync`: Prevent automatic and manual cloud synchronization from racing while guaranteeing that the latest learner snapshot is not stranded.

### Modified Capabilities

None.

## Impact

- Moves synchronization assembly out of the App component without changing storage or API contracts.
- Adds focused concurrency and execution tests; no dependency or server change.

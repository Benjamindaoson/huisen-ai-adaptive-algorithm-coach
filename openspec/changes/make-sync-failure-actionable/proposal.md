## Why

Authenticated learners currently see only `同步待重试`. The product does not say whether their latest work is safe, what category is blocked, how many writes remain, or what they can do. A reliability feature that cannot guide recovery increases anxiety precisely when trust matters most.

## What Changes

- Project raw outbox failures into a bounded user-safe sync issue with pending count and operation category.
- Make the error status open the account panel directly.
- Explain that validated local learning records remain safe while cloud sync is pending.
- Add one explicit retry action with honest success or still-pending feedback.
- Reuse the same synchronization routine for automatic and manual retries.

## Capabilities

### New Capabilities

- `actionable-learning-sync-recovery`: Explain and retry authenticated learning-data synchronization without exposing internal errors or overstating cloud durability.

### Modified Capabilities

None.

## Impact

- Adds a pure sync-issue projection module and AccountPanel recovery UI.
- Refactors the existing App synchronization effect into a reusable bounded callback.
- Does not delete outbox entries, weaken server authority, expose raw errors, or change anonymous local-only behavior.

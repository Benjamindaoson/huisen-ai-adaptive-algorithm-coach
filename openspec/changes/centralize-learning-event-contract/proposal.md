## Why

Run 41 recovered a real sync queue and exposed contract drift: learning-event kinds and data keys are independently copied in learner memory, account migration, and Gateway validation. A new event can be valid locally but silently quarantined during registration or rejected by the server. Fixing one missing list after each incident is not a durable product mechanism.

## What Changes

- Establish one repository-level, runtime-safe learning-event contract containing bounded enum lists shared by Web and Gateway.
- Make learner parsing, account migration, and authoritative validation import the same contract rather than copying it.
- Add a contract-conformance test that requires a valid fixture for every canonical event kind and proves all three boundaries accept it.
- Include the shared contract explicitly in the Gateway container build context and image.

## Capabilities

### New Capabilities

- `shared-learning-event-contract`: Prevent silent learning-history loss by enforcing one event vocabulary across device storage, account migration, and server authority.

### Modified Capabilities

None.

## Impact

- Adds one dependency-free shared TypeScript module under `contracts/`.
- Replaces duplicated enum lists without changing event semantics or stored formats.
- Updates Docker packaging so production-like Gateway runtime resolves the shared module.

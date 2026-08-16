## Why

Return-aware recovery now opens the correct source lesson, but it resumes the learner's stored stage. A learner asking why the next lesson was recommended can therefore land at `独立迁移` instead of the conceptual explanation they need.

## What Changes

- Treat verified recovery context as a distinct quick-recap presentation mode.
- Start the recap at the human-language explanation regardless of stored training progress.
- Let the learner replay teaching stages while suppressing duplicate learning evidence.
- Keep ordinary training resume behavior unchanged.

## Capabilities

### New Capabilities

- `evidence-neutral-conceptual-recap`: Replay source teaching from explanation without rewriting the learner's achievement history.

### Modified Capabilities

None.

## Impact

- Changes only TrainingCabinPage state initialization, signal guards, labels, tests, and styles.
- Adds no event kind, storage schema, model call, or route field.

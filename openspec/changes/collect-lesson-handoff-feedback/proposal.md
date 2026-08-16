## Why

The product can now explain why it selected a lesson, but it has no evidence that learners understand or value the explanation. Without a bounded response and recovery path, the adaptive handoff remains a one-way claim and product quality cannot learn from confusion.

## What Changes

- Add two explicit responses to an evidence-bound handoff: `这正是我需要的` and `我不明白为什么`.
- Persist each response as a validated, sync-compatible event tied to a deterministic recommendation ID and lesson.
- Treat the latest response as the active answer; repeated identical clicks do not create noise, while changing the answer remains auditable.
- When the learner selects confusion, immediately explain that the sequence does not label them as weak and offer a return to the preceding training.
- State that feedback measures recommendation usefulness only and never changes mastery.

## Capabilities

### New Capabilities

- `bounded-lesson-handoff-feedback`: Capture, restore, and act on a learner's bounded response to one evidence-derived lesson recommendation.

### Modified Capabilities

None.

## Impact

- Extends frontend and gateway learning-event contracts with one bounded kind and recommendation identifier.
- Extends platform migration allowlists so feedback can sync rather than being quarantined.
- Adds deterministic feedback projection and LessonPage interaction states.
- Does not store free text, call a model, alter mastery, or change curriculum unlocking.

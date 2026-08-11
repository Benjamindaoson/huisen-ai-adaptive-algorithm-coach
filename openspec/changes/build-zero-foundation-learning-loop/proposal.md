## Why

The current product supports evidence-driven practice for learners who can already write code, but it does not teach a zero-foundation learner how to understand programming and algorithmic ideas before attempting full problems. The next coherent phase must connect trustworthy micro-teaching, guided practice, independent problem solving, and transfer evidence so that the product fulfills the promise: “不是帮你做出这道题，而是让你独立做出下一道题。”

## What Changes

- Upgrade the existing learning-path module into a beginner-friendly learning map with a default Python foundation route and language-neutral algorithm concepts.
- Add short interactive lessons that use plain-language analogies, visible state transitions, prediction questions, code completion, and a transfer action with progressively reduced scaffolding.
- Record lesson start, checkpoint, completion, and transfer events in the existing local and server-synchronized learner evidence stream.
- Let Today recommend the next prerequisite lesson for foundation learners instead of always sending them directly to a full problem.
- Add a remediation bridge from the problem workspace to the smallest relevant prerequisite lesson while preserving the submitted-code context.
- Keep long lectures, free-form AI-generated curricula, social/community features, payments, and the full company interview funnel outside this phase.

## Capabilities

### New Capabilities

- `foundational-learning-map`: A trustworthy chapter and prerequisite map that gives zero-foundation learners a comprehensible route from Python basics to algorithm patterns.
- `scaffolded-interactive-lesson`: A reusable lesson experience that moves from plain-language explanation through observation, prediction, completion, and independent transfer.
- `lesson-learning-evidence`: Durable, owner-scoped learning events and derived lesson progress that distinguish exposure, correct prediction, completion, and transfer start.
- `problem-remediation-bridge`: A contextual route from a failed practice attempt to the smallest relevant prerequisite lesson and back toward practice.

### Modified Capabilities

None. The new capabilities extend the existing practice and Mentor flows without changing their current public contracts.

## Impact

- Frontend routing, navigation, learning-path page, Today recommendations, problem workspace, styles, learner memory, backup, and tests.
- Gateway learning-event validation and API tests; the current generic event storage requires no database schema migration.
- New project-local trusted curriculum content represented as typed TypeScript data; no new runtime dependency and no browser-side model key.
- Existing Judge0, Mentor, PostgreSQL, signed identity, and problem corpus remain unchanged.

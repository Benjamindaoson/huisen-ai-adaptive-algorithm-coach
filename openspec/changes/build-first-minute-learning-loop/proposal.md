## Why

The product has a capable topic library and Mentor runtime, but a new learner still meets a raw problem, multiple competing AI surfaces, and small system-oriented copy. The first minute must instead make the learning goal, time cost, prerequisite, and expected gain obvious, then lead to one low-risk first run.

## What Changes

- Replace cold-start problem recommendations with a micro-learning mission that names the skill, time budget, prerequisite, expected gain, and the next concrete action.
- Make the problem workspace a single-Mentor surface: hide the global Mentor dock there, reveal contextual diagnosis only after a run or submission, and add a learner-controlled focus mode.
- Add three short, sequenced beginner algorithm lessons: array traversal, hash lookup, and two pointers. Each keeps the existing observe → predict → fill-code → transfer loop.
- Raise the learner-facing typography floor and reduce decorative English/system-state copy on learning surfaces.
- Record first-minute learning telemetry without source code so four product metrics can be computed honestly.

## Capabilities

### New Capabilities

- `first-minute-learning-mission`: A cold-start mission that explains why this is the learner's next action and opens a runnable learning step.
- `single-mentor-workspace`: A focused problem workspace with one evidence-bound Mentor and an explicit focus mode.
- `starter-algorithm-lessons`: Three zero-base algorithm micro-lessons with mastery transfer handoff.
- `readable-learner-interface`: Learner-facing typography and copy rules that privilege learning actions over system implementation details.
- `learning-experience-metrics`: Privacy-bounded event definitions for first run, recommendation comprehension, Mentor-mediated revision, and seven-day transfer.

### Modified Capabilities

- None.

## Impact

This change touches the React learning journey, lesson catalog, problem workspace, global application shell, visual tokens/styles, client telemetry, and corresponding tests. It introduces no dependency, API, model, or secret changes.

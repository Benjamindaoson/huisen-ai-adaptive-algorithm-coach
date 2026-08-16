## Why

The current app contains real learning data and Mentor capabilities, but the first visible experience still reads like a conventional problem dashboard: the learner must infer why a task matters and where the intelligence is. We need an unmistakable learning loop that makes the system's evidence-based understanding, teaching method, and next decision visible within the first ten minutes.

## What Changes

- Add an evidence-aware AI entry diagnosis that converts the learner's current record into a clear starting hypothesis, a ten-minute mission, and an honest statement of what is still unknown.
- Add an immersive training route that guides a learner through plain-language explanation, state observation, prediction, constrained coding, and an independent transfer challenge without presenting a copyable reference solution.
- Add a growth replay and training map that show the learner's starting point, verified progress, remaining uncertainty, and the reason for the next training step.
- Make the first task on Today open the training experience rather than the legacy micro-lesson route, while retaining the existing lesson and problem routes for compatibility.

## Capabilities

### New Capabilities

- `ai-entry-diagnosis`: Derive and present an evidence-bound initial learning hypothesis and first ten-minute mission.
- `immersive-training-cabin`: Provide a focused, answer-resistant algorithm learning session with observable program state, prediction, local coding, and independent transfer.
- `learning-growth-replay`: Turn recorded learning evidence into a learner-readable replay and an explainable next-step map.
- `first-time-training-entry`: Route a first-time learner from Today into the new training cabin while preserving legacy learning links.

### Modified Capabilities

<!-- None. The repository has no baseline OpenSpec capability for the prior first-minute flow. -->

## Impact

- Affects React routes, Today, the application route resolver, learner-memory event validation, and CSS.
- Adds deterministic client-side learning-session and growth-replay derivation; no model call or hidden personal-data inference is introduced.
- Reuses the existing three starter algorithm lessons and their transfer problems, preserving the existing 754-problem corpus and code workspace.

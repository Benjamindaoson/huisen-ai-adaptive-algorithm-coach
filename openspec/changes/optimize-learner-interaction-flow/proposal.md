## Why

The learning product exposes implementation evidence, governance metrics, and multiple mentor metaphors before it tells a learner what to do next. This makes a capable system feel complicated and less trustworthy, especially for a zero-foundation learner on a mobile device.

## What Changes

- Add a learner-first action surface for empty progress and daily recommendations, with one immediately actionable next step.
- Reframe the persistent Mentor as one contextual teaching surface: show learner-language status and an action first, while keeping execution evidence available on demand.
- Reduce the mobile primary navigation to four learner goals and place secondary destinations behind an explicit More control.
- Move learning-effect methodology and raw evidence references behind progressive disclosure on the learner-facing Insights page without removing the existing transparent evidence model.

## Capabilities

### New Capabilities

- `learner-first-action-surface`: Clear next-action experiences for new, returning, and blocked learners.
- `contextual-mentor-surface`: A single understandable Mentor surface that presents truthful lifecycle state, next action, and optional evidence.
- `goal-oriented-mobile-navigation`: A four-destination mobile navigation model with access to secondary modules.

### Modified Capabilities

- None.

## Impact

Affected areas are the React App shell, navigation model, Mentor dock, Today and Insights pages, shared CSS tokens/components, and their Vitest coverage. There are no API or persistence-contract changes and no new runtime dependencies.

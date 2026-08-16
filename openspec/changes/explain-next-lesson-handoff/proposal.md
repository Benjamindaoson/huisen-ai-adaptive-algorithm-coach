## Why

The post-transfer action now reaches the correct lesson in one click, but the destination still looks like a generic course page. Learners cannot see which verified event caused the recommendation, why the lesson is teachable now, or where the product's confidence ends, so the most valuable adaptive behavior remains invisible.

## What Changes

- Project a plain-language lesson handoff only when the current lesson exactly matches the event-derived next foundation lesson.
- Name the preceding verified action, explain that prerequisite order selected this lesson, and state the lesson's expected payoff.
- Bind every personalized statement to visible event references and state that an immediate pass is not durable mastery.
- Render no AI-recommendation claim when the current lesson lacks the required event evidence or was opened outside the projected continuation path.

## Capabilities

### New Capabilities

- `evidence-bound-lesson-handoff`: Explain why a lesson is recommended now using deterministic curriculum state and traceable learning events.

### Modified Capabilities

None.

## Impact

- Adds a pure frontend projection beside the existing learning-action projection.
- Extends the lesson page contract with an optional, evidence-bound handoff view model.
- Adds user-facing tests for personalized, non-personalized, and truthful-boundary states.
- Does not change mastery calculation, course unlocking, model calls, backend APIs, or stored learning-event schemas.

## Context

Run 34 made the post-transfer action route directly to the prerequisite-valid foundation lesson. The lesson page currently receives only static curriculum content, so it cannot distinguish an event-derived continuation from manual exploration and cannot explain the recommendation truthfully.

The product already has two authoritative inputs: `projectBridgeLearningAction(events)` decides the exact continuation route, and `FoundationLesson` defines the objective and prerequisite graph. Learning events are append-only evidence and already reach `App.tsx`.

## Goals / Non-Goals

**Goals:**

- Make the adaptive handoff visible above the lesson flow.
- Bind the reason, source action, and current lesson to exact event references.
- Reuse the existing projected action and curriculum graph rather than adding model ranking.
- Preserve an honest distinction between current sequencing and durable mastery.

**Non-Goals:**

- Re-rank the curriculum with an LLM.
- Infer a weakness, score, diagnosis, or mastery state without evidence.
- Change lesson unlocking, stored events, or backend contracts.
- Add the same card to manually opened or remediation lessons without a matching evidence contract.

## Decisions

### Use a pure handoff projection

Add `projectLessonHandoff(lesson, events)`. It returns a serializable view model only when `projectBridgeLearningAction(events)` is `continue-foundation` and its lesson ID exactly matches the rendered lesson. This keeps the recommendation authority testable and prevents a generic lesson from pretending to be personalized.

Alternative considered: let `LessonPage` inspect raw events. Rejected because UI components would duplicate event priority and prerequisite logic.

### Explain observed sequence, not inferred weakness

The copy SHALL name the preceding completed training, say that the curriculum's completed prerequisites make the current lesson the next unlocked step, state the lesson objective, and preserve the immediate-pass-versus-durable-mastery boundary. It SHALL NOT say that the learner is weak at a skill unless a separate diagnostic contract proves it.

Alternative considered: model-generated personalized prose. Rejected for this slice because it would introduce hallucination, latency, cost, and non-deterministic evaluation without stronger evidence.

### Keep evidence readable through progressive disclosure

The visible card uses plain language. Exact `event:*` references remain available behind a `details` disclosure with a count, so non-technical learners see the benefit before implementation terminology.

### Pass a view model into LessonPage

`App.tsx` computes the optional handoff and passes it to `LessonPage`. The page renders nothing when the projection returns `null`. This preserves existing lesson behavior for manual, remediation, and cold-entry routes.

## Risks / Trade-offs

- [A deterministic sequence may look less magical than generated prose] → Emphasize immediate, specific evidence and exact next action; correctness is more valuable than decorative personalization.
- [A lesson-start event is appended on mount] → The projection tolerates relevant in-progress events and maintains the same lesson route.
- [Raw event IDs may confuse beginners] → Hide them behind progressive disclosure and label them as verifiable records.
- [The explanation proves why the lesson is next, not that it is globally optimal] → State that it follows the current prerequisite path and keep the limitation in evolution metrics.

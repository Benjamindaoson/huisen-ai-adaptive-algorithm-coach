## Context

The app already persists learner profile, code attempts, lesson milestones, Mentor traces, and a three-lesson beginner curriculum. Its legacy lesson page is structurally sound, but the learner encounters it as a course page after a dashboard; the product does not make the system's learning hypothesis or the eventual transfer criterion immediately legible.

The redesign must preserve existing hash routes, problem workspace, and corpus. It must also avoid pretending that a language model has inferred a learner trait when the app only has a sparse local event record.

## Goals / Non-Goals

**Goals:**

- Express a ten-minute learning loop as a first-class app flow.
- Make each learner-facing diagnosis traceable to stored learning evidence or explicitly label it as an initial baseline.
- Give beginners a plain-language, visually observable, answer-resistant sequence before they enter a full coding problem.
- Persist only bounded, explainable learning milestones and use those milestones to explain the next task.

**Non-Goals:**

- Replacing the code runner, full Mentor runtime, or hidden judging service.
- Claiming validated mastery, model efficacy, or personal insight without qualifying evidence.
- Producing copyable contest/reference implementations in the training cabin.
- Changing the 754-problem corpus or requiring a model API for the core training loop.

## Decisions

### Deterministic diagnosis first

The entry diagnosis is a pure derivation over recorded events, attempts, and lesson progress. It uses a small set of stated evidence classes (cold start, prompt dependence, unsuccessful implementation, or completed transfer) and returns both a learner-readable hypothesis and an evidence/uncertainty label.

This is chosen over an LLM-generated diagnosis because the product must be honest and testable at first launch. A model can later enrich the wording, but cannot silently mutate the evidence or mastery decision.

### Dedicated training route, shared curriculum source

`#/training/:lessonId` will use the existing `FoundationLesson` objects for its explanation, frames, checkpoint, local completion, and transfer skill. The existing `#/learn/:lessonId` stays intact to prevent broken deep links while the first Today CTA moves to the new route.

This avoids forked beginner content and lets the cabin reuse trusted completion and transfer matching behavior.

### Event-minimal learning replay

The cabin records session start, each completed stage, and session completion with a lesson ID and constrained stage name. A replay derives claims only from those events and prior lesson/transfer events. It can say “you completed a prediction” but can only say “transfer verified” after an independent accepted transfer.

This is chosen over a free-text activity log to make profile updates auditable and exportable.

### Focused visual composition

The cabin is full-width and intentionally suppresses the global Mentor dock. It places the AI observation at the top, one learning action at a time in the centre, an always-visible five-step progress rail, and a compact “why this matters” panel. The visual state is represented with curriculum frames, not decorative fake runtime telemetry.

## Risks / Trade-offs

- [Cold-start diagnosis can sound generic] → Label it as a baseline and state the exact first evidence the app will collect.
- [A predetermined local coding task can feel less like a full IDE] → Position it as a small cognitive checkpoint, then route to the existing code workspace for independent transfer.
- [Stored event contract becomes broader] → Constrain stage values and validate them with the same strict learner-memory parser.
- [A single cabin does not prove learning retention] → Replay explicitly marks transfer and delayed review as pending until evidence exists.

## Migration Plan

1. Add route parsing and pure domain derivations with unit tests.
2. Add cabin and map UI, then make Today use the new route for starter lessons.
3. Continue accepting existing learner-memory v1 records; new events are additive and bounded.
4. Roll back by routing Today back to `#/learn/:lessonId`; existing records remain harmless and are ignored by legacy pages.

## Open Questions

- A future online Mentor can personalize language and generate variants after it receives a trustworthy evidence contract; this change deliberately leaves it out of the mastery decision.
- A later experiment should determine whether the five stages fit within ten real minutes for novice learners.

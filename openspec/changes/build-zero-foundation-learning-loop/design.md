## Context

The React application already has hash routing, a learning-path module, Today recommendations, local learner memory, signed server synchronization, a problem workspace, Mentor evidence, and a PostgreSQL-backed event store. The missing layer is a trusted instructional spine for people who cannot yet learn effectively from full algorithm problems. This phase must reuse those systems rather than add a parallel course application or a second progress database.

The target learner may have no programming background. Explanations must therefore be plain Chinese by default, with professional vocabulary progressively disclosed. Python is the default code language because it minimizes syntax load, while algorithm concepts and visual state transitions remain language-neutral.

## Goals / Non-Goals

**Goals:**

- Deliver a useful zero-foundation route from basic program state to initial algorithm patterns.
- Make every lesson follow a consistent fading-scaffold sequence: explain, observe, predict, complete, transfer.
- Persist auditable lesson evidence in the existing learner event stream and survive export/import and server synchronization.
- Recommend the next prerequisite lesson on Today for foundation learners.
- Let failed practice point back to a relevant lesson without hiding the code, verdict, or Mentor evidence.
- Keep the visual system light, calm, readable, and usable by non-specialists.

**Non-Goals:**

- A complete computer-science degree, video platform, community, payment system, or recruitment funnel.
- Free-form model generation of canonical curriculum facts or unverified exercises.
- Running partially completed lesson snippets as formal judge submissions.
- Replacing the current problem workspace, Mentor, Judge0, or mock examination.

## Decisions

### Use a typed trusted curriculum spine

The client SHALL ship a compact, reviewed TypeScript curriculum catalog. Each lesson declares prerequisites, plain title, professional term, objective, analogy, explanation, visual state frames, one prediction checkpoint, one Python completion exercise, and a transfer skill. The first phase contains twelve reusable lessons spanning Python survival, problem decomposition, complexity intuition, and high-frequency patterns.

This is preferred over model-authored lessons because stable facts, code, answers, and prerequisite links must be testable. AI remains responsible for choosing when to teach, selecting a representation, and fading help; it is not the source of truth for canonical content.

### Reuse `/paths` as the learning map and add a lesson route

The existing learning-path page becomes a two-layer learning map: the beginner curriculum first, existing problem-oriented paths second. A new `#/learn/:lessonId` route renders a focused lesson while the Learning Map navigation item remains active. This avoids another top-level module.

### Derive progress from learning events

The system SHALL add `lesson-started`, `lesson-checkpoint-passed`, `lesson-completed`, and `lesson-transfer-started` to the existing event contract. `lessonId`, `stage`, and `correct` are bounded metadata; source code and free-form learner text remain excluded. Client progress is derived deterministically from events, and the gateway validates ownership and semantics before persistence. No database migration is required because events are already JSON records.

### Use progressive disclosure for non-specialists

The lesson page defaults to the current step only. The professional name and deeper explanation appear as secondary information. State frames use small tables/cards, not compiler terminology. The user cannot mark the prediction step complete without selecting the correct answer, but an incorrect choice receives a plain-language explanation and can be retried without penalty.

### Connect teaching to practice in both directions

Today SHALL recommend the next incomplete prerequisite lesson when the learner target is `foundation`. After lesson completion, the transfer action opens an existing complete problem matching the lesson skill and records the transfer start. A failed problem attempt SHALL offer the closest mapped prerequisite lesson; the link explicitly says why it was recommended.

### Keep the first release deterministic

The lesson content, progress derivation, recommendation, and remediation mapping are deterministic and testable. Existing Mentor/DeepSeek remains available in problem practice. A later change can add an AI explanation adapter after an evaluation set exists; this phase does not send zero-foundation lesson content or answers to a model.

## Risks / Trade-offs

- **[Twelve lessons can look like a complete curriculum when they are only the first spine]** → Label the route “零基础起步” and show future chapters as outside this release rather than empty cards.
- **[Static lessons may feel less magical than generative chat]** → Make adaptation visible through prerequisite selection, step fading, evidence-based Today recommendations, and contextual remediation.
- **[Incorrect skill-to-lesson mapping can frustrate learners]** → Use a small explicit map with deterministic priority and tests; never claim the mapping is a verified diagnosis.
- **[Event contract expansion can break server sync]** → Update client and gateway validation in the same task and add contract/API tests before UI wiring.
- **[Too much lesson text recreates a textbook]** → Limit each step to one objective and one user action; keep detailed terminology in expandable content.

## Migration Plan

1. Add the curriculum and progress derivation without changing existing routes.
2. Extend client and gateway event validation; old backups and existing events remain valid.
3. Add the lesson route and upgrade the learning map.
4. Add Today and problem-remediation links.
5. Run full verification and browser smoke; rollback consists of removing the new route/UI while old events remain harmless valid records.

## Open Questions

None for this phase. Python is the approved default; additional language-specific completion exercises are intentionally deferred.

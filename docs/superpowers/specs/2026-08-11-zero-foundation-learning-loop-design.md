# Zero-Foundation Algorithm Learning Loop Design

This design is implemented by OpenSpec change `build-zero-foundation-learning-loop`. The approved product promise is: **“不是帮你做出这道题，而是让你独立做出下一道题。”**

## Product shape

The existing Learning Path becomes a beginner-friendly Learning Map. A zero-foundation learner follows a reviewed Python-first curriculum in which each lesson fades support across five stages:

1. plain-language explanation;
2. visible state observation;
3. learner prediction;
4. Python code completion;
5. independent transfer into the existing problem workspace.

Today recommends the next prerequisite lesson for a foundation learner. A failed full problem can recommend the smallest mapped prerequisite lesson. Lesson progress uses the existing owner-scoped learner event stream, so local backup and server synchronization remain one coherent source of evidence.

## Product boundaries

- Canonical facts, examples, answers, and prerequisite links are typed, reviewed curriculum content.
- AI chooses and explains learning actions; it does not invent the canonical curriculum in this phase.
- Default learner language is Python; algorithm ideas remain language-neutral.
- This release is a twelve-lesson foundation spine, not a complete computer-science curriculum.
- Community, payments, recruitment, video courses, and free-form generative lessons remain out of scope.

## Experience contract

Non-specialists see what happened, why it matters, and what to do next. Terms such as CFG, def-use, or reaching definitions never appear in beginner lesson copy. A correct checkpoint is required before code completion; completing the lesson unlocks a matching transfer action but does not claim mastery until independent problem evidence exists.

## Data contract

The existing learner event contract adds four bounded events: `lesson-started`, `lesson-checkpoint-passed`, `lesson-completed`, and `lesson-transfer-started`. Events contain lesson/stage identifiers and correctness metadata only—never source code or free-form lesson answers.

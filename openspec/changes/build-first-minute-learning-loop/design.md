## Context

The current React app already has a Today route, a structured Foundation lesson engine, a LeetCode-style `ProblemReader`, a local/remote evidence-aware Mentor timeline, and a global Mentor dock. These capabilities work independently, but the first experience exposes implementation labels and two Mentor surfaces before a learner has a clear reason to act.

## Goals / Non-Goals

**Goals:**

- Make the cold-start path explain a concrete learning outcome before it opens a task.
- Preserve one evidence-bound Mentor surface in the problem workspace and show diagnosis only after an attempt exists.
- Ship three reusable 8-minute starter lessons without weakening the existing 12-lesson foundation curriculum.
- Establish a 14px body / 12px supporting-copy learner-facing floor and prefer Chinese action copy over operational labels.
- Persist only privacy-bounded product events required to calculate the four requested metrics.

**Non-Goals:**

- No model, Judge0, database, assessment-policy, or hidden-answer changes.
- No claim that an individual mastered a skill merely by completing a micro-lesson.
- No collection of source code, free text, stdin, stdout, or stderr in the new experience telemetry.

## Decisions

### Use a dedicated first-minute curriculum instead of reordering the existing foundation path

`STARTER_ALGORITHM_LESSONS` will reuse the existing `FoundationLesson` and `LessonPage` contracts but live in a separate module. It has three short lessons—array traversal, hash lookup, and two pointers—and its own completion-based sequence helper. This avoids breaking the 12-step Python foundation progression while producing a deliberately small on-ramp. Reordering the foundation curriculum was rejected because its current prerequisites are meaningful for the longer path.

### Model the cold start as a mission, not a disguised problem recommendation

`TodayPage` receives an optional starter lesson and renders a mission card before generic plans when evidence is absent. The card must name: skill goal, 8-minute estimate, prerequisite statement, expected gain, and why the system selected it. The CTA starts the lesson rather than a raw catalogue problem. Once evidence exists, the existing adaptive plan remains the primary surface.

### Keep Mentor contextual and singular in the problem workspace

The problem route will not render `MentorDock`; `RunnerPanel`'s existing `MentorTimeline` becomes the sole Mentor surface. It is not rendered until an attempt exists, preventing speculative diagnosis. A focus-mode toggle on `ProblemReader` hides the reading pane and nonessential controls while keeping the code editor, runner, and contextual Mentor available. The global dock remains available on non-problem routes.

### Make readability enforceable through semantic tokens and narrow selectors

Tokens will define `--font-size-body` at 14px minimum and `--font-size-meta` at 12px minimum. New learner-facing components must use those tokens. Existing dense diagnostic surfaces are not mechanically rewritten; high-attention learner surfaces are targeted first to avoid a risky repository-wide visual regression.

### Use explicit telemetry events for the four product metrics

The client records timestamps, route/lesson/problem identifiers, bounded event names, and outcomes. A pure selector derives metric availability and values: first-run duration, mission reason acknowledgement, Mentor revision verification, and eligible seven-day transfer. It returns `not-yet-measurable` when evidence is missing; it never invents improvement claims.

## Risks / Trade-offs

- [Starter lesson has no matching judgeable transfer task] → Preserve honest completion, label transfer unavailable, and never fabricate a target.
- [Focus mode hides useful context] → Make it opt-in, reversible, and retain the contextual Mentor and runner.
- [Global dock removal feels like lost AI] → Keep a single clearly labelled Mentor with a pre-run message explaining when analysis begins.
- [Metric events could become surveillance] → Store only event metadata and duration; no source code or raw learning inputs.
- [Typography expansion changes density] → Apply the floor to new/high-attention learning surfaces first and verify desktop/mobile screenshots.

## Migration Plan

1. The new curriculum and telemetry are additive and backward-compatible with existing learning memory.
2. Existing learners with evidence keep the adaptive Today plan; only cold starts receive the starter mission.
3. Existing problem URLs retain their route shape. Focus mode is in-memory UI state and defaults off.
4. Rollback consists of removing the new Today mission branch and the new lesson module; existing lesson and practice data remain valid.

## Open Questions

- The four metrics will be surfaced as truthful product instrumentation, not marketing results, until real cohorts generate adequate evidence.

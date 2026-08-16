## Context

The repository already contains five partial foundations: a versioned 12-case Mentor benchmark, immutable practice attempts, bounded learning events, a twelve-lesson beginner curriculum, and a resumable public-sample mock exam. The new work must reuse those contracts without converting candidate or synthetic evidence into false claims of real learner performance.

The product remains local-first for a single learner, while the Fastify gateway provides durable, signed, server-side capabilities when configured. Judge0 owns execution verdicts; deterministic projections own learner-state changes; DeepSeek may propose diagnoses, review judgments, questions, and generated content but cannot directly mutate authority, mastery, or trust levels.

## Goals / Non-Goals

**Goals:**

- Make Mentor quality measurable across language, misconception, verdict, and learner-band segments.
- Bind every reviewed diagnosis to an immutable attempt, execution evidence, tool trace, and editor diff.
- Let teachers compare two responses blindly, adjudicate them, and calibrate an optional model judge.
- Record only meaningful pedagogical events and derive phase replay and learner-twin changes deterministically.
- Deliver a prerequisite-based beginner learning loop with remediation, transfer, and delayed review.
- Support independent and AI-collaboration exam modes with separate policies and dimension reports.
- Validate generated learning content before it can be shown as anything above a candidate.

**Non-Goals:**

- Claim that synthetic mutations or public benchmark data are real submissions from this product's learners.
- Claim learning lift, paid conversion, retention, or hiring outcomes before longitudinal data exists.
- Build a community, enterprise tenancy, recruiting marketplace, or general code-repository assessment in this change.
- Replace Judge0 verdicts, reviewed content, or teacher adjudication with an LLM opinion.
- Store raw keystrokes, arbitrary free text, hidden tests, secrets, or unbounded source snapshots in telemetry.

## Decisions

### 1. One evidence envelope connects quality, tutoring, telemetry, and exams

Every Mentor evaluation and report references an `EvidenceEnvelope` containing an attempt ID, immutable source hash, bounded snapshot metadata, execution result IDs, tool calls, and optional current-editor diff. Existing `PracticeAttempt` snapshots remain the source of truth in the browser; the gateway uses equivalent signed records.

Alternative considered: maintain independent evidence shapes per feature. Rejected because metrics, review decisions, and learner state would disagree about which attempt was analyzed.

### 2. Benchmark v2 separates provenance from eligibility

Fixture provenance is mandatory: `first-party-observed`, `public-dataset`, or `synthetic-mutation`. Only teacher-adjudicated `first-party-observed` or license-compatible `public-dataset` cases count toward the 100-case real-evidence release gate. Synthetic cases remain useful for deterministic regression but never satisfy the real-data milestone.

The quality report emits six primary metrics: line localization, misconception label accuracy, evidence sufficiency, minimal-hint effectiveness, direct-answer leakage, and false-conclusion rate. It also emits segment coverage and confidence intervals/counts so a high average cannot hide an empty language or learner band.

Alternative considered: mechanically duplicate the 12 seeds to reach 100. Rejected because it would meet a number while falsifying the purpose of the milestone.

### 3. Human comparison is the authority; model judging is calibrated assistance

The internal workspace presents anonymized A/B responses in randomized order. A review records preference, per-rubric labels, evidence references, leakage flags, and reviewer role. A model-judge record is stored separately and becomes `calibrated` only after meeting the configured agreement threshold on a held-out teacher-reviewed set. Model judgments may prioritize review queues but cannot promote dataset trust or override a teacher.

Alternative considered: use the LLM as the sole evaluator. Rejected because this creates correlated failure and cannot support the product's quality claim.

### 4. Pedagogical events are semantic, bounded, and replayable

The event taxonomy records problem/lesson opened, prediction submitted, plan recorded, meaningful edit summary, run, test, hint requested/viewed, reference viewed, submission, diagnosis, remediation, transfer, and delayed review. Edit events contain hash transitions, inserted/deleted line counts, changed ranges, and a coarse paste band—not raw keystrokes or source text.

Each event has a deterministic phase projection: understanding, modeling, implementation, debugging, or validation. Phase transitions and key nodes are derived from event order, not emitted by the model. The timeline can therefore replay why the system says a learner was stuck.

Alternative considered: capture every editor change. Rejected due to noise, privacy, storage, and weak pedagogical value.

### 5. The learner twin is a pure projection with a contribution ledger

Skill mastery, misconception recurrence, independence, hint dependence, transfer, and forgetting are updated by a pure reducer over validated events. Every dimension contains contribution records with event IDs, signed deltas, rules, and timestamps. Model output can create a candidate misconception event only when it cites evidence; it cannot write a score.

Alternative considered: ask DeepSeek for a new learner score after each session. Rejected because the score would be irreproducible and unauditable.

### 6. Curriculum nodes use a shared five-stage lesson contract

The high-frequency graph starts with the existing twelve reviewed nodes and adds explicit algorithm-pattern metadata, prerequisite edges, transfer skill mappings, review intervals, and visualization kinds. Every node uses the same stages: plain-language model, interactive state visualization, prediction, partial coding, and full practice. A failed mapped problem opens the smallest incomplete prerequisite and preserves a return link. Mastery increases only after an unassisted hidden or reviewed transfer and later review.

Alternative considered: dynamically generate complete lessons. Rejected for the first release because instructional consistency and trust matter more than breadth.

### 7. Exam modes share persistence but not assistance policy or scoring semantics

`independent` mode disables Mentor, reference answers, and historical solutions. `ai-collaboration` mode exposes a bounded interview agent and records planning, delegation, AI-generated changes, learner review, test creation, correction, and oral follow-up evidence. Both modes use the same absolute-deadline persistence and submission machinery.

Reports expose algorithm ability, independent completion, hint dependence, and AI collaboration as separate dimensions with evidence and confidence. A missing dimension is `not-observed`, never zero and never silently folded into one total score.

Alternative considered: add a single “AI allowed” toggle to the old exam. Rejected because it would not define what is assessed or make the report comparable.

### 8. Generated content moves through explicit trust states

Analogies, counterexamples, and transfer problems enter as `candidate`. Deterministic validation checks schema, referenced skills, executable solutions, test consistency, constraints, duplication, and answer leakage. Passing candidates become `auto-validated`; only a human review can make them `human-verified`. The UI always displays the trust level.

Alternative considered: publish model output immediately. Rejected because an executable-looking task can still be pedagogically wrong or leak its answer.

## Risks / Trade-offs

- **[No first-party real submissions are currently available in the repository]** → Implement provenance-aware ingestion and a public-dataset path, report the exact eligible count, and keep the release gate red rather than fabricate cases.
- **[A 100-case set may still be imbalanced]** → Require per-language, per-verdict, per-error-family, and per-learner-band coverage in the report.
- **[Process telemetry may feel invasive]** → Store semantic summaries only, document the schema, keep browser export/import, and allow deletion with the learner profile.
- **[Model-judge agreement can mask shared bias]** → Use held-out teacher decisions, report confusion/disagreement, and prevent model-only promotion.
- **[AI-collaboration exams can become answer generators]** → Bound tools, log all interactions, score verification and understanding, and preserve a separate independent mode.
- **[Generated transfer tasks may be executable but instructionally invalid]** → Require teacher promotion before they count as trusted mastery evidence.
- **[The scope spans multiple modules]** → Deliver in independently testable vertical slices and keep later expansion gates disabled until the quality baseline passes.

## Migration Plan

1. Keep benchmark v1 readable and add a deterministic v1-to-v2 migration that marks old fixtures as `synthetic-mutation` unless explicit provenance is supplied.
2. Add event schema version 2 while continuing to parse existing learning events; projections treat missing v2 evidence as legacy/low-confidence.
3. Extend exam sessions with a default `independent` mode so stored v1 sessions remain resumable.
4. Add new internal and curriculum routes without changing existing problem URLs or backup import behavior.
5. Generate quality and migration reports before enabling any release gate.
6. Roll back by disabling the new routes and generators; v1 practice attempts, events, and exams remain readable.

## Open Questions

- The repository contains no first-party learner submission export. The implementation will support and clearly count eligible public/first-party cases, but the product SHALL keep the “100 real cases” gate failing until 100 eligible records have actually been imported and adjudicated.
- Real learning lift and paid conversion require future user studies. This change implements experiment assignment and outcome-event contracts only where needed; it does not manufacture results.

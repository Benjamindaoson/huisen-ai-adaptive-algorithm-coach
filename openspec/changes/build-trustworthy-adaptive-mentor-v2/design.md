## Context

The product already stores immutable `PracticeAttempt` snapshots, runs a tool-using Mentor on the gateway, records bounded learning events, and offers twelve foundation lessons. The missing layer is trust: the UI does not make snapshot freshness obvious, remediation is skill-tag based rather than evidence based, transfer success is not durable, and there is no repeatable quality gate for diagnosis behavior.

## Goals / Non-Goals

**Goals:**

- Make each diagnosis auditable against one immutable attempt.
- Separate verified observations, unverified hypotheses, and missing evidence in learner-facing UI.
- Add a deterministic misconception projection whose confidence comes from actual compiler/judge evidence.
- Make transfer pass a first-class learning event and progress state.
- Establish a versioned benchmark and machine-readable quality report that can gate later model changes.

**Non-Goals:**

- Claiming hidden-test acceptance from public samples.
- Letting an LLM silently mutate the learner model.
- Generating unrestricted curricula or answers in the browser.
- Reaching production benchmark volume in this first infrastructure increment.

## Decisions

1. **Attempt binding uses existing immutable snapshots.** `PracticeAttempt.sourceCode` remains the analyzed source of truth. The current editor is compared locally with a bounded line diff; it is never substituted into an existing Mentor session. This avoids stale-diagnosis ambiguity without changing the Mentor API.

2. **The diff is a purpose-built bounded LCS projection.** Source files in the editor are capped already; the UI computes additions, deletions, and changed hunks with an explicit truncation limit. A new diff package is unnecessary.

3. **Misconception classification is deterministic and evidence-bounded.** Compiler stderr and public failed-case evidence can support a high/medium confidence category. Code-shape or problem-skill hints alone remain low confidence and are presented as a learning suggestion, not a confirmed diagnosis.

4. **Transfer pass is event-sourced.** A `lesson-transfer-passed` event references both lesson and attempt. Derived lesson progress exposes `transferVerified` separately from `completed`, preserving compatibility with the version-one memory envelope and generic gateway store.

5. **Benchmark scoring is offline and versioned.** Human-authored JSON fixtures contain expected observable labels, prohibited answer fragments, and optional expected lines. A pure evaluator scores a normalized prediction and writes a report. Model invocation is deliberately outside the default deterministic quality command; live-provider experiments can later produce prediction JSON using the same schema.

6. **Thresholds are reported before they are enforced.** The initial seed proves the pipeline, not market readiness. The report includes target thresholds and honest fixture counts; CI hard failure is limited to invalid fixtures and evaluator regressions until the gold set is large enough.

7. **Teacher adjudication and Mentor prediction are separate artifacts.** A teacher record is accepted only when it names a reviewer, attests a teacher role, binds the original source hash, supplies complete expected labels, and cites reviewed evidence. The quality gate applies those records to pending non-synthetic cases, then scores independently produced Mentor predictions by `caseId`. A model, deterministic rule, or A/B preference review cannot promote a pending case to teacher-adjudicated status.

8. **The review queue reports evidence readiness and coverage before review.** Imported submissions without a problem statement, executable failed case, or other root-cause evidence remain visibly blocked rather than inviting teachers to guess. Queue generation also reports language and learner-band gaps so collecting 100 examples cannot accidentally leave the release gate impossible to satisfy.

## Risks / Trade-offs

- **[Risk] A rule-based misconception label could be mistaken for AI diagnosis.** → Always show confidence, evidence source, and “learning route, not proven root cause” when evidence is weak.
- **[Risk] Line diff cost grows quadratically.** → Normalize and cap compared lines, and return a truncated summary for oversized snapshots.
- **[Risk] Transfer events could be recorded after assisted attempts.** → Record transfer pass only for a sample submission made after transfer start and without a hint/reference event tied to that attempt window.
- **[Risk] A small benchmark can overstate quality.** → Publish fixture count next to every metric and keep production targets visibly unmet until coverage grows.
- **[Risk] A scripted or model-authored record could impersonate a teacher.** → Require an explicit teacher attestation and immutable source binding, keep the raw record in provenance, and document that production identity verification is still a deployment responsibility.
- **[Risk] Existing CodeNet records do not contain enough evidence to adjudicate root cause.** → Mark them `evidence-incomplete` in the queue and do not count them until the missing problem/test evidence is attached and reviewed.

## Migration Plan

No database migration is required. Gateway validation accepts the new event kind and bounded fields. Existing browser memories remain version 1 and parse unchanged. Rollback removes the new UI and event emission; unknown future events are not written by older clients.

## Open Questions

- Which diagnosis labels should be added after the first 25 manually reviewed real learner failures?
- When the benchmark reaches 100+ fixtures, which thresholds should become hard CI gates versus release-review warnings?
- Which institution-backed teacher identity provider should replace local reviewer attestations before a production study?

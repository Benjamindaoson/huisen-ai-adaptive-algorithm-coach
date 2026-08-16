## Why

The current Mentor can call real tools and preserve evidence, but learners still cannot reliably tell which submission is being analyzed, which conclusions are verified, or whether a later independent attempt proved mastery. Without a reproducible diagnosis benchmark and a closed remediation-to-transfer loop, the product can look AI-native without proving teaching quality.

## What Changes

- Add a versioned Mentor diagnosis benchmark with human-authored fixtures and machine-readable metrics for line localization, misconception classification, unsupported conclusions, and answer leakage.
- Add a fail-closed teacher-adjudication ingestion path that binds gold labels to the imported submission hash and keeps model predictions separate from human authority.
- Bind every Mentor analysis to an immutable submission snapshot and show a readable diff when the editor has changed since that attempt.
- Present verified evidence, unverified hypotheses, missing evidence, and executed tests as distinct states in the persistent Mentor timeline.
- Classify a bounded set of high-value misconceptions only when supported by submission evidence, then route the learner to the smallest relevant lesson with an explicit confidence label.
- Record transfer success separately from lesson completion so the learner model distinguishes exposure from independent application.
- Keep model-generated free-form curricula, hidden-test claims, and large-scale community features outside this phase.

## Capabilities

### New Capabilities

- `mentor-diagnosis-benchmark`: Versioned gold fixtures, deterministic scoring, and quality thresholds for Mentor diagnosis and tutoring behavior.
- `attempt-evidence-binding`: Immutable attempt identity, code-snapshot freshness, code diff, and evidence-authority presentation for each Mentor conclusion.
- `misconception-remediation`: Evidence-bounded misconception classification and routing to the smallest relevant prerequisite lesson.
- `verified-learning-transfer`: Durable transfer-pass evidence that separates lesson completion from independent skill application.

### Modified Capabilities

None. These capabilities extend existing Mentor, practice, and lesson flows without changing the public execution contract.

## Impact

- Frontend Mentor timeline, runner workspace, learner event schema, lesson progress projection, remediation copy, styles, and tests.
- Gateway learning-event validation and tests for transfer evidence.
- New project-local benchmark fixtures, evaluator, report, npm quality command, and quality documentation.
- Project-local teacher review queue, adjudication manifest, prediction manifest, and deterministic import/merge commands; empty manifests remain honest release blockers.
- No new runtime dependency, no client-side AI key, and no claim that public sample passing equals hidden-test acceptance.

# Evidence Learning Platform v1 — implementation status

## What is operational

- Mentor benchmark v2 validates provenance and reports six required metrics with segment slices and a non-bypassable real-case gate.
- An offline importer preserves public source provenance, hashes source snapshots, deduplicates submissions, and never infers teacher gold labels from verdicts.
- Two hundred official Mini Project CodeNet errors are present as pending public cases; none are mislabeled as teacher-adjudicated.
- The Quality Lab is an independent application route with evidence envelopes, stable blind A/B, teacher rubrics, browser persistence, disagreement queue logic, and model-judge calibration logic.
- Semantic teaching events reject raw source and keystroke noise. A deterministic projector replays understanding, modeling, implementation, debugging, and validation and emits a contribution ledger.
- The twelve-node beginner graph validates prerequisites, skill references, cycles, five learning stages, transfer mappings, and 1/7/30-day review intervals.
- Remediation returns to the interrupted problem. Transfer evidence remains separate from lesson completion, and delayed review has a visible queue.
- Independent and AI-collaboration exams have explicit policies, legacy-session migration, structured collaboration evidence, resumable drafts, and four separate report dimensions.
- Generated content has candidate, auto-validated, and human-verified states, executable validation hooks, and evidence-based expansion gates.

## Honest limitations

- The 200 public submissions are real, but all still require teacher localization, misconception, hint-intent, learner-band, and leakage adjudication. The gold release gate is 0/100.
- Mini Project CodeNet contains Python, Java, and C++ but no JavaScript. JavaScript real-case coverage remains empty.
- The internal review store is browser-local in this first version; it is not yet a multi-reviewer authenticated server workflow.
- AI-collaboration mode currently records learner-authored collaboration notes, but it does not yet run an autonomous interview Agent that binds prompts, tool calls, diffs, tests, accept/reject decisions, and oral follow-ups into immutable evidence. These notes are explicitly excluded from the AI-collaboration score rather than counted as verified evidence.
- Generated-content validation has a real execution adapter contract, but production batch generation remains gated off until mentor quality and learning-effect milestones pass.
- Transfer lift, delayed retention, weekly retraining, and paid conversion are not claimed because no longitudinal learner experiment exists yet.

## Gate snapshot (2026-08-12)

| Gate | Current | Required | Status |
|---|---:|---:|---|
| Imported public wrong submissions | 200 | 100–200 | Met for intake |
| Teacher-adjudicated real cases | 0 | 100 | Blocked |
| JavaScript real coverage | 0 | non-empty | Blocked |
| Model-judge calibration holdout | 0 | 20+ and ≥80% agreement | Blocked |
| Verified transfer lift | no experiment | ≥10% configured gate | Blocked |
| Delayed retention | no experiment | ≥60% configured gate | Blocked |
| Human-verified generated content | 0 | 20 configured gate | Blocked |

These red gates are product behavior, not documentation caveats. `npm run verify:technical` runs the full engineering regression, while the default release command `npm run verify` also runs the v2 real-case gate and therefore exits non-zero until the teacher-adjudicated threshold is met. Both `npm run quality:mentor` and its explicit alias `npm run quality:mentor:v2` write the exact failures to `docs/quality/mentor-diagnosis-v2-report.json`.

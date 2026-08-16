## 1. Contract and migration baseline

- [ ] 1.1 Add failing client and gateway contract tests for curriculum versions, bridge events, assistance policies, verification attempts, and readiness snapshots.
- [ ] 1.2 Define shared domain types and strict parsers for `CurriculumNode`, `DiagnosticSnapshot`, `BridgePlan`, `TrainingSession`, `RemediationLink`, `AssistanceEvent`, `VerificationAttempt`, and `BridgeReadinessSnapshot`.
- [ ] 1.3 Add additive database/event-store migrations and idempotent persistence for bridge sessions, immutable plan versions, evidence references, and curriculum version identifiers.
- [ ] 1.4 Add backward-compatible adapters that project existing foundation, starter lesson, training, transfer, and review events into the new bridge contracts.
- [ ] 1.5 Extend backup/export/import and server bootstrap so bridge plans, sessions, remediation branches, verification attempts, and readiness evidence survive merge, replace, migration, and cross-device restore.

## 2. Trusted curriculum graph

- [ ] 2.1 Add failing graph-validation tests for cycles, duplicates, unknown prerequisites/skills, invalid review intervals, authority, stale hashes, and unavailable content.
- [x] 2.2 Implement one versioned graph that adapts the existing 12 foundation and 3 starter lessons without changing their old deep links or progress meaning.
- [x] 2.3 Add curriculum segment, node availability, objective, misconception, transfer, authority, content hash, and version metadata to the trusted catalogue.
- [ ] 2.4 Implement canonical content hashing, immutable reviewed versions, candidate/auto-validated/human-reviewed promotion rules, and tamper rejection.
- [ ] 2.5 Add first-release problem-modeling nodes for input/output, state and invariant, sample tracing, brute force and complexity, and edge-case testing with reviewed five-stage content.
- [ ] 2.6 Add or upgrade reviewed five-stage nodes for array/string traversal, hash lookup, two pointers, sliding window, stack/queue, and sorting/binary search.
- [ ] 2.7 Add trusted different-surface transfer mappings for every first-release node and visibly mark future graph/search/DP nodes unavailable until their content and transfer contracts are reviewed.

## 3. Entry diagnosis and adaptive plan

- [ ] 3.1 Add failing tests for incomplete diagnosis, baseline uncertainty, foundation/bridge placement, bypass challenge, plan versioning, and unsupported model route changes.
- [ ] 3.2 Implement a resumable short diagnosis that captures goal/time, state prediction, basic code completion, and problem-modeling evidence without saving unnecessary free text.
- [ ] 3.3 Implement deterministic placement and smallest-unmet-prerequisite selection with evidence citations, confidence, uncertainty, and challenge-to-skip behavior.
- [ ] 3.4 Implement immutable `BridgePlan` versions whose authoritative changes require validated learning events and whose model suggestions remain non-authoritative.
- [x] 3.5 Rebuild the first-time result as a direct handoff to one ten-minute mission and keep the first meaningful run reachable without opening the full problem library.
- [x] 3.6 Update Today so one primary mission always states goal, duration, prerequisite, expected gain, reason, confidence, completion criterion, and what evidence can change the plan.

## 4. Unified training session

- [ ] 4.1 Add failing state-machine tests for stage order, retry behavior, one-primary-action presentation, refresh recovery, and forbidden transfer before verified prediction/local coding.
- [x] 4.2 Refactor the existing Training Cabin to consume the versioned `TrainingSession` contract and preserve legacy lesson URLs through an adapter.
- [ ] 4.3 Make every stage record bounded pedagogical evidence with curriculum version and evidence references, without recording source code or free-form answers in the learning event stream.
- [x] 4.4 Add trusted state visualizations for the first-release nodes and label worked examples separately from live execution evidence.
- [ ] 4.5 Add Mentor acceleration rules that may shorten already-proven stages but may not skip independent transfer or convert model confidence into completion.
- [ ] 4.6 Restore the active mission, current stage, local exercise state, and pending transfer across refresh and authenticated cross-device bootstrap.

## 5. Just-in-time remediation

- [ ] 5.1 Add failing tests for immutable attempt binding, changed-editor diff notice, evidence insufficiency, smallest-prerequisite choice, missing mappings, resumable return, and solution-leak refusal.
- [ ] 5.2 Create `RemediationLink` from an immutable attempt snapshot, runtime/tool evidence, target skill, reviewed curriculum mapping, and return destination.
- [ ] 5.3 Extend Mentor planning so ambiguous failures trigger one discriminating prediction/test/plan request before a specific misconception or lesson is claimed.
- [ ] 5.4 Add the problem-workspace remediation handoff with a plain-language reason, estimated time, evidence scope, and explicit “return to this task” contract.
- [ ] 5.5 Preserve original problem, language, draft, attempt history, Mentor timeline, and code diff while the learner completes the minimal lesson, then restore them on return.
- [ ] 5.6 Implement the honest fallback that offers a general debugging action when no human-reviewed problem-to-skill-to-lesson mapping exists.

## 6. Transfer, assistance, and retention

- [ ] 6.1 Add failing tests that lesson completion, assisted task success, independent transfer, delayed retention, and final readiness remain separate facts.
- [ ] 6.2 Implement immutable per-attempt assistance policies and ledgers for hint levels, references, generated diffs, declared external help, and integrity violations.
- [ ] 6.3 Enforce transfer eligibility using trusted skill mappings, judge contracts, different-surface similarity/leakage checks, and curriculum/task version binding.
- [ ] 6.4 Record independent transfer only when the trusted verdict passes within policy, then schedule 1/7/30-day review obligations.
- [ ] 6.5 Implement deterministic review scheduling, priority, pass/fail projection, targeted refresh, and history-preserving downgrade behavior.
- [ ] 6.6 Extend the contribution ledger so every mastery, independence, hint-dependence, transfer, misconception, and forgetting change cites a rule version and evidence.
- [ ] 6.7 Keep offline or otherwise unverifiable outcomes pending until server validation succeeds and prevent pending/candidate evidence from granting mastery.

## 7. Readiness and algorithm bridge outcome

- [ ] 7.1 Add failing tests for multidimensional readiness, insufficient-evidence states, final-assessment gates, protected-route isolation, integrity events, and narrow outcome claims.
- [ ] 7.2 Implement `BridgeReadinessSnapshot` for understanding, modeling, implementation, debugging, validation, independence, hint dependence, transfer, and retention.
- [ ] 7.3 Rebuild the learner report to show strongest evidence, unresolved gap, confidence, contribution ledger, and next action for each dimension without an unexplained aggregate score.
- [ ] 7.4 Implement the final-assessment eligibility gate from required independent transfers and non-overdue blocking reviews.
- [ ] 7.5 Add a global no-AI session guard that disables Mentor, retrieval, references, solution history, generated diffs, and protected cross-route access during the assessment.
- [ ] 7.6 Implement trusted unfamiliar integrated tasks, explanation checkpoints for state/complexity/boundaries, resumable timing, integrity evidence, and versioned outcome records.
- [ ] 7.7 Add a narrow completion report that distinguishes algorithm-screening readiness from untested mathematics, ML, engineering, project delivery, and workplace skills.
- [ ] 7.8 Connect successful bridge outcomes to a separate project practicum mission while keeping algorithm and engineering evidence independently visible.

## 8. Cross-surface user experience

- [ ] 8.1 Add route and integration tests proving Today, map, cabin, workspace, review, insights, exam, and practicum consume the same curriculum and learner projection.
- [x] 8.2 Rebuild the learning map around five curriculum segments, explicit prerequisites, evidence states, current mission, locked reasons, and future-node availability.
- [ ] 8.3 Add one persistent contextual Mentor timeline that shows observation, evidence, hypothesis, evidence gap, tool action, next step, verification, degradation mode, and bound attempt.
- [ ] 8.4 Make growth replay explain starting point, assisted versus independent actions, transfer status, due reviews, current gap, and why the next mission changed.
- [ ] 8.5 Apply the established readability and responsive navigation standards to diagnosis, Today, map, cabin, remediation, report, and assessment flows.
- [ ] 8.6 Add accessible keyboard, focus, screen-reader, reduced-motion, empty, offline, model-unavailable, judge-unavailable, and synchronization-conflict states for the primary journey.

## 9. Verification and release gates

- [ ] 9.1 Run focused unit and contract tests for every new capability, then run full web/gateway tests, lint, typecheck, build, migrations, backup round-trip, and production configuration checks.
- [ ] 9.2 Start the full local stack and complete real-browser smoke flows for new learner diagnosis, first run, remediation return, independent transfer, delayed review display, assessment isolation, and practicum handoff.
- [ ] 9.3 Add telemetry definitions for time-to-first-meaningful-run, recommendation comprehension, post-hint self-correction, different-surface transfer, 7-day retention, and false independent-mastery rate without collecting source code or noisy keystrokes.
- [ ] 9.4 Document evidence boundaries and keep learning-effect claims disabled until real learner experiments satisfy pre-registered thresholds.
- [ ] 9.5 Complete an independent code/spec review, security/privacy review of learning data and assessment isolation, and ship-readiness review before enabling the bridge as the default new-user journey.

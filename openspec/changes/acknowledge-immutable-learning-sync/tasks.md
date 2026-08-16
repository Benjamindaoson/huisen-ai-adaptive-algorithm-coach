## 1. Baseline and red tests

- [x] 1.1 Record the replay baseline, primary metric, guardrails, evaluation scenarios, and revert threshold in `STATE.md`.
- [x] 1.2 Add a red public-seam test proving an unchanged 100-event snapshot replays all 100 events on its second synchronization.
- [x] 1.3 Add red guardrail tests for a new event, failed write, changed same-ID payload, queued-operation precedence, corrupt storage, learner/kind scope, and bounded retention.
- [x] 1.4 Add a red bootstrap test proving authoritative remote events and attempts currently replay after adoption.

## 2. Fingerprint-bound acknowledgement

- [x] 2.1 Implement strict versioned acknowledgement parsing, canonical fingerprints, per-learner/kind lookup, best-effort recording, bootstrap seeding, and a 10,000-entry bound.
- [x] 2.2 Record exact acknowledgements after successful event and attempt outbox responses without changing at-least-once queue behavior.
- [x] 2.3 Skip only exact acknowledged immutable payloads during snapshot assembly and continue sending changed or unacknowledged payloads.
- [x] 2.4 Seed acknowledgements from authenticated bootstrap before ordinary post-bootstrap synchronization resumes.

## 3. Evaluation and review

- [x] 3.1 Pass focused acknowledgement, outbox, synchronization, bootstrap, and migration suites.
- [x] 3.2 Pass full tests, lint, both typechecks, Web production build, Gateway health, and real authenticated browser synchronization.
- [x] 3.3 Pass strict OpenSpec/diff checks, run the Mentor gate honestly, complete ship review, and update `STATE.md` with before/after evidence and the next opportunity.

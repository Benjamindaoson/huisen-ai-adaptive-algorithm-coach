## Why

The product already has a runnable corpus, a tool-using Mentor, a beginner path, and a timed mock exam, but its strongest claims are still difficult to audit: the diagnosis benchmark is only a 12-case seed, learning state is partly projected from coarse outcomes, and exam practice does not distinguish independent algorithm ability from AI-collaboration ability. This change turns those isolated capabilities into one evidence system whose quality, teaching decisions, and learner progress can be inspected and regression-tested.

## What Changes

- Replace the seed-only Mentor benchmark contract with provenance-aware datasets, six required quality metrics, segment reports, comparison reviews, calibrated model-judge records, and a regression gate.
- Add an internal review workspace for blind A/B comparison, teacher adjudication, disagreement resolution, dataset promotion, and calibration inspection.
- Introduce a bounded pedagogical event model that records meaningful attempts, phase changes, hints, edits, runs, tests, and transfer evidence without storing keystroke noise.
- Derive learner-twin updates only from explainable event projections and expose the evidence behind every mastery, independence, hint-dependence, and transfer update.
- Expand the beginner curriculum into a prerequisite knowledge graph with short lessons, prediction checkpoints, interactive algorithm visualizations, partial coding, complete practice, remediation return, hidden transfer, and delayed review.
- Extend mock exams into explicit `independent` and `ai-collaboration` modes with separate rules, resumable sessions, evidence capture, and multi-dimensional reports.
- Add a trusted generated-content pipeline for analogies, counterexamples, and transfer candidates with execution validation, provenance, trust levels, and promotion gates.
- Keep community, enterprise, recruiting, and outcome claims gated until real longitudinal evidence exists; no synthetic fixture may be represented as a real learner submission.

## Capabilities

### New Capabilities

- `mentor-quality-governance`: Provenance-aware Mentor datasets, six quality metrics, blind human comparison, calibrated model judging, and release regression gates.
- `pedagogical-event-projection`: Bounded instructional events, phase replay, and explainable learner-twin projections.
- `adaptive-algorithm-curriculum`: Prerequisite knowledge graph, short scaffolded lessons, remediation return, transfer validation, and delayed review.
- `dual-mode-algorithm-exam`: Independent and AI-collaboration exam modes with distinct policies and dimension-level reports.
- `trusted-generated-content`: Automatically validated candidate analogies, counterexamples, transfer tasks, trust levels, and human promotion workflow.

### Modified Capabilities

<!-- Existing changes have not been archived into main OpenSpec capabilities, so this proposal introduces additive contracts without pretending to modify a main spec that does not yet exist. -->

## Impact

- Frontend: new internal quality route, review components, phase replay, curriculum graph/lesson interactions, exam mode selection, and dimension reports.
- Gateway: review/calibration APIs, event validation and projection, AI-collaboration evidence, and content validation contracts.
- Quality tooling: benchmark schema v2, dataset manifests, segment scoring, release thresholds, provenance checks, and generated reports.
- Data: browser-local compatibility remains, while server stores receive versioned bounded records; no raw hidden tests or secrets reach the browser.
- Dependencies: prefer existing React, TypeScript, Fastify, Tree-sitter, Judge0, and DeepSeek integration; no new runtime dependency is required for the first implementation phase.

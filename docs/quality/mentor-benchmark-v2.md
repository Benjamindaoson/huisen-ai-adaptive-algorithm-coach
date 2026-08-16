# Mentor diagnosis quality benchmark v2

> 教师金标的导入、预测分离和当前 200 条案例的证据缺口见 [mentor-teacher-adjudication-runbook.md](./mentor-teacher-adjudication-runbook.md)。

`npm run quality:mentor` (also available as `npm run quality:mentor:v2`) validates immutable attempt hashes, execution evidence, provenance, and teacher-adjudication state before scoring six metrics: line localization, misconception labels, evidence sufficiency, minimal-hint effectiveness, answer leakage, and false conclusions. It also emits slices by language, error family, learner band, and execution verdict. The default release command `npm run verify` includes this gate; use `npm run verify:technical` only when you need the engineering regression independently of unavailable teacher gold data.

The command exits non-zero until every metric and required real-data slice meets its threshold and there are at least 100 eligible real cases. A case is eligible only when it is `first-party-observed` or `public-dataset` and has completed teacher adjudication. `synthetic-mutation` cases remain regression fixtures only, even if they have hand-authored labels and every metric is green.

The seeded v2 fixture is a migration-compatible synthetic baseline derived from the earlier v1 style. Its baseline predictions test evaluator determinism; they are not evidence that a live Mentor is effective for learners. The generated report is `docs/quality/mentor-diagnosis-v2-report.json`.

## Local public-data ingestion

The importer is offline and accepts only local CodeNet-style directories. It reads each metadata CSV, resolves source files as `<source-root>/<problem_id>/<language>/<submission_id>.<filename_ext>`, hashes source text, retains the supplied verdict as execution evidence, and deduplicates by source hash.

```powershell
npm run quality:mentor:import -- --metadata-dir C:\data\Project_CodeNet\metadata --source-root C:\data\Project_CodeNet\data --output quality\provenance\mentor-cases.json --source-url https://github.com/IBM/Project_CodeNet --license CDLA-Permissive-2.0
```

Imported records are always `public-dataset` with `adjudication.status: "pending"`; they omit `expected` labels. A wrong-answer/runtime-error/accepted verdict does not establish a misconception, a localized fault, hint intent, or any teacher gold label. A teacher must add those labels and complete adjudication before a case can contribute to the real-evidence gate.

## Current imported cohort

On 2026-08-12 the repository imported exactly 200 non-accepted submissions from IBM's official 1.4 MB Mini Project CodeNet package into `quality/provenance/mentor-cases.json`:

- Python: 66 (Wrong Answer, Runtime Error, Time Limit Exceeded)
- Java: 67 (Wrong Answer, Runtime Error, Compile Error, Time Limit Exceeded)
- C++: 67 (Wrong Answer, Runtime Error, Compile Error, Time Limit Exceeded)

The source is [IBM Data Asset eXchange — Project CodeNet](https://dax-cdn.cdn.appdomain.cloud/dax-project-codenet/1.0.0/readme.html), licensed under [CDLA-Permissive-2.0](https://cdla.dev/permissive-2-0/). All 200 records remain pending teacher adjudication and have learner band `unknown`; therefore the eligible gold count remains 0 and the release gate stays red.

# M2 durable judging implementation status

Date: 2026-08-13

## Outcome

The local production-like stack now supports an authenticated, durable, private hidden-judge flow from the React application through the gateway, PostgreSQL-backed submission state, a network-isolated Judge0 worker, and aggregate-only results. This is an implemented engineering phase, not a production-release claim.

The OpenSpec change `productionize-fullstack-learning-platform` currently records 21 of 55 tasks complete. The release remains blocked by missing reviewed content/evidence and external deployment work.

## Implemented in this phase

- Server-authoritative bootstrap and conflict handling for progress, attempts, exams and recommendation inputs; only newer offline drafts may merge.
- Durable create, poll, cancel, reconcile and idempotent dispatch for submissions, including lease renewal during long hidden packs.
- Immutable judge-pack and execution-artifact repositories.
- Authenticated hidden submission from the problem workspace and trusted-hidden grading from the exam workspace.
- Private Judge0 only in production-like configuration; no browser fallback to a public Judge0 instance.
- Queue, verdict, runtime, retry, saturation and estimated-cost metrics without source code or hidden-case payloads.
- Judge-pack schema, hashing, differential-reference, mutation, duplicate and four-language factory tooling.
- Destructive-code containment smoke tests and a real authenticated end-to-end submission smoke test.
- CodeQL, dependency, secret, misconfiguration, license, filesystem and container-image scanning workflows.

## Verification evidence

- `npm test`: 143 files, 518 tests passed.
- `npm run lint`: passed with no warnings.
- `npm run typecheck`: web and gateway passed.
- `npm run build:web`: production bundle passed.
- `npm audit --audit-level=high`: zero reported vulnerabilities.
- `npm run stack:config`: private network/resource-isolation contract passed.
- `npm run stack:smoke`: identity, learning, runner and object storage ready; Mentor honestly reported experimental/degraded.
- `npm run stack:containment`: timeout, blocked-network and environment-secret probes passed.
- `npm run stack:submission-smoke`: authenticated submission `od-5e34daac53f3@starter-v1` passed 2/2 hidden cases.
- Real browser: 754-problem catalog, problem workspace, hidden-submit aggregate result, exam page, desktop layout and 390x844 mobile navigation rendered without console errors.
- `openspec validate productionize-fullstack-learning-platform --strict`: passed.

## Release blockers (intentionally red)

1. `npm run quality:judge:release` exits 1: 0/754 reviewed gold judge packs. Four starter packs are development evidence only and are not promoted as gold.
2. `npm run quality:mentor` exits 1: 0/100 eligible real teacher-adjudicated Mentor cases. The runtime must remain experimental/degraded.
3. Dedicated Judge0 hosts, China-cloud production resources, encrypted backup/PITR proof, load/game-day evidence, domain/ICP evidence and signed deployment promotion have not been supplied or executed.
4. The remaining OpenSpec work includes the production Mentor trace runtime, full quality workbench, entitlements/quotas, observability/SLO operations, dual deployment and final acceptance.

No gate has been weakened to make these blockers appear green.

## 1. Project and archival baseline

- [ ] 1.1 Initialize Node tooling, tests, ignore rules and project documentation.
- [ ] 1.2 Implement copy-first source archival and SHA-256 manifest validation.
- [ ] 1.3 Verify archive equality before any source-root migration.

## 2. Normalized problem corpus

- [ ] 2.1 Implement HTML, DOCX and PDF extraction into structured problem records.
- [ ] 2.2 Implement deterministic IDs, exact duplicate grouping and variant-candidate handling.
- [ ] 2.3 Generate and validate catalog and problem JSON outputs from the archived corpus.

## 3. Static learning experience

- [ ] 3.1 Scaffold the static React application and client-side catalog search/filtering.
- [ ] 3.2 Add problem-reader routes, source variants and responsive digital-book layout.
- [ ] 3.3 Add local progress, notes, favorites and validated JSON export/import.
- [ ] 3.4 Add fixed learning paths and Monaco editor integration.

## 4. Constrained code runner

- [ ] 4.1 Implement the Fastify gateway with request validation, resource limits, CORS and rate limiting.
- [ ] 4.2 Create internal Judge0 CE Docker Compose topology and deployment configuration.
- [ ] 4.3 Connect frontend execution UI and verify success/error outcomes for all four allowed languages.

## 5. Verification and controlled migration

- [ ] 5.1 Run corpus, unit, type, build and local browser smoke verification.
- [ ] 5.2 Document content maintenance, deployment, recovery and runner operations.
- [ ] 5.3 Re-verify archive integrity and move only explicit source roots into the archive.

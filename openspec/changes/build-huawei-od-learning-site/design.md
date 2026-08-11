## Context

The project starts as 1,092 local HTML, DOCX and PDF files with 246 exact duplicate HTML bodies and no software structure. Users need a shareable learning experience without losing provenance, while untrusted code must run in a service separate from the static frontend.

## Goals / Non-Goals

**Goals:**

- Preserve source files before normalization and make every displayed record traceable to its origin.
- Deliver a static, searchable React learning experience with local-only progress backups.
- Support controlled Java, Python, JavaScript and C++ execution through a locally deployable open-source service.

**Non-Goals:**

- Accounts, cloud state, social features, public ranking, hidden-test grading or official recruitment-policy claims.
- Automatic semantic merging of non-identical same-title questions.

## Decisions

### Archive first, then generate a derived corpus

The source archive is immutable and SHA-256-manifested. A Node pipeline emits normalized JSON and a catalog index; generated JSON is reproducible and not treated as original evidence. This avoids exposing Typora export markup in the product and allows improvements to the parser without rewriting source files.

Alternative considered: serve original HTML directly. Rejected because it retains duplicate pages, inconsistent styling and unusable cross-file search.

### Use a static Vite/React frontend with browser-local state

React provides an interactive editor and local progress UI while Vite produces deployable static assets. Catalog search runs client-side against generated index data. `localStorage` holds a versioned progress object; export/import provides portability without accounts.

Alternative considered: server-rendered application with a user database. Rejected because it adds deployment and privacy scope unrelated to the first release.

### Use Judge0 CE behind a narrow Fastify gateway

Judge0 CE supplies isolated multi-language execution. The gateway is the only browser-facing API and validates language, payload, resource limits, CORS and request rate before forwarding to Judge0. PostgreSQL, Redis and Judge0 remain internal Compose services.

Alternative considered: Piston single-container deployment. Rejected because the documented quick start uses a privileged container, which is not an acceptable default for a shareable public runner. Browser-only Web Workers/Pyodide were rejected because they do not meet the required Java/C++ execution scope.

## Risks / Trade-offs

- [Parser variations] → Preserve source paths, make unknown sections explicit, and keep same-title variants separate.
- [Large client search payload] → Generate compact catalog entries and lazy-load complete record chunks.
- [Runner abuse] → Gateway language allowlist, fixed resource limits, rate limiting, internal-only Judge0 dependencies and a single public endpoint.
- [Archive migration mistake] → Copy first, compare all hashes, then move only explicit source roots; never overwrite archive files.
- [Public deployment complexity] → First validate locally with Docker Compose; production requires HTTPS reverse proxy and configured allowed frontend origin.

## Migration Plan

1. Initialize project tooling and archive an equal, hashed copy of the source corpus.
2. Generate and validate corpus JSON without removing originals.
3. Build and verify the static site independently of the runner.
4. Start private runner services locally, run one success and error case per allowed language, then connect the frontend.
5. After final archive equality verification, move only the explicit material roots to `archive/original/`.

Rollback is a reverse move from the verified archive; derived `content/` can always be regenerated. Stopping the Compose stack disables code execution but does not affect the static learning site.

## Open Questions

No open question blocks local first-release implementation. Public host, domain and HTTPS certificate selection are deployment-time inputs and do not change the product contract.

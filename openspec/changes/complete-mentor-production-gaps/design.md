## Context

The current gateway already has a four-language Tree-sitter adapter, a bounded Mentor tool loop, Judge0 execution, a full-corpus lexical index, and JSON persistence. The remaining gaps are architectural rather than cosmetic: expected outputs are rarely authoritative, semantic evidence does not cross function boundaries, probes do not expose changing values, and browser-generated learner IDs are not cryptographic identities. Judge0, PostgreSQL, and Redis already run in the local Compose stack.

## Goals / Non-Goals

**Goals:**

- Turn the existing 722 multi-solution problems into an on-demand source of auditable consensus expectations without calling them human reviewed.
- Add useful interprocedural evidence—function scopes, calls, dominators, reaching definitions, and path risks—without pretending to be a language compiler.
- Capture bounded scalar state at selected control points in disposable source copies for all four supported languages.
- Make session/twin storage transactional and multi-instance-safe in PostgreSQL.
- Bind learner-owned routes to an expiring signed identity when production auth is enabled.

**Non-Goals:**

- Formal verification, sound pointer/alias analysis, macro expansion, or whole-program type inference.
- Automatically promoting reference consensus to human-reviewed evidence.
- Sending reference source, hidden tests, database credentials, or signing keys to the model/browser.
- Replacing a future full account system, OAuth provider, or organization/role model.

## Decisions

### Four explicit expectation authorities

Expected observations carry `human-reviewed`, `reference-consensus`, `candidate`, or `unverified`. Human-reviewed cases remain file-backed. For a missing exact case, the server loads reference solutions for the requested problem, executes up to four different languages through Judge0, and accepts consensus only after two successful independent implementations normalize to the same output. Disagreement, one success, compilation failures, or timeouts produce no expectation and retain diagnostic provenance. Results are bounded and cached by problem/input/content digest.

This is preferred over treating the first reference solution as an oracle because the corpus is unreviewed. It is preferred over bulk generation at build time because 754 problems multiplied by languages and inputs is expensive and most candidates are never requested.

### Semantic layer over Tree-sitter evidence

`semantic-analysis.ts` consumes the parser's structural nodes and source ranges. It resolves named functions, assigns calls to their nearest function ancestor, computes direct call edges, iterates dominator sets over the existing CFG, and calculates prior reaching definitions for each use. It emits risks only as evidence objects with stable refs. Runtime/differential evidence is still required for causal conclusions.

This is preferred over introducing four compiler toolchains into the gateway. Tree-sitter remains the common syntax boundary while the report clearly labels analysis precision.

### Value probes with conservative visibility

Probe planning chooses at most eight control points and at most three identifier expressions whose definitions precede the probe. Each language inserts a stderr-only trace immediately before the target line with language-safe formatting. The trace parser accepts only the Mentor prefix, validates size and shape, and returns structured observations. Failed instrumentation is visible and never affects the formal run, which continues to use `originalSource`.

### Repository interface with PostgreSQL implementation

The existing `MentorStore` contract remains the domain boundary. `createPostgresMentorStore` initializes two JSONB-backed tables, uses transactions and upserts, enforces learner ownership in every query, trims timelines before writes, and deletes oldest sessions beyond the retention limit. `createConfiguredMentorStore` selects PostgreSQL only when complete Mentor database settings exist; otherwise it returns the existing file store with an explicit mode.

The schema uses its own `mentor` namespace in the existing database rather than coupling to Judge0 tables. A one-shot migration imports the current JSON store when the database is empty.

### Signed anonymous identity

`POST /auth/anonymous` exchanges a validated device ID for an HMAC-SHA256 token containing version, learner subject, issued-at, and expiry. Protected routes compare the token subject to the requested learner ID with timing-safe signature verification. Auth is fail-closed when `MENTOR_AUTH_SECRET` is configured and explicitly `permissive-local` otherwise. The frontend caches the token with its expiry and refreshes it before Mentor/learner requests.

## Risks / Trade-offs

- [Two wrong reference solutions can agree] → Preserve `reference-consensus` separately, require different languages, store all execution refs, and never label it human reviewed.
- [Instrumentation can change timing or fail compilation] → Run only disposable copies, cap probes/state, and keep original-source Judge0 results authoritative.
- [Tree-sitter names differ by grammar] → Keep language-specific name/callee extractors behind one tested adapter and expose `precision: structural-interprocedural`.
- [PostgreSQL outage blocks production sessions] → Fail closed in database mode; do not silently fork learner state into a local file. Local fallback is selected only at startup when database settings are absent.
- [Anonymous tokens are not full accounts] → Treat them as device ownership credentials and document account linking as a later product capability.

## Migration Plan

1. Add new semantic, trace, oracle, identity, and PostgreSQL modules behind existing interfaces.
2. Add schema initialization and optional JSON import; keep file mode as the default outside Compose.
3. Configure Compose with Mentor database settings and a distinct signing secret.
4. Update frontend requests to obtain and attach anonymous credentials.
5. Verify old unconfigured tests remain permissive-local, then run database, auth, Judge0, DeepSeek, and browser integration tests.

Rollback removes the Mentor database/auth environment settings and returns the gateway to the explicitly labelled file/permissive-local adapters without changing the API payload version.

## Open Questions

- None blocking this phase. Full user accounts and formal compiler analyses are intentionally separate future products, not hidden completion claims.

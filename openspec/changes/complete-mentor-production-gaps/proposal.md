## Why

The first Mentor release proved a real tool-calling teaching loop, but four deliberate limits still prevent it from being a production-grade AI learning system: trusted expected outputs cover only eight cases, semantic analysis is intraprocedural and approximate, runtime probes mostly record control hits instead of values, and sessions rely on an unsigned browser identity plus one local JSON file. These gaps must be closed before the product can claim reliable diagnosis, durable learner state, or safe multi-instance deployment.

## What Changes

- Add an on-demand reference-consensus oracle that executes at least two independent corpus solutions, admits an expected output only when successful implementations agree, caches provenance, and keeps human-reviewed, reference-consensus, candidate, and unverified evidence visibly distinct.
- Extend code intelligence with named function scopes, a call graph, dominators, reaching definitions, use-before-definition/path-risk evidence, and stable source-level citations.
- Replace control-hit-only probes with bounded expression/state probes for JavaScript, Python, Java, and C++, plus a parser that turns diagnostic stderr into structured value observations without changing the authoritative source or verdict.
- Add a PostgreSQL Mentor repository with schema initialization, transactional session/twin writes, retention, and file-store migration while preserving the file store as an explicit local fallback.
- Add signed anonymous learner identities with expiry and subject binding. When configured, Mentor and learner-state routes reject missing, expired, malformed, or cross-learner credentials.
- Surface evidence authority, runtime values, identity state, and storage/runtime mode honestly in the API and Mentor timeline.

## Capabilities

### New Capabilities

- `reference-consensus-oracle`: Derive auditable expected outputs from multiple independently executed reference solutions while preserving provenance and trust boundaries.
- `interprocedural-code-intelligence`: Build function scopes, call graphs, dominators, reaching definitions, and path-risk evidence over supported languages.
- `runtime-state-tracing`: Generate and parse bounded four-language value probes on disposable diagnostic copies.
- `durable-mentor-platform`: Persist Mentor state in PostgreSQL and enforce signed learner ownership when production configuration is enabled.

### Modified Capabilities


## Impact

- Gateway Mentor parser, code intelligence, runtime, expectation resolver, server routes, validation, persistence factory, and tests.
- New PostgreSQL client dependency and Mentor schema in the existing local Compose database.
- Web identity client, Mentor request authorization, runtime/trust labels, and browser tests.
- Corpus/reference-solution loader and bounded oracle cache; reference source remains server-only.
- Operations add Mentor PostgreSQL and signing-secret variables. Local unconfigured development retains explicitly labelled file/permissive fallback modes.

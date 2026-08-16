# M0–M1 implementation status

Generated: 2026-08-13

## Delivered

- M0 executable baseline: 754 catalog entries, current hidden judge coverage, gateway capability health and the truthful Mentor release gate are emitted to `docs/quality/production-baseline.json`.
- M0 production-like local stack: PostgreSQL, Redis, MinIO-compatible object storage, the gateway and private Judge0 start through one Compose file and are verified by an executable smoke check.
- M0 contract surface: `/api/v1/openapi.json`, `/api/v1/capabilities` and shared typed error envelopes cover the identity and authoritative-learning routes.
- M0 CI: technical verification, migration/contract coverage, the production-like stack smoke test and the separately visible non-bypassable Mentor promotion gate run as distinct jobs.
- M1 identity: Argon2id credentials, email verification delivery contract, signed opaque cookie sessions, CSRF, refresh rotation, recovery, revocation, roles, device-labelled sessions and audit records are persisted in PostgreSQL.
- M1 authorization: protected routes enforce account ownership or explicit reviewer/admin roles; production startup rejects permissive identity, weak/default secrets, insecure cookies/origins and absent PostgreSQL.
- M1 learning authority: normalized PostgreSQL profiles, semantic events, attempts and versioned states support authenticated bootstrap, incremental sync, optimistic conflicts, deterministic mastery/delayed-review projection, export and deletion audit.
- M1 browser bridge: the React application has registration/sign-in/verification UI, anonymous upgrade, local-data migration planning, incompatible legacy-event quarantine, a persistent ordered outbox, retry/rebase and server reconciliation.

## Verification evidence

- `npm test`: 133 files, 484 tests passed.
- `npm run lint`: passed with no warning.
- `npm run typecheck`: web and gateway passed.
- `npm run build:web`: production build passed.
- `npm run stack:config`: all seven required services present.
- `npm run stack:smoke`: gateway, PostgreSQL learning/identity, object store and runner reported ready.
- `openspec validate productionize-fullstack-learning-platform --strict`: passed.
- Real browser: registration, development verification, sign-in, anonymous-data upgrade, idempotent replay reconciliation, `云端已同步`, authenticated navigation and the 754-problem catalog all passed with no console error.

## Honest boundaries after M0–M1

- Cross-device bootstrap and writes are connected, but all legacy browser modules have not yet been reduced to offline-draft-only authority; OpenSpec task 3.5 remains open.
- The durable Judge0 submission lifecycle and 754 trusted judge packs are M2 work and remain open.
- Mentor production promotion remains correctly blocked at 0/100 eligible real teacher-adjudicated cases. M0–M1 does not claim validated learning effectiveness.
- The generic authenticated verification-delivery webhook is implemented, but a real China-region email/SMS vendor and production credentials are deployment choices, not embedded secrets.

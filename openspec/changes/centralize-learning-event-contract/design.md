## Context

The same 30 event kinds and 21 data keys currently exist in three files. Run 41 proved these copies can drift and quarantine valid first-minute, training, and diagnostic evidence. Web and Gateway are separate TypeScript packages, and the Gateway Docker context is allowlisted, so a shared source must also be explicitly packaged.

## Goals / Non-Goals

**Goals:** one vocabulary source, compile-time literal unions in both packages, every-kind boundary conformance, and production-like container proof.

**Non-Goals:** replace all semantic validators with a schema framework, change existing event payloads, introduce a new dependency, or migrate stored data.

## Decisions

### Use one dependency-free TypeScript contract

`contracts/learning-event-contract.ts` SHALL export readonly literal arrays for kinds, data keys, targets, languages, outcomes, stages, phases, reflection tags, and diagnostic steps. It contains no browser, Node, React, Fastify, or package-local imports, so both runtimes can consume it directly.

### Keep semantic validation at trust boundaries

Device parsing, migration compatibility, and Gateway authority have different envelope/ownership needs. They SHALL keep their semantic validation functions but import every shared vocabulary enum. This removes silent list drift without falsely pretending the boundaries are identical.

### Require an exhaustive valid fixture map

A root contract test SHALL construct one minimally valid event for every canonical kind and submit it to device parsing, migration compatibility, and Gateway validation. Adding a kind without a fixture makes the test fail immediately.

### Package the contract explicitly

The Docker allowlist SHALL include only the shared contract file, and the Gateway Dockerfile SHALL copy it to the same repository-relative runtime location used by imports. A production-like image rebuild and health check are required evidence.

## Risks / Trade-offs

- [Vite or TypeScript cannot resolve a source outside a package root] → Both typechecks and the production Web build are mandatory before keeping the change.
- [Gateway image omits the contract] → Explicit `.dockerignore` allowlist plus image rebuild/health is the gate.
- [Shared enums create a false sense of full semantic parity] → Keep separate boundary validators and state this limitation; the exhaustive valid-event test proves acceptance, not identical rejection behavior.

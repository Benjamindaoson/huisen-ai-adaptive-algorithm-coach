# P2 Migration Manifest — StuckToShip → AI Talents Learning OS

## Source repository

`Benjamindaoson/stuck-to-ship`

## Destination

`Benjamindaoson/huisen-ai-adaptive-algorithm-coach`  
Product identity: **AI Talents Learning OS**

## Migration strategy

This is a semantic rewrite in TypeScript, not a raw repository copy.

| StuckToShip capability | Source module | AI Talents destination | Status |
|---|---|---|---|
| Intent routing | `core/intent_router.py` | `services/tutor/router.ts` | migrated |
| Course RAG | `core/course_retriever.py` | `services/tutor/retrievers.ts` | migrated |
| Code RAG | `core/code_retriever.py` | `services/tutor/retrievers.ts` | migrated contract / rewritten |
| FAQ matcher | `core/faq_matcher.py` | `services/tutor/retrievers.ts` | migrated |
| Error recipes | `core/error_matcher.py` | `services/tutor/retrievers.ts` | migrated |
| Prompt injection guard | `core/prompt_injection.py` | `services/tutor/safety.ts` | migrated |
| ACL filter | `core/access_control.py` | `services/tutor/safety.ts` | migrated |
| Evidence packet/gate | `core/evidence.py`, `core/retrieval_gate.py` | `services/tutor/evidence-gate.ts` | migrated |
| Citation projection | `core/qa_orchestrator.py` | `services/tutor/citations.ts` | migrated |
| Orchestration | `core/qa_orchestrator.py` | `services/tutor/runtime.ts` | migrated |
| Tutor trace | QA trace | `EvidenceEvent(retrieval_trace)` | upgraded |
| Standalone UI | static/product UI | — | intentionally not migrated |
| FastAPI product shell | application shell | — | intentionally not migrated |
| Python AST indexer | `ingestion/code_indexer.py` | existing Tree-sitter stack will provide adapter | intentionally not duplicated |
| Milvus-specific deployment | deployment layer | future retrieval provider | not migrated in P2 |

## Behavioral guarantees

P2 tests preserve the important product behavior:

1. Route course/code/error/FAQ/learning-path/clarification requests.
2. Return source-backed citations.
3. Preserve code file and line evidence.
4. Use structured error recipes.
5. Refuse or clarify when usable evidence is absent.
6. Block prompt-injected evidence before answer generation.
7. Record every Tutor interaction as EvidenceEvent.
8. Prevent Tutor retrieval traces from changing mastery.

## What "absorbed" means

After P2, StuckToShip is no longer needed as a separate product architecture.

Its reusable teaching logic now has a canonical owner:

```text
AI Talents Learning OS / services/tutor
```

The old repository can be retained temporarily for history and comparison, then marked superseded/archive after the P2 merge and validation are complete.

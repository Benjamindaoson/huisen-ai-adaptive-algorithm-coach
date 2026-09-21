# P2 — StuckToShip capability migration

## Goal

Absorb the durable Tutor capabilities from `Benjamindaoson/stuck-to-ship` into AI Talents Learning OS without importing its standalone product UI or creating a second RAG stack.

## Source-to-target mapping

| StuckToShip source | AI Talents target |
|---|---|
| `core/intent_router.py` | `services/tutor-runtime/intent-router.ts` |
| `core/course_retriever.py` | `services/tutor-runtime/retrievers.ts` |
| `core/code_retriever.py` | `services/tutor-runtime/retrievers.ts` |
| `core/error_matcher.py` | `services/tutor-runtime/retrievers.ts` |
| `core/faq_matcher.py` | `services/tutor-runtime/retrievers.ts` |
| `core/evidence.py` + retrieval gate | `services/tutor-runtime/evidence-gate.ts` |
| `core/qa_orchestrator.py` | `services/tutor-runtime/runtime.ts` |
| citations in QA output | `TutorCitation` contract |
| QA trace | `EvidenceEvent` stream |

## Explicitly not migrated

- StuckToShip standalone Web UI
- standalone FastAPI product shell
- product-specific branding and routes
- duplicate vector database deployment
- duplicate learner/session store

## Runtime rule

Every Tutor turn is observable as evidence events:

```text
route
  ↓
retrieval
  ↓
evidence gate
  ↓
intervention
```

The Tutor emits trace evidence, but Tutor output does **not** directly update mastery scores. Mastery still comes from verifiable learner outcomes such as attempts, transfer tasks, delayed retests, and project evidence.

## Trust rule

The Tutor fails closed when evidence is absent or weak. Citations are part of the response contract rather than decorative metadata.

## Next step

Wire the runtime to the existing trusted Mentor corpus and gateway endpoint, then retire the old standalone StuckToShip product shell after parity checks.

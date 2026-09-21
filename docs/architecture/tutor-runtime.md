# AI Talents Learning OS — Tutor Runtime

## Purpose

P2 migrates the reusable teaching intelligence from **StuckToShip** into AI Talents Learning OS.

The migration is capability-level, not repository-level:

```text
StuckToShip Product
├── UI / product shell                 → not migrated
├── FastAPI application shell          → not migrated
├── Course RAG                         → Tutor Runtime
├── Code RAG                           → Tutor Runtime
├── FAQ fast path                      → Tutor Runtime
├── structured error diagnosis         → Tutor Runtime
├── evidence gate                      → Tutor Runtime
├── citation contract                  → Tutor Runtime
└── trace/evaluation semantics         → Tutor Runtime + EvidenceEvent
```

The result is one Tutor service owned by AI Talents Learning OS rather than a second education product.

## Runtime

```text
TutorRequest
   │
   ▼
Intent Router
   │
   ├── course
   ├── learning_path
   ├── code
   ├── faq
   ├── error
   └── clarify
   │
   ▼
Retriever
   │
   ▼
Safety Filter
   │
   ├── source validation
   ├── ACL check
   └── prompt-injection filter
   │
   ▼
Evidence Gate
   │
   ├── accept
   ├── retry
   └── clarify_or_refuse
   │
   ▼
Grounded Tutor Answer
   │
   ├── citations
   └── structured trace
   │
   ▼
EvidenceEvent(retrieval_trace)
```

## Course RAG

`searchCourseDocuments()` performs a deterministic lexical retrieval pass over course documents.

The contract preserves:

- source path
- source type
- title
- tags
- line range
- score
- visibility / allowed users

The implementation is intentionally provider-neutral. Dense or hybrid retrieval can replace or supplement the lexical retriever later without changing the Tutor response contract.

## Code RAG

`searchCodeSymbols()` retrieves symbol-level code evidence with:

- file path
- symbol name
- symbol type
- start/end lines
- source excerpt

P2 does not copy StuckToShip's Python AST indexer. The new product already has a stronger Tree-sitter code-intelligence stack in the gateway. The Tutor contract therefore consumes normalized symbols and keeps the indexing implementation as an adapter boundary.

This avoids maintaining two code parsers.

## Error Diagnosis

Error diagnosis is recipe-backed rather than free-form.

A recipe carries:

```text
error pattern
symptom
cause
fix steps
verification command
source
```

A matched recipe is returned with citation evidence. If no safe recipe or other evidence exists, the Tutor clarifies or refuses rather than inventing a diagnosis.

## FAQ

FAQ remains a bounded fast path for high-confidence repeated questions.

It is not treated as a separate product subsystem.

## Safety before generation

Retrieved content is filtered before it can become Tutor evidence.

P2 includes:

- missing-source rejection
- visibility/allowed-user checks
- prompt-injection detection inherited from the StuckToShip threat model

Blocked evidence is preserved in the trace by reason but is not cited as usable evidence.

## Evidence Gate

The gate is deliberately independent from generation:

```text
no evidence
    → clarify_or_refuse

blocked evidence only
    → clarify_or_refuse

low confidence
    → retry

source-backed evidence above threshold
    → accept
```

This keeps hallucination control testable outside the model prompt.

## Citation contract

Each accepted source can return:

```text
sourcePath
sourceFile
sourceType
title
startLine
endLine
score
excerpt
```

Code answers therefore preserve file/line evidence.

## EvidenceEvent integration

Every valid Tutor turn emits exactly one:

```text
EvidenceEvent {
  evidenceType: "retrieval_trace"
}
```

The event records:

- route
- route reason
- gate decision
- confidence
- candidate count
- citation count
- blocked reasons
- trace reference

Clarification and refusal turns are recorded too.

## Critical trust boundary

A Tutor trace is not proof that the learner knows the skill.

Therefore `LearnerModelUpdater` excludes:

```text
retrieval_trace
tool_trace
generic learning_event
```

from mastery projection.

This means:

```text
asked Tutor many times
        ≠
mastery increased
```

Actual mastery still requires concept, implementation, project, transfer, retention, independence, or hint-related learner evidence.

## Future adapters

P2 establishes the interfaces for later adapters:

```text
Existing Mentor corpus index
        ↓
Tutor course evidence

Tree-sitter code intelligence
        ↓
TutorCodeSymbol[]

Project Lab repository evidence
        ↓
Tutor citations / explanation

Embodied task traces
        ↓
Tutor explanation
```

The Tutor Runtime itself remains independent of a specific LLM provider or vector database.

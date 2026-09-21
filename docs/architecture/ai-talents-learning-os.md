# AI Talents Learning OS — P0/P1 Core Architecture

## 1. Purpose

This document freezes the first architecture contract for the migration from the algorithm-coach product into **AI Talents Learning OS**.

The P0/P1 objective is deliberately narrow:

```text
Evidence
  ↓
Learner Model
  ↓
Adaptive Decision
  ↓
Next Task
```

No UI redesign is required for this phase.

## 2. Canonical runtime loop

```text
Observe
  ↓
Decide
  ↓
Act
  ↓
Verify
  ↓
Update
  ↺
```

- **Observe** reads structured learner evidence.
- **Decide** combines Skill Graph requirements with LearnerSkillState.
- **Act** is a teaching, practice, debugging, transfer, retest, experiment, or project action.
- **Verify** produces objective or judged evidence.
- **Update** projects the new evidence into the learner model.

## 3. Contract boundaries

### SkillNode v1

`contracts/skill-node.ts`

A SkillNode belongs to one product domain:

```text
llm
rag
agent
embodied-ai
```

A node includes prerequisites, difficulty, tags, and explicit evidence requirements.

### LearnerSkillState v1

`contracts/learner-skill-state.ts`

The state is derived from evidence. It is not a free-form LLM memory.

Primary dimensions:

```text
concept
implementation
debugging
independence
hint dependency
transfer
retention
mastery
uncertainty
```

### EvidenceEvent v1

`contracts/evidence-event.ts`

Every learning environment eventually has to produce this envelope before its result can affect the learner model.

Supported categories already include code, tests, hints, transfer, delayed retest, project verification, simulation, and robot execution.

### AdaptiveDecision v1

`contracts/adaptive-learning.ts`

The policy output is bounded to:

```text
teach
practice
debug
experiment
project
transfer
retest
```

## 4. Compatibility with the existing product

The existing canonical `LearningEvent` stream remains valid.

`packages/evidence/learning-event-adapter.ts` converts old events to EvidenceEvent records.

This is a compatibility bridge, not a destructive migration.

Legacy algorithm-learning events use `domain = legacy`; the four new AI domains stay explicit.

## 5. Evidence Store

The P1 reference store is append-only:

```text
append
appendMany
get
list
count
```

Duplicate IDs are rejected.

The first implementation is in-memory because P1 is freezing semantics before database persistence. A later Postgres adapter must preserve the same append-only contract.

## 6. Learner Model projection

`LearnerModelUpdater` is deterministic.

It projects scores from evidence rather than asking an LLM to assign mastery directly.

The first weighting is intentionally simple and inspectable. It can later be replaced by a calibrated statistical model while preserving the contract.

## 7. Adaptive Policy

The first policy is also deterministic.

Decision constraints include:

- prerequisite mastery
- required evidence dimension
- required threshold
- independence requirements
- uncertainty
- hint dependency
- goal relevance

An LLM may later generate candidate tasks, but a policy gate should remain independently testable.

## 8. RAG pilot

P1 uses a minimal Skill Graph:

```text
rag.dense-retrieval
rag.bm25
       ↓
rag.hybrid-retrieval
```

Hybrid Retrieval requires evidence for:

```text
concept
implementation
transfer
retention
independence
```

The E2E test verifies this sequence:

```text
teach
→ practice
→ transfer
→ retest
→ project
```

## 9. Future service boundaries

```text
                     AI Talents Learning OS
                              │
               Learning Supervisor + Policy
                              │
         ┌────────────────────┼───────────────────┐
         ▼                    ▼                   ▼
      Tutor                Practice           Evaluator
         │                    │                   │
         ▼                    ▼                   │
   Retrieval stack       Code runtime             │
                              │                   │
                    ┌─────────┴────────┐          │
                    ▼                  ▼          │
               Project Lab        Embodied Lab    │
                    │                  │          │
                    └─────────┬────────┘          │
                              ▼                   │
                         Evidence Bus ◄───────────┘
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
            Learner Model  Skill Graph   Memory
                 │
                 ▼
           Adaptive Policy
```

## 10. Integration rule

No external runtime can directly mutate mastery.

The rule is:

```text
External Runtime
      ↓
Evidence Adapter
      ↓
EvidenceEvent
      ↓
Evidence Store
      ↓
Learner Model Updater
```

This applies equally to Tutor RAG, Project OS, simulation, and real robots.

## 11. Trust boundaries

- Model explanations are not automatically mastery evidence.
- A passing project does not automatically mean the learner independently mastered the skill.
- Engineering quality and learner mastery remain separate.
- Evidence provenance must be preserved.
- High-assistance success should not be treated as independent success.
- Transfer and delayed retention remain stronger signals than lesson completion.

## 12. P0/P1 completion criteria

P0/P1 is considered complete when:

1. Product identity is AI Talents Learning OS at the repository/package/documentation level.
2. SkillNode v1 exists and validates.
3. LearnerSkillState v1 exists and validates.
4. EvidenceEvent v1 exists.
5. Legacy LearningEvent can adapt into EvidenceEvent.
6. Append-only Evidence Store exists.
7. Deterministic LearnerModelUpdater exists.
8. Deterministic AdaptivePolicy exists.
9. One RAG skill progresses through an E2E adaptive loop.
10. Tests and architecture documentation cover the above.



## 13. P2 Tutor Runtime

P2 adds a single evidence-gated Tutor Runtime above the P0/P1 contracts.

```text
Question
  ↓
Route
  ↓
Retrieve
  ↓
Safety Filter
  ↓
Evidence Gate
  ↓
Answer / Clarify / Refuse
  ↓
Citation + Trace
  ↓
EvidenceEvent(retrieval_trace)
```

The Tutor Runtime may observe and explain evidence, but its retrieval trace does not directly mutate mastery. Only learner-model evidence types accepted by `LearnerModelUpdater` can change the projected learner state.

This preserves a strict boundary:

```text
Tutor interaction ≠ proof of mastery
```

The detailed Tutor contract is documented in `docs/architecture/tutor-runtime.md`.

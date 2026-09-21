# AI Talents Learning OS — Project Lab Gateway (P3)

## Purpose

P3 connects learner project work to **AI Engineering Project OS** without turning the evaluator into a co-author.

The integration answers two different questions:

```text
Project OS:
Is the submitted repository technically valid?

Learning OS:
Does the evidence prove that this learner personally mastered the skill?
```

These questions must remain separate.

## End-to-end flow

```text
Learning Task
    ↓
Student Repository
    ↓
Project Lab Gateway
    ↓
Project OS import
    ↓
Project OS audit
    ↓
Read-only Project Lab assessment
    ↓
Engineering Evidence
    ↓
Learning Evidence Adapter
    ↓
Attribution Gate
    ↓
EvidenceEvent(project_verification)
    ↓
Learner Model
```

## Project OS boundary

The Project Lab HTTP client exposes only:

```text
importRepository
auditProject
assessProject
```

There is intentionally no `executeTask` or repository-modification method.

The dedicated Project OS endpoint is:

```text
POST /api/project-lab/projects/{project_id}/assess
```

The endpoint may inspect files and run test discovery / verification, but it must return:

```text
read_only = true
repository_mutated = false
```

The gateway rejects the result otherwise.

## Engineering evidence is not learner evidence

A technically correct repository is insufficient to update mastery.

The adapter first records a non-mastery `tool_trace` with:

- repository URL
- source commit
- project ID
- assessment ID
- verification status
- pass rate
- attribution decision

Only a qualified submission produces `project_verification` learner evidence.

## Attribution gate

P3 requires all of the following before project evidence can affect mastery:

1. engineering verification passed;
2. learner attribution was explicitly verified;
3. independent completion was verified;
4. AI assistance is `none` or `limited`;
5. highest hint level is at most 2.

If any condition fails, engineering evidence is preserved for auditability, but mastery evidence is withheld.

This prevents:

```text
AI-generated passing project
        ↓
automatic mastery credit
```

## Provenance

Qualified project evidence preserves:

- Project OS assessment ID
- Project OS project ID
- repository URL
- commit SHA
- attribution source
- AI-assistance level
- hint level
- optional explanation / defense score

## What P3 does not yet do

P3 does not yet provide:

- Technical Defense UI
- automatic authorship inference
- commit-level human/AI attribution
- persistent production Evidence Store
- public Evidence Passport
- rubric-specific skill mappings for every curriculum project

Those are later phases.

## Canonical files

```text
contracts/project-lab.ts
services/project-lab/project-os-client.ts
services/project-lab/gateway.ts
services/project-lab/evidence-adapter.ts
tests/project-lab-p3.test.ts
```

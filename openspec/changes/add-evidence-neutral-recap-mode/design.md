## Context

Training progress correctly resumes ordinary learners at their latest stage. Recovery review has a different intent: revisit the prerequisite explanation because the next-step rationale was unclear. Reusing resume semantics makes the recovery action technically correct but pedagogically wrong.

## Goals / Non-Goals

**Goals:** start verified recovery at explanation, identify recap mode, allow replay, and suppress duplicate achievement evidence.

**Non-Goals:** erase progress, create a second curriculum, force completion, or infer mastery from recap navigation.

## Decisions

### Recovery context selects presentation mode, not learning state

When verified recovery context exists, the cabin SHALL initialize as started at `explain`. Stored progress remains unchanged and ordinary entry continues to resume normally.

### Replay actions are evidence-neutral

Stage transitions, example runs, build completion, session completion, and transfer execution in recap mode SHALL update only live component state. They SHALL NOT emit learning signals. The learner may return at any time.

### Make the boundary visible

The recovery banner SHALL label the experience `快速复习模式` and state that replay does not create new mastery evidence.

## Risks / Trade-offs

- [A learner genuinely improves during recap] → Improvement is not credited until a later independent task; this is more honest than duplicating historical completion.
- [Signal guards drift] → Component tests exercise replay transitions with a spy and require zero calls.
- [Ordinary resume regresses] → Keep the existing persisted-stage test as a guardrail.

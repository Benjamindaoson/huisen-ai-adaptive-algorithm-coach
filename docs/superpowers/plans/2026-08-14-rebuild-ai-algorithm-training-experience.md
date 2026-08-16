# AI algorithm training experience implementation plan

> **Approval:** The user explicitly requested this direct refactor on 2026-08-14 after approving the product direction.

## Goal

Make the first ten minutes feel like an AI learning product: explain what the system knows, teach one algorithmic mental model in an immersive sequence, require an independent transfer, and return a visible growth decision.

## Scope

1. Add an evidence-bound training-session domain module and unit tests.
2. Add `#/training/:lessonId` routing and use it for the first Today mission.
3. Add a dedicated Training Cabin page with diagnosis, state visualisation, prediction, constrained code input, transfer guardrails, and a replay.
4. Extend only the necessary learning-event contract so milestones are persisted and can power the replay.
5. Add a growth-map panel to Today based on recorded evidence, not model guesses.
6. Validate with focused tests, the full suite, typecheck/lint/build, and a real-browser smoke path.

## Acceptance criteria

- A new learner can reach a named ten-minute mission from Today in one action.
- The diagnosis clearly separates observed evidence from an unknown/cold-start assumption.
- The cabin has five ordered learning actions: explanation, observable state, prediction, local coding, independent transfer.
- It does not reveal a ready-to-submit full solution before independent transfer.
- Completion records durable learning events and the learner can see what changed, what remains unverified, and why the next task is chosen.
- Existing lesson and problem routes continue to function.

## Verification

Run focused Vitest tests first, then `npm test`, `npm run lint`, `npm run typecheck`, `npm run build:web`, OpenSpec validation, and browser smoke at `http://127.0.0.1:4178/#/today`.

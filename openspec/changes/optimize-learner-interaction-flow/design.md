## Context

The current React application has a capable desktop shell, persistent Mentor runtime, project workbench, and evidence model. However, the primary learning action competes with operational evidence, the Mentor labels itself with both product and implementation language, and the mobile shell renders every learner module as a primary tab. The existing token system already supports a light learning canvas, semantic colors, and component variables; this change must preserve those foundations.

## Goals / Non-Goals

**Goals:**

- Give a learner with no evidence a visible, one-click route to a first meaningful activity.
- Make the persistent Mentor truthful and legible without displaying internal IDs by default.
- Make mobile navigation fit four user goals while retaining access to all existing modules.
- Keep evidence and methodology discoverable through progressive disclosure.
- Improve body and action typography without introducing a new design dependency.

**Non-Goals:**

- Replacing the existing React/Vite stack, runner, Mentor API, storage model, or evaluation contracts.
- Changing independent-exam assistance restrictions.
- Claiming validated learning outcomes or hiding evidence from governance users.
- Adding a generic chat interface, new model calls, or animation libraries.

## Decisions

### 1. Introduce UI-only learner action descriptors

The Insights empty state will accept an optional `onStartBaseline` callback and render a direct call to action. App supplies a selected public, runnable catalog problem. This preserves page purity and avoids inventing a new persistence state. The callback goes to the existing problem workspace, where normal opening and submission telemetry already runs.

Alternative considered: send the learner to the generic problem library. Rejected because it reintroduces choice paralysis at the exact moment a learner needs a first step.

### 2. Keep one Mentor runtime, simplify only its presentation

`MentorDock` remains the one persistent context-scoped runtime. It will expose a small presentation mapping from lifecycle state to learner wording, a concise observation/action card, and a closed `details` section for evidence references. The project workbench will rename its local label to `Mentor guidance` and state that it is the same contextual Mentor rather than a second agent.

Alternative considered: merge the problem MentorTimeline and dock code paths. Rejected for this increment because they have different runtime obligations and assessment controls; forcing a code merge risks independent-exam isolation.

### 3. Partition navigation by task frequency on mobile only

Desktop keeps its full visible rail for discoverability. On screens at or below 680px, the mobile bar will render Today, Learn, Practice, and Me (the existing Insights view). A More control opens an accessible secondary navigation tray containing Project, Review, Exam, Trust, and Quality. The current route remains visibly active in either the primary bar or More tray.

Alternative considered: horizontal scrolling all eight destinations. Rejected because it conceals choices without reducing cognitive load and makes the selected state hard to find.

### 4. Treat evidence as an explanation, not the task

Insights keeps its evidence calculations unchanged. Its learner-facing empty state provides the first action; evidence maturity and raw ledger identifiers are placed below an explicit, collapsed explanation control. This retains auditability without treating product-quality metrics as a learner's primary outcome.

### 5. Extend existing tokens instead of adding a UI kit

Add typography and spacing semantic/component tokens and apply them to action, body, and metadata text touched by this flow. This follows the repository's existing primitive → semantic → component token architecture. No component library is introduced.

## Risks / Trade-offs

- [A direct baseline problem is unavailable or not runnable] → App derives the action only from complete, runnable catalog entries; otherwise it links to the existing curated learning path.
- [More navigation hides an expected destination] → The tray contains all secondary modules and marks the current selection.
- [Simpler Mentor wording obscures trust evidence] → The evidence is still available in a named disclosure and continues to bind to the same immutable runtime artifacts.
- [Typography changes affect dense desktop layouts] → Scope font-size changes to learner explanations and actions, then verify desktop and mobile screenshots.

## Migration Plan

1. Add behavior tests for the first-action, Mentor disclosure, and mobile navigation contracts.
2. Implement the UI changes without changing backend payloads or storage schemas.
3. Run unit, type, lint, build, and browser smoke checks at desktop and mobile widths.
4. Roll back by reverting the isolated React, CSS, and OpenSpec change files; no data migration is required.

## Open Questions

- None for this increment. A later product study can determine whether project practicum should graduate into a top-level primary destination after users demonstrate repeated use.

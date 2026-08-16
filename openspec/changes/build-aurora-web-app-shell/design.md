## Context

The React application already owns the real product state and workflows: `App.tsx` loads the 754-item catalog, browser learning state, exams, pedagogical events, and Mentor OS state; hash routes select module pages; dedicated problem and exam workspaces bypass the normal shell. The approved Aurora prototype changes presentation and information architecture, not these domain contracts. The implementation must therefore compose existing modules rather than create parallel mock data or duplicate routes.

The current frontend uses a compact fixed light sidebar and a floating Mentor card. It lacks strong product hierarchy, contextual navigation, semantic navigation groups, and a consistent visual distinction between the learner workspace and the AI evidence layer. The project intentionally avoids dark content surfaces, but a dark navigation rail is acceptable because the working canvas and editor remain light.

## Goals / Non-Goals

**Goals:**

- Turn the existing SPA into a coherent desktop-first, responsive AI learning Web App.
- Make all six learner modules visibly navigable and backed by current routes and real state.
- Establish a three-layer token system and a recognizable midnight/blue/mint Aurora identity while retaining a light working canvas.
- Present Mentor OS as a persistent route-aware product layer whose state, evidence, policy, and availability are honest.
- Preserve dedicated LeetCode-style problem and exam workspaces and every current runner/exam restriction.
- Keep the implementation accessible, testable, dependency-free, and compatible with existing hash links and browser backups.

**Non-Goals:**

- Rebuilding the runner, corpus pipeline, exam grading, learning projection, or Mentor gateway.
- Introducing authentication, a database migration, server rendering, or a new router library.
- Claiming that the 0/100 teacher-adjudicated Mentor quality gate has passed.
- Converting the app to dark mode or replacing Monaco.

## Decisions

### 1. Keep hash routing and add presentation metadata instead of adopting a router dependency

`routes.ts` remains the URL contract. A centralized module metadata model will provide short labels, full labels, descriptions, sequence numbers, and icon identifiers to both desktop and mobile navigation. This makes navigation testable and prevents labels from diverging across surfaces.

Alternative considered: React Router. Rejected because the existing application has a small explicit route set, deep links already work, and a router migration would add risk without improving this phase.

### 2. Use one application shell with three persistent regions

Normal learning routes render:

1. a fixed midnight navigation rail;
2. a light route canvas with a compact context bar and module content;
3. a persistent Mentor rail that can collapse without losing its run state.

Problem and exam sessions remain dedicated workspaces. Independent exams suppress Mentor and reference affordances globally; AI collaboration exams may render Mentor alongside the exam workspace.

Alternative considered: placing Mentor as a tab inside each page. Rejected because it hides the agent, resets perceived continuity, and contradicts the approved AI-native interaction model.

### 3. Reuse real page components and pass display facts from existing state

The shell will not contain hard-coded product metrics. Catalog count, learner evidence, due reviews, mastery, recommendation reasons, exam state, and Mentor status continue to originate from existing state and domain functions. The 754 count comes from the loaded catalog, not presentation copy.

Alternative considered: port the prototype HTML wholesale. Rejected because it would create a second fake application disconnected from real workflows.

### 4. Implement the visual system with CSS variables and semantic classes

`tokens.css` will define primitive color/spacing/radius/shadow values and semantic aliases. Components will use semantic variables. The rail uses a midnight gradient; content stays white/ice; electric blue represents learner action; mint represents verified evidence/success; violet is reserved for model/agent identity. Typography uses the existing system stack and stronger scale/weight hierarchy, so no font download or dependency is needed.

Motion is limited to navigation indicator movement, card elevation, progress fills, and Mentor timeline entry emphasis. `prefers-reduced-motion` disables non-essential transitions.

### 5. Separate primary learner navigation from governance utilities

The six learner modules form the numbered primary navigation. The quality workbench remains reachable in a secondary “系统工具” area and must not compete with the learner journey. Export/import also stay in the utility footer.

### 6. Treat responsive behavior as a different composition, not a squeezed desktop

At medium widths, the Mentor becomes a floating drawer and the rail collapses to icons. At mobile widths, the desktop rail disappears, a five-action bottom navigation is used, secondary destinations remain available through an overflow/menu affordance, cards become single-column, and the problem workspace stacks vertically. Touch targets remain at least 40px.

## Risks / Trade-offs

- **[Risk] Existing `App.css` covers many mature workflows and a wholesale replacement could regress hidden states.** → Keep existing domain selectors, add the new shell/tokens incrementally, and run the full component suite plus browser smoke tests across all routes.
- **[Risk] A persistent Mentor rail can reduce usable content width.** → Use a wider desktop breakpoint, a collapsible rail, and drawer behavior below 1180px.
- **[Risk] Visual polish can accidentally introduce fake AI claims.** → Every Mentor state must distinguish Agent execution, context-only mode, local fallback, suppressed policy, and unavailable service using existing status data.
- **[Risk] Primary navigation renaming can break tests or accessibility queries.** → Centralize metadata, retain route URLs, add exact navigation tests, and use stable accessible names.
- **[Risk] The current worktree contains extensive uncommitted feature work.** → Touch only the shell, presentation components, tests, tokens, and OpenSpec artifacts; preserve all other changes.

## Migration Plan

1. Add route presentation metadata and failing navigation tests.
2. Implement the new shell structure while keeping every existing route URL and callback.
3. Extend tokens and shell/page CSS without changing domain state.
4. Recompose Today and Mentor presentation against current props.
5. Verify all module routes, problem workspace, independent exam policy, and AI collaboration layout.
6. Build the production bundle; rollback is limited to the touched frontend presentation files because no persistent data schema changes.

## Open Questions

None for this phase. The prototype approval fixes the visual direction, and the existing domain contracts fix the functional scope.

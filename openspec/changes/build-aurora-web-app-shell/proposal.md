## Why

The product already contains a 754-problem catalog, executable coding workspace, dual-mode exams, evidence-based learning flows, and Mentor OS, but those capabilities are visually fragmented and presented like a collection of pages rather than one coherent AI learning application. The approved Aurora prototype provides the missing information architecture and product identity, so it must now be implemented against the real React data and workflows.

## What Changes

- Replace the current neutral application shell with the approved light-canvas Aurora Web App shell: a persistent midnight navigation rail, route-aware top context, spacious working canvas, and persistent/collapsible Mentor surface.
- Organize the real product into six primary destinations: 今日驾驶舱, 学习中心, 题库练习, 错因复练, 算法初试, and 能力模型; retain the teacher quality workbench as a clearly separated secondary tool.
- Make every navigation destination a real route backed by current production components and data, including all 754 indexed problems.
- Recompose Today as an AI-compiled learning cockpit using real learner profile, recommendation evidence, tasks, review counts, and mastery data.
- Restyle the problem library, learning paths, review queue, exams, insights, problem workspace, and Mentor timeline into one responsive token-based visual system without replacing their domain logic.
- Preserve the LeetCode-style dedicated problem workspace, real code runner flows, independent-exam restrictions, AI-collaboration mode, local backup/import, and Mentor OS evidence contracts.
- Add responsive navigation behavior and accessible active, hover, focus, collapsed, loading, empty, and unavailable states.

## Capabilities

### New Capabilities
- `ai-learning-web-app-experience`: Defines the navigable application shell, route hierarchy, real-module integration, persistent Mentor behavior, responsive states, and unified AI-native visual language.

### Modified Capabilities

None. Existing learning, runner, exam, content, and Mentor domain contracts remain unchanged.

## Impact

- Primary frontend impact: `web/src/components/AppShell.tsx`, `web/src/components/MentorDock.tsx`, `web/src/pages/*`, `web/src/App.css`, `web/src/styles/tokens.css`, and related component tests.
- Routing remains hash-based and backward compatible with existing links and local browser state.
- No new runtime dependency is required; the design uses React, semantic HTML, CSS, and the existing application contracts.
- The content index and runner/gateway APIs are consumed as-is; no corpus rewrite, database migration, or backend API break is introduced.

# Algorithm Bridge Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first visible algorithm-bridge journey: one trusted curriculum graph, a resumable three-action entry diagnosis, evidence-based foundation/bridge placement, an explainable Today mission, and a training cabin that resumes from recorded progress.

**Architecture:** Extend the existing `algorithm-knowledge-graph`, `learner-memory`, `TodayPage`, `FoundationMap`, and `TrainingCabinPage` instead of creating a second course application. Diagnostic and plan decisions are pure projections over bounded learning events; the gateway validates the same event contract, and React surfaces render those projections without letting model text mutate placement or mastery.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Testing Library, Fastify gateway validation, existing learner event/outbox persistence.

**Spec:** `openspec/changes/build-algorithm-bridge-curriculum-journey/`

## Global Constraints

- Preserve existing `#/learn/:lessonId`, `#/training/:lessonId`, problem, exam, and practicum routes.
- Reuse the existing learner event stream; do not add another browser progress database.
- Store no source code, selected answer text, or free-form learner response in diagnostic events.
- Python remains the first teaching language; transfer tasks may keep existing multi-language behavior.
- Model output cannot directly change curriculum prerequisites, placement evidence, mastery, or readiness.
- A lesson completion does not count as independent mastery.
- Existing dirty worktree changes belong to the user; do not stage or commit overlapping application files automatically.

---

### Task 1: Build the unified algorithm bridge graph

**Files:**
- Modify: `web/src/lib/algorithm-knowledge-graph.test.ts`
- Modify: `web/src/lib/algorithm-knowledge-graph.ts`

**Interfaces:**
- Produces: `CurriculumSegment`, `CurriculumAvailability`, extended `AlgorithmKnowledgeNode`, `ALGORITHM_KNOWLEDGE_GRAPH`, `getAlgorithmKnowledgeNodeByLessonId(lessonId)`, `availableBridgeNodes()`.
- Consumes: `FOUNDATION_LESSONS`, `STARTER_ALGORITHM_LESSONS`, `OD_SKILLS`.

- [ ] **Step 1: Write failing graph tests**

Add tests that require five segments, 12 available canonical nodes, starter lesson aliases, explicit future nodes, content fingerprints, and validation errors for tampered content and unavailable nodes that pretend to be reviewed lessons.

```ts
it('unifies foundation lessons, starter aliases, and future segments', () => {
  expect(new Set(ALGORITHM_KNOWLEDGE_GRAPH.nodes.map((node) => node.segment))).toEqual(new Set([
    'program-foundation', 'problem-modeling', 'core-patterns', 'structures-search', 'integrated-transfer',
  ]));
  expect(availableBridgeNodes()).toHaveLength(12);
  expect(getAlgorithmKnowledgeNodeByLessonId('starter-array-traversal')?.id).toBe('arrays-strings');
  expect(ALGORITHM_KNOWLEDGE_GRAPH.nodes.some((node) => node.availability === 'coming-soon')).toBe(true);
});

it('rejects a node whose reviewed content changed after fingerprinting', () => {
  const node = ALGORITHM_KNOWLEDGE_GRAPH.nodes.find((item) => item.availability === 'available')!;
  const issues = validateAlgorithmKnowledgeGraph({
    ...ALGORITHM_KNOWLEDGE_GRAPH,
    nodes: ALGORITHM_KNOWLEDGE_GRAPH.nodes.map((item) => item.id === node.id ? { ...item, title: 'tampered' } : item),
  });
  expect(issues.some((issue) => issue.code === 'content-hash-mismatch')).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm --prefix web test -- src/lib/algorithm-knowledge-graph.test.ts`

Expected: FAIL because the new graph fields and selectors do not exist.

- [ ] **Step 3: Implement the minimal graph adapter**

Extend the node contract with:

```ts
type CurriculumSegment = 'program-foundation' | 'problem-modeling' | 'core-patterns' | 'structures-search' | 'integrated-transfer';
type CurriculumAvailability = 'available' | 'coming-soon';

type AlgorithmKnowledgeNode = {
  id: string;
  lessonId?: string;
  entryLessonIds: string[];
  segment: CurriculumSegment;
  availability: CurriculumAvailability;
  objective: string;
  misconceptionIds: string[];
  contentHash: string;
  // existing prerequisite, skill, visualization, stage and review fields remain
};
```

Use the 12 foundation lessons as available canonical nodes, attach the 3 starter lessons as entry aliases for arrays/hash/two-pointers, and add coming-soon metadata nodes for recursion/backtracking, trees, graphs, greedy, dynamic programming, and mixed transfer. Compute a deterministic fingerprint from all instructional contract fields and make validation recompute it.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm --prefix web test -- src/lib/algorithm-knowledge-graph.test.ts`

Expected: the graph test file passes with no warnings.

### Task 2: Add bounded entry-diagnosis events with gateway parity

**Files:**
- Modify: `web/src/lib/learner-memory.test.ts`
- Modify: `web/src/lib/learner-memory.ts`
- Modify: `services/runner/gateway/src/learning-validation.test.ts`
- Modify: `services/runner/gateway/src/learning-validation.ts`

**Interfaces:**
- Produces event kinds `bridge-diagnostic-started` and `bridge-diagnostic-step-recorded`.
- Produces bounded metadata `curriculumVersion`, `diagnosticStep`, and `correct`.
- Maintains gateway acceptance parity for existing first-minute and training events.

- [ ] **Step 1: Write failing client and gateway contract tests**

```ts
it('records diagnostic results without storing the selected answer', () => {
  const memory = recordLearningSignal(emptyLearnerMemory('learner-a'), {
    kind: 'bridge-diagnostic-step-recorded',
    data: { curriculumVersion: '1.1.0', diagnosticStep: 'state', correct: false },
  }, new Date('2026-08-14T00:00:00Z'), 'diagnostic-state');
  expect(memory.events[0].data).toEqual({ curriculumVersion: '1.1.0', diagnosticStep: 'state', correct: false });
  expect(() => parseLearnerMemory({
    ...memory,
    events: [{ ...memory.events[0], data: { ...memory.events[0].data, answer: 'private' } }],
  })).toThrow('Invalid learning event data');
});
```

Mirror the same accepted event through `validateLearningEvent`, and add a gateway regression proving `training-stage-completed` is accepted with the same semantics as the client.

- [ ] **Step 2: Run client and gateway tests and verify RED**

Run: `npm test -- web/src/lib/learner-memory.test.ts services/runner/gateway/src/learning-validation.test.ts`

Expected: FAIL because the gateway and client do not yet know the diagnostic event contract, and the gateway does not yet accept the existing training event.

- [ ] **Step 3: Implement strict symmetric validation**

Add only these diagnostic fields:

```ts
type DiagnosticStep = 'state' | 'implementation' | 'modeling';

type LearningEventData = {
  curriculumVersion?: string;
  diagnosticStep?: DiagnosticStep;
  // existing bounded fields remain
};
```

Semantics:

- `bridge-diagnostic-started` requires a semver `curriculumVersion` and no problem/attempt.
- `bridge-diagnostic-step-recorded` requires semver, one allowed diagnostic step, and a boolean `correct`.
- Neither event accepts source code, answer text, or unknown fields.
- Gateway event kinds and training/first-minute semantics mirror the client contract.

- [ ] **Step 4: Run client and gateway tests and verify GREEN**

Run: `npm test -- web/src/lib/learner-memory.test.ts services/runner/gateway/src/learning-validation.test.ts`

Expected: both files pass.

### Task 3: Derive evidence-bound placement and one bridge mission

**Files:**
- Create: `web/src/lib/bridge-journey.test.ts`
- Create: `web/src/lib/bridge-journey.ts`

**Interfaces:**
- Produces: `DiagnosticSnapshot`, `BridgePlacement`, `BridgePlan`, `deriveDiagnosticSnapshot(events)`, `buildBridgePlan(events)`, `nextBridgeTrainingLesson(events)`.
- Consumes: `LearningEvent`, `ALGORITHM_KNOWLEDGE_GRAPH`, `getFoundationLesson`.

- [ ] **Step 1: Write failing journey projection tests**

```ts
it('keeps an interrupted diagnosis resumable and honest', () => {
  const snapshot = deriveDiagnosticSnapshot([diagnosticEvent('state', true)]);
  expect(snapshot.status).toBe('incomplete');
  expect(snapshot.completedSteps).toEqual(['state']);
  expect(snapshot.uncertainty).toContain('还需要');
});

it('places syntax friction in foundations and modeling friction in the bridge runway', () => {
  expect(deriveDiagnosticSnapshot([
    diagnosticEvent('state', false), diagnosticEvent('implementation', false), diagnosticEvent('modeling', false),
  ])).toMatchObject({ status: 'complete', placement: 'foundation', entryNodeId: 'variables-state' });
  expect(deriveDiagnosticSnapshot([
    diagnosticEvent('state', true), diagnosticEvent('implementation', true), diagnosticEvent('modeling', false),
  ])).toMatchObject({ status: 'complete', placement: 'bridge', entryNodeId: 'functions-decomposition' });
});

it('builds one cited ten-minute mission', () => {
  const plan = buildBridgePlan(completeBridgeEvents);
  expect(plan.authority).toBe('event-projection');
  expect(plan.estimatedMinutes).toBe(10);
  expect(plan.evidenceRefs).toHaveLength(3);
  expect(plan.reason).toContain('建模');
});
```

- [ ] **Step 2: Run the journey test and verify RED**

Run: `npm --prefix web test -- src/lib/bridge-journey.test.ts`

Expected: FAIL because `bridge-journey.ts` does not exist.

- [ ] **Step 3: Implement deterministic projection**

Use the latest event for each diagnostic step. Placement rules:

- state incorrect → `foundation / variables-state`;
- state correct and implementation incorrect → `foundation / loops`;
- state and implementation correct, modeling incorrect → `bridge / functions-decomposition`;
- all three correct → `bridge / arrays-strings`, using `starter-array-traversal` as the ten-minute entry variant.

The snapshot includes exact event references and plain-language uncertainty. The plan includes one mission, goal, prerequisite, gain, completion criterion, confidence band, curriculum version, and the new evidence that would change it.

- [ ] **Step 4: Run the journey test and verify GREEN**

Run: `npm --prefix web test -- src/lib/bridge-journey.test.ts`

Expected: all journey projection tests pass.

### Task 4: Make the three-action diagnosis the first visible Today flow

**Files:**
- Create: `web/src/components/BridgeEntryDiagnosis.test.tsx`
- Create: `web/src/components/BridgeEntryDiagnosis.tsx`
- Modify: `web/src/pages/TodayPage.test.tsx`
- Modify: `web/src/pages/TodayPage.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/App.css`

**Interfaces:**
- `BridgeEntryDiagnosis` consumes `events`, `onSignal`, and `onStartTraining`.
- `TodayPage` gains `onLearningSignal?: (signal: LearningSignal) => void`.
- `App` passes `recordSignal` and allows the recommended foundation or starter lesson to open in Training Cabin.

- [ ] **Step 1: Write failing component and page tests**

```tsx
it('collects three bounded actions and reveals an evidence-based mission', () => {
  const onSignal = vi.fn();
  render(<BridgeEntryDiagnosis events={[]} onSignal={onSignal} onStartTraining={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '开始 3 分钟诊断' }));
  fireEvent.click(screen.getByRole('button', { name: '8' }));
  expect(onSignal).toHaveBeenCalledWith(expect.objectContaining({
    kind: 'bridge-diagnostic-step-recorded',
    data: expect.objectContaining({ diagnosticStep: 'state' }),
  }));
});
```

Add a Today test showing the diagnosis replaces the generic first task until three events exist, and then displays “目前最可能的卡点”, evidence count, uncertainty, why-now, and a single “开始 10 分钟训练” action.

- [ ] **Step 2: Run UI tests and verify RED**

Run: `npm --prefix web test -- src/components/BridgeEntryDiagnosis.test.tsx src/pages/TodayPage.test.tsx`

Expected: FAIL because the component and prop do not exist.

- [ ] **Step 3: Implement the focused diagnosis UI**

Render one action at a time:

1. predict the final value of a short state trace;
2. choose the loop that visits every item;
3. choose the information to retain for a duplicate-detection problem.

Record only step, correctness, curriculum version, event id/time supplied by the existing memory layer. After three steps, render the deterministic snapshot and bridge plan. Do not render a generic chat input or a score.

- [ ] **Step 4: Integrate Today and training navigation**

Before diagnosis completion, Today renders `BridgeEntryDiagnosis` as the primary card. After completion, it renders the plan mission with target, 10-minute duration, prerequisite, gain, reason, uncertainty, completion criterion, and CTA. Adjust the training route so an unlocked foundation lesson as well as a starter alias can use the existing `TrainingCabinPage`.

- [ ] **Step 5: Add responsive, accessible styling**

Use existing semantic tokens, minimum 14px primary body text and 12px supporting text, visible focus styles, one primary button, no dark panel, and a single-column layout below 680px.

- [ ] **Step 6: Run UI tests and verify GREEN**

Run: `npm --prefix web test -- src/components/BridgeEntryDiagnosis.test.tsx src/pages/TodayPage.test.tsx`

Expected: focused UI tests pass.

### Task 5: Resume the training cabin from recorded stage evidence

**Files:**
- Modify: `web/src/lib/ai-training.test.ts`
- Modify: `web/src/lib/ai-training.ts`
- Modify: `web/src/pages/TrainingCabinPage.test.tsx`
- Modify: `web/src/pages/TrainingCabinPage.tsx`

**Interfaces:**
- Extends `TrainingSession` with `version`, `curriculumVersion`, `nodeId`, and `progress`.
- Produces `deriveTrainingProgress(lesson, events)` with `started`, `completedStageIds`, `activeStageId`, and `transferReady`.

- [ ] **Step 1: Write failing resume tests**

```ts
it('resumes at the first unfinished stage without treating completion as mastery', () => {
  const session = buildTrainingSession(lesson, [
    event('training-session-started', 'explain'),
    event('training-stage-completed', 'explain'),
    event('training-stage-completed', 'observe'),
  ]);
  expect(session.progress).toMatchObject({ started: true, activeStageId: 'predict', transferReady: false });
});
```

Add a component test rendering persisted explain/observe events and asserting the prediction action appears immediately after mount.

- [ ] **Step 2: Run training tests and verify RED**

Run: `npm --prefix web test -- src/lib/ai-training.test.ts src/pages/TrainingCabinPage.test.tsx`

Expected: FAIL because the session has no progress contract and the component resets to explanation.

- [ ] **Step 3: Implement progress derivation and component initialization**

Derive the first unfinished stage from valid events. Initialize React state from `session.progress` on lesson change, not from a hard-coded `explain` stage. Preserve the rule that only correct prediction and build events unlock transfer; an independent accepted transfer remains a separate mastery event.

- [ ] **Step 4: Run training tests and verify GREEN**

Run: `npm --prefix web test -- src/lib/ai-training.test.ts src/pages/TrainingCabinPage.test.tsx`

Expected: focused training tests pass.

### Task 6: Replace the flat foundation map with the five-segment bridge map

**Files:**
- Modify: `web/src/components/FoundationMap.test.tsx`
- Modify: `web/src/components/FoundationMap.tsx`
- Modify: `web/src/App.css`
- Modify: `openspec/changes/build-algorithm-bridge-curriculum-journey/tasks.md`

**Interfaces:**
- Consumes `ALGORITHM_KNOWLEDGE_GRAPH`, `getAlgorithmKnowledgeNodeByLessonId`, and existing lesson progress.
- Preserves `onLearn(lessonId)` for available nodes.

- [ ] **Step 1: Write the failing map test**

```tsx
it('shows five bridge segments and honest future nodes', () => {
  render(<FoundationMap events={[]} onLearn={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '算法过桥地图' })).toBeTruthy();
  expect(screen.getByText('让程序跑起来')).toBeTruthy();
  expect(screen.getByText('把题意变成步骤')).toBeTruthy();
  expect(screen.getByText('陌生题综合迁移')).toBeTruthy();
  expect(screen.getAllByText('后续开放').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the map test and verify RED**

Run: `npm --prefix web test -- src/components/FoundationMap.test.tsx`

Expected: FAIL because the existing map has only three legacy chapters.

- [ ] **Step 3: Implement the segmented map**

Render all five graph segments. Available canonical nodes use existing lesson progress and open the canonical lesson. Coming-soon nodes remain disabled, state their missing reviewed content/transfer requirement, and never record progress. Starter aliases are mentioned as short entry training on their canonical node instead of appearing as duplicate lessons.

- [ ] **Step 4: Run the map test and verify GREEN**

Run: `npm --prefix web test -- src/components/FoundationMap.test.tsx`

Expected: the map tests pass.

- [ ] **Step 5: Run phase verification**

Run in order:

```powershell
npm test
npm run lint
npm run typecheck
npm run build:web
openspec validate build-algorithm-bridge-curriculum-journey --type change --strict --no-interactive
```

Start the existing Vite app and browser-smoke the clean-profile path: Today → three-action diagnosis → evidence result → ten-minute mission → Training Cabin → reload/resume → Learning Map.

- [ ] **Step 6: Update OpenSpec progress honestly**

Mark only fully satisfied OpenSpec tasks complete. Leave content expansion, server session persistence, remediation, mastery/retention, final assessment, and release gates unchecked until their own phases are implemented and verified.

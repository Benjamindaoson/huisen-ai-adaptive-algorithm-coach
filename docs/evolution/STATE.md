# Product Evolution State

Last updated: 2026-08-15 (Asia/Shanghai)

This is an evidence ledger, not a release narrative. Preserve failed experiments and distinguish facts, inferences, proxies, and unknowns.

## Run 0 — Durable baseline

### Operating context

- Repository `AGENTS.md`: absent. Follow the project instructions injected by the Codex environment.
- Working tree: heavily modified with many pre-existing tracked and untracked files. Preserve unrelated changes and keep every evolution diff narrow.
- Active OpenSpec changes: 4. `build-algorithm-bridge-curriculum-journey` is 7/56; `productionize-fullstack-learning-platform` is 21/55; `build-ai-native-mentor-os` is 17/18; `build-huawei-od-learning-site` is 0/16.
- Current product direction: an algorithm bridge for non-CS or weak-foundation learners, not a generic question bank and not a promise that everyone will become an AI engineer.

### Observed baseline

| Lens | Current evidence | Status |
|---|---|---|
| Business | Founder thesis and wedge research exist; no observed willingness-to-pay, activation, retention, or paid conversion dataset was found in this run. | Unknown outcome |
| Product | 754 problems are indexed. First-minute diagnosis, training cabin, Mentor, exam, practicum, and bridge-journey code exist. The bridge specification remains 49 tasks from completion. | Built surface, incomplete journey |
| UX | Repeated founder feedback says AI value is buried and the product still feels like a website/question bank. No real first-session timing or comprehension study exists. | High-priority evidence gap |
| AI quality | `npm run quality:mentor` reports 4 scored cases and 0/100 eligible real teacher-adjudicated cases; exit code 1. | Formal red gate |
| Engineering | `npm test`: 157 files, 592 tests passed. Lint, web+gateway typecheck, and web build pass. | Green technical baseline |
| Reliability | Local automated checks pass; no production SLO, error-budget, recovery, or multi-day availability evidence was collected in this run. | Unknown production baseline |
| Performance | Production build succeeds; main JS is 530.44 kB (165.62 kB gzip) and triggers the >500 kB chunk warning. No first-load or interaction latency field data exists. | Measured build warning |
| Security | No fresh threat-model, dependency, secret, auth-boundary, or sandbox escape evaluation was run in this baseline. | Unknown; do not claim ready |
| Cost | No cost per active learner, Mentor session, submission, or successful learning outcome is currently measured here. | Unknown |

### Quality-gate interpretation

- `npm run quality:golden`: exit 0 with 100 annotated candidates, but 0 content+skill verified. This proves annotation completeness, not learning-content trust.
- `npm run quality:judge`: command exits 0 while its report says `passed: false`, 0/754 gold, and 754 missing. Treat this as an advisory report, not a release gate.
- `npm run quality:mentor`: exit 1 at 0/100 eligible real cases. Preserve the red result; never replace it with seed-case success claims.

### Facts, inferences, missing evidence

Facts:

- Technical checks are currently green.
- User-facing quality and real learning outcomes have no comparable before/after dataset.
- Judge and Mentor trust coverage remain at zero by their strict definitions.

Inferences:

- The largest immediately addressable product risk is not missing page count; it is that the first session does not visibly connect learner evidence to an adaptive teaching decision.
- More navigation, cards, or agent labels will not solve this unless the learner can see what the AI observed, why the path changed, and what they can now do independently.

Missing evidence:

- Time from first open to first useful AI action.
- Whether a learner can explain why today’s task was chosen.
- Independent correction after a minimum hint.
- Hidden-transfer pass rate and 7-day return/retest rate.
- Real teacher judgment of Mentor correctness and leakage.
- Production reliability, security, latency, and unit economics.

## Ranked opportunities

Scale: impact/confidence 1–5; effort/risk 1–5 where lower is better.

| Rank | Focused outcome | Impact | Confidence | Effort | Risk | Decision |
|---:|---|---:|---:|---:|---:|---|
| 1 | Make the first minute visibly evidence-driven: the learner sees what AI inferred, why it selected the next action, and what evidence would change that decision. | 5 | 4 | 2 | 2 | KEEP in Run 1 |
| 2 | Turn the first three bridge units into complete teach→predict→code→transfer→review journeys. | 5 | 4 | 4 | 2 | Selected for next observation |
| 3 | Establish 100 real teacher-adjudicated Mentor cases and compare diagnosis/hint leakage. | 5 | 5 | 5 | 3 | Critical, but requires external adjudication work |
| 4 | Produce the first 50 trustworthy judge packs across four languages. | 4 | 4 | 5 | 3 | Important infrastructure, not the next visible change |
| 5 | Split the 530.44 kB main bundle and measure first-load improvement. | 2 | 4 | 2 | 2 | Performance follow-up |
| 6 | Add per-session AI, runner, and storage cost telemetry. | 3 | 3 | 3 | 2 | Cost follow-up |

## Active evaluation contract — first-minute AI value

Status: closed with KEEP decision in Run 1.

Hypothesis:

If the first experience visibly links learner input to an AI observation, a confidence/uncertainty statement, a reasoned training decision, and one immediate action, a new learner will perceive adaptive value sooner than in the current flow.

Target user outcome:

A first-time weak-foundation learner can say, within the first session: “The system noticed this about me, therefore it chose this task, and completing it will prove this skill.”

Baseline method:

- Run five fixed first-use journeys against the unchanged local app: no declared goal, non-CS beginner, basic Python but no algorithm skill, confident but wrong self-assessment, and returning learner with prior evidence.
- Capture screen recording or timestamped notes, route, input, visible AI evidence, recommendation reason, next action, errors, and time to the first evidence-bound action.
- Score each journey with the same rubric before and after.

Collected unchanged baseline (isolated local origins on ports 4181–4185):

| Journey | Diagnostic branch | Learner evidence visible | AI inference | Recommendation reason | Clear next action | Result time |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Program-state gap | No | Yes | Yes | Yes | 1,237 ms |
| 2 | Implementation gap | No | Yes | Yes | Yes | 1,161 ms |
| 3 | Problem-modeling gap | No | Yes | Yes | Yes | 1,251 ms |
| 4 | Stable entry actions | No | Yes | Yes | Yes | 1,239 ms |
| 5 | Returning learner after reload | No | Yes | Yes | Yes | 1,227 ms |

- Complete four-element evidence loop: 0/5.
- Result-time median: 1,237 ms under browser automation; this is a repeatable interaction proxy, not human completion time.
- Browser console errors: 0 across all five journeys.
- Persistence: the returning journey restored the result after reload.
- Root cause observed in rendered output: the result says only “基于 3 个诊断动作”; it does not expose the three observed actions and their outcomes, so the learner cannot audit what the recommendation actually used.

Primary proxy metric:

- First-minute evidence loop pass rate: journeys that show all four elements within 60 seconds — learner evidence, AI inference, reason for the selected action, and a clear next action.

Guardrails:

- No fabricated model activity or fake personalization.
- No direct answer leakage before learner effort.
- No increase in blocking steps before first action.
- No regression in the 592-test suite, lint, typecheck, build, or main route smoke test.
- Preserve unrelated working-tree changes.

Target and revert threshold:

- Target complete four-element evidence loop: 5/5, using the same five branches and rubric.
- Keep result-time median at or below 1,437 ms (baseline + 200 ms) and browser console errors at zero.
- Revert the focused product change if the pass rate is below 5/5, any displayed observation cannot be derived from persisted diagnostic events, the median exceeds 1,437 ms, or a technical guardrail regresses.

Proxy limitation:

Five scripted journeys can validate interaction coherence and prevent obvious regressions. They cannot prove retention, learning transfer, trust, or willingness to pay. Those claims require real learner and teacher data.

## Next action

Observe the unchanged first ten-minute mission end to end and measure whether explanation, prediction, constrained coding, transfer handoff, and evidence recording form one coherent learner-visible loop before choosing its smallest break to fix.

## Run 1 — Learner-readable diagnosis evidence

### Hypothesis

Showing the three bounded diagnostic observations next to the AI inference will make the first recommendation auditable without exposing answers or claiming mastery.

### Baseline

- Complete four-element evidence loop: 0/5.
- Result-time median: 1,237 ms.
- Browser console errors: 0/5 journeys.
- Inference, recommendation reason, and next action were already visible in 5/5 journeys; the missing element was specific learner evidence.

### Change

- Added deterministic `DiagnosticObservation` values to `DiagnosticSnapshot`: diagnostic step, `stable`/`needs-practice`, and immutable event reference.
- Added one compact “AI 实际使用的诊断证据” receipt to the diagnosis result.
- The receipt shows all three observed actions in ordinary Chinese and states that they arrange an entry point rather than prove mastery.
- No answer text, source code, new model call, dependency, API, storage field, or mastery rule was added.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Complete evidence loop | 0/5 | 5/5 | Target met |
| Result-time median | 1,237 ms | 1,324 ms | +87 ms; below 1,437 ms guardrail |
| Browser console errors | 0 | 0 | No regression |
| Reload restores diagnosis result | Yes | Yes | No regression |
| Focused tests | 6 passing before new contract | 9/9 passing | RED observed, then GREEN |
| Full tests | 592/592 | 594/594 | No regression |
| Mentor seed benchmark | 12 fixtures at 100% misconception/line | Same | No regression |
| Mentor real-case gate | 0/100, red | 0/100, red | Honest gate preserved |
| Production dependency audit | Not run in Run 0 | root/web/gateway: 0 vulnerabilities | No detected production dependency issue |

- Lint, web+gateway typecheck, and production web build pass.
- Main JS: 530.44 kB → 531.49 kB (+1.05 kB); gzip 165.62 kB → 165.89 kB (+0.27 kB).
- CSS: 141.28 kB → 142.32 kB (+1.04 kB); gzip 25.30 kB → 25.56 kB (+0.26 kB).
- The in-app browser viewport override did not produce a real 390 px layout, so this run does not claim a real mobile-width browser check. Existing responsive CSS and component tests passed, but that is weaker evidence.

### Decision

KEEP. The primary proxy improved from 0/5 to 5/5, the measured interaction median stayed inside the registered threshold, technical and AI regression gates held, and every displayed observation is projected from bounded diagnostic events.

### Discovered problems

- The evidence receipt improves auditability but does not prove that learners understand the recommendation; real comprehension data remains absent.
- The first ten-minute mission has not yet been measured as a full teach→predict→code→transfer journey.
- The main bundle remains over 500 kB and grew slightly in this run.
- Real mobile-width browser verification still needs a working viewport surface or external device test.
- Mentor teacher-adjudicated evidence remains 0/100 and judge-pack coverage remains 0/754.

### Next candidates

1. Observe the first recommended ten-minute mission and fix the highest-friction learner-visible break in its five-stage loop.
2. Split the main bundle if first-load measurement confirms it materially delays the first action.
3. Run real recommendation-comprehension sessions and teacher adjudication; do not replace them with scripted proxies.

## Active evaluation contract — diagnosis-to-training continuity

Status: closed with KEEP decision in Run 2.

Hypothesis:

If the first training screen explicitly carries forward the completed entrance diagnosis, the learner will experience one continuous adaptive lesson instead of a generic training page that appears to forget what the AI just observed.

Target user outcome:

After selecting the recommended ten-minute mission, a learner can immediately answer: “This lesson continues my entrance diagnosis; these were the observed actions; this is why this lesson was chosen; and this part is still uncertain.”

Unchanged baseline:

- Browser journey: the stable-entry branch reaches `#/training/starter-array-traversal`, but the top banner resets to “AI 从这里开始认识你” and “目前还没有可用的同技能学习记录”.
- Source inspection: `deriveTrainingDiagnosis` ignores `bridge-diagnostic-step-recorded` events, so all four completed entrance-diagnosis branches fall through to the same generic baseline when no same-skill attempt exists.
- Complete handoff pass rate: 0/5 fixed journeys (program-state gap, implementation gap, modeling gap, stable entry actions, and stable returning/reload).
- No false-mastery claim: 5/5.
- Browser console errors in the observed journey: 0.

Primary proxy metric:

- Diagnosis-to-training continuity pass rate. A journey passes only when the first training screen visibly contains all of: entrance-diagnosis source, the three bounded observations, the selected-lesson reason, the remaining uncertainty, and an explicit statement that this is not mastery evidence.

Guardrails:

- A handoff may appear only when the event-projected bridge plan selects the currently open lesson.
- Same-skill attempt, hint-dependence, transfer, and delayed evidence remain more authoritative than entrance-diagnosis evidence.
- Every displayed observation and evidence reference must be derived from persisted events; no model-authored learner claim.
- No answer leakage, extra blocking step, dependency, storage schema, or mastery-score change.
- Full test, lint, typecheck, build, Mentor seed benchmark, and honest real-case gate behavior must not regress.

Target and revert threshold:

- Target complete handoff: 5/5 fixed branches; false-mastery claims: 0/5; browser console errors: 0.
- Revert if any branch displays a handoff for a lesson not selected by its event-projected plan, if same-skill evidence is overwritten, or if a technical guardrail regresses.

Proxy limitation:

This proves deterministic context continuity and rendered clarity, not that a human learner understands, trusts, retains, or benefits from the recommendation. Those outcomes still require observed learner sessions and later transfer evidence.

## Run 2 — Evidence-bound diagnosis handoff

### Hypothesis

Carrying the entrance diagnosis into the selected training lesson will remove the visible “AI forgot me” reset while preserving stricter same-skill evidence and honest mastery boundaries.

### Baseline

- Complete handoff: 0/5 fixed journeys.
- The rendered stable branch said “AI 从这里开始认识你” immediately after the AI had already displayed three entrance observations.
- `deriveTrainingDiagnosis` did not read entrance-diagnosis events.

### Change

- Added an `entry-handoff` training diagnosis projected only when the completed bridge plan selects the currently open lesson.
- Reused the same bounded observation vocabulary on both diagnosis and training surfaces.
- The training banner now shows the entrance source, all three persisted observations, recommendation reason, uncertainty, and the statement that the observations arrange a starting point rather than prove mastery.
- Existing same-skill failed attempts, assisted passes, and verified transfers remain higher-authority diagnosis inputs.
- No model call, answer, score, dependency, storage schema, or mastery update was added.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Complete diagnosis→training handoff | 0/5 | 5/5 | Target met |
| False mastery claim | 0/5 | 0/5 | Guardrail held |
| Wrong-lesson handoff | Not prevented by a contract | 0 in focused contract tests | Guardrail held |
| Same-skill evidence precedence | Existing behavior | Preserved by regression test | Guardrail held |
| Browser console errors | 0 | 0 | No regression |
| Reload keeps the handoff | Not applicable | Yes | Persisted events replay correctly |
| Focused tests | 15 tests, 5 intentionally RED | 24/24 passing | RED observed, then GREEN |
| Full tests | 594/594 | 601/601 | No regression |

- Four distinct diagnostic branches pass deterministic handoff tests; the fifth returning journey passed a real browser reload check.
- The browser-rendered stable branch visibly contained all five required elements and was visually inspected in the compact in-app viewport.
- Lint, web+gateway typecheck, production web build, and `git diff --check` pass.
- Mentor seed benchmark remains 12 fixtures at 100% misconception/line.
- Mentor real-case gate remains honestly red at 0/100 eligible teacher-adjudicated cases.
- Main JS: 531.49 kB → 532.58 kB (+1.09 kB); gzip 165.89 kB → 166.08 kB (+0.19 kB).
- CSS: 142.32 kB → 143.18 kB (+0.86 kB); gzip 25.56 kB → 25.73 kB (+0.17 kB).
- A route-transition timing sample was contaminated by hot-module reload and is not reported as a performance improvement.

### Decision

KEEP. The context-continuity proxy improved from 0/5 to 5/5, all registered truthfulness and precedence guardrails held, and technical gates did not regress.

### Learned

- The five teaching stages are coherent once entered, but the user currently clicks “开始 10 分钟训练” on the diagnosis result and then must click a second “开始我的 10 分钟训练” button in the training cabin. This is the next clearest first-session break.
- The banner now explains the decision, but no human comprehension study has yet shown that a learner can repeat the reason in their own words.
- The bundle warning grew again; visible first-session work should stop adding weight without a later code-splitting pass.

### Next highest-value opportunity

Remove the duplicate start gate for a diagnosis-selected mission while recording exactly one `training-session-started` event, then compare diagnosis-result-to-first-teaching-action clicks before and after. Preserve a deliberate start button for cold entry from unrelated routes.

## Active evaluation contract — one-click teaching start

Status: closed with KEEP decision in Run 3.

Hypothesis:

If a diagnosis-selected mission opens directly at its first teaching action, the learner will experience the diagnosis button as the real start of training instead of encountering a redundant second gate.

Unchanged baseline:

- From a completed diagnosis result, reaching the first explanation requires two clicks: “开始 10 分钟训练”, then “开始我的 10 分钟训练”.
- Browser inspection after the first click confirms that the training cabin renders the second start button and does not yet render stage 1.
- Direct cold entry to a training route also requires one explicit start click; this is intentional and must remain.

Primary proxy metric:

- Diagnosis-result-to-first-teaching-action clicks: 2 before, target 1 after.

Guardrails:

- Auto-entry is allowed only for a lesson selected by the completed event-projected entrance diagnosis.
- Exactly one `training-session-started` event is emitted for that lesson; rerenders and reloads must not create duplicates.
- Direct cold entry, wrong-lesson entry, and sessions with more authoritative same-skill evidence keep their explicit start behavior.
- No answer leakage, mastery update, new dependency, route flag, or storage schema change.
- Browser errors and full technical/AI quality gates must not regress.

Revert threshold:

- Revert if the selected journey still needs more than one click, if any non-selected/cold lesson auto-starts, if duplicate start events are observed, or if a technical guardrail regresses.

Proxy limitation:

Reducing one redundant click measures interaction continuity, not learning efficacy. Independent transfer and observed learner comprehension remain the outcome measures.

## Run 3 — One-click entry into recommended teaching

### Hypothesis

Treating the diagnosis mission button as the actual start of its selected lesson will remove a redundant gate without auto-starting unrelated training routes.

### Baseline

- Diagnosis result to stage 1: 2 clicks.
- After click 1, the training cabin rendered another start button and no stage content.
- Direct cold route: 1 intentional start click.

### Change

- A training session whose current lesson exactly matches an `entry-handoff` now renders stage 1 immediately and emits one `training-session-started` event.
- A per-lesson ref prevents rerender duplicates; persisted start evidence prevents reload duplicates.
- Cold and wrong-lesson routes retain the explicit start button.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Diagnosis result → stage 1 clicks | 2 | 1 | Target met |
| Duplicate start signal on rerender | Not covered | 0 | Guardrail held |
| Duplicate start signal with persisted event | Not covered | 0 | Guardrail held |
| Cold direct route explicit start | Yes | Yes | Guardrail held |
| Browser reload resumes stage 1 | Not applicable | Yes | Guardrail held |
| Browser console errors | 0 | 0 | No regression |
| Focused tests | 1 new contract test RED | 16/16 passing | RED observed, then GREEN |
| Full tests | 601/601 | 602/602 | No regression |

- Real-browser modeling-gap journey opened `functions-decomposition` and displayed stage 1 after the single diagnosis-result click; the second gate was absent.
- A fresh local origin on port 4201 confirmed that direct cold entry still displayed the explicit start button and hid stage 1.
- Lint, web+gateway typecheck, build, and `git diff --check` pass.
- Mentor seed benchmark remains green; the real-case gate remains honestly red at 0/100.
- Main JS: 532.58 kB → 532.84 kB (+0.26 kB); gzip 166.08 kB → 166.10 kB (+0.02 kB). CSS is unchanged at 143.18 kB.

### Decision

KEEP. The selected journey now reaches teaching in one click, cold-route behavior is unchanged, and the event contract prevents rerender/reload duplication.

### Learned

- The duplicate button is gone, but the desktop screenshot shows the expanded diagnosis handoff and mission summary consuming most of the first viewport. Stage 1 exists but begins below the fold, so the learner still does not visually land inside the teaching action.
- Route-transition timing samples remained contaminated by development hot reload and are not reported as performance evidence.

### Next highest-value opportunity

When a recommended session has started, compress its evidence handoff into a readable one-line/expandable receipt and make the active teaching stage the visual focus above the fold. Preserve the full evidence detail on demand and in the pre-start cold state.

## Active evaluation contract — teaching-first viewport

Status: closed with KEEP decision in Run 4.

Hypothesis:

If the completed diagnosis becomes a compact expandable receipt after training starts, the first viewport can foreground the active teaching action without hiding why the AI chose it.

Unchanged baseline:

- Desktop in-app screenshot after one-click entry: the expanded diagnosis and mission summary occupy the first viewport; the active stage rail is only partly visible and the stage 1 teaching content is below the fold.
- Full diagnosis source, observations, reason, uncertainty, and mastery boundary are visible without interaction.

Primary proxy metric:

- Teaching-first viewport pass: the unchanged desktop viewport screenshot must visibly include the active stage kicker and the beginning of its instructional content without scrolling. Baseline: fail.

Guardrails:

- Diagnosis source, all three event-projected observations, recommendation reason, uncertainty, and mastery boundary remain available in one explicit disclosure action.
- The disclosure uses native accessible semantics and remains keyboard operable.
- Cold/pre-start training retains the expanded diagnosis and explicit start action.
- No event, AI, mastery, route, storage, or dependency behavior changes.
- Full browser and technical/AI quality gates must not regress.

Revert threshold:

- Revert if stage 1 still begins below the tested first viewport, if any evidence element becomes unavailable, if cold entry is compressed, or if a technical guardrail regresses.

Proxy limitation:

Above-the-fold visibility is a presentation proxy. It does not prove attention, comprehension, or transfer and must not be reported as learning impact.

## Run 4 — Teaching-first active viewport

### Hypothesis

Compressing completed entrance evidence only after the selected lesson starts will make the teaching action the visual focus while keeping the decision auditable on demand.

### Baseline

- First desktop viewport after selected entry: active stage content below the fold.
- Diagnosis evidence: fully visible, not collapsible.
- Cold route: expanded baseline diagnosis and explicit start.

### Change

- Started `entry-handoff` sessions now render a compact diagnosis receipt and compact mission summary.
- The receipt uses native `details`/`summary`; one disclosure reveals the source, three observations, mastery boundary, and uncertainty in a light overlay.
- The active five-stage rail and teaching stage remain unchanged.
- Cold/pre-start sessions keep the expanded diagnosis and explicit start.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Active teaching visible in first desktop viewport | No | Yes | Target met |
| Full evidence available in one disclosure | Already visible | Yes | Guardrail held |
| Cold route remains expanded | Yes | Yes | Guardrail held |
| Browser console errors | 0 | 0 | No regression |
| Focused component contract | 1 assertion group RED | 5/5 tests GREEN | RED observed, then GREEN |
| Full tests | 602/602 | 602/602 | No regression |

- Before/after screenshots used the same in-app desktop viewport. After the change, the first view visibly includes the stage kicker, title, analogy, and opening explanation without scroll.
- Browser disclosure test confirmed all three observations, evidence source, mastery boundary, and branch-specific uncertainty become visible after one click.
- Fresh cold-origin test still shows the explicit start button and expanded no-evidence baseline, with no compact disclosure.
- Lint, web+gateway typecheck, production web build, and `git diff --check` pass.
- Mentor seed benchmark remains green; real teacher-case gate remains honestly red at 0/100.
- Main JS: 532.84 kB → 533.28 kB (+0.44 kB); gzip 166.10 kB → 166.20 kB (+0.10 kB).
- CSS: 143.18 kB → 144.57 kB (+1.39 kB); gzip 25.73 kB → 25.99 kB (+0.26 kB).

### Decision

KEEP. The teaching-first viewport proxy changed from fail to pass while the evidence, cold-entry, accessibility-semantic, and technical guardrails held.

### Learned

- The visible first-session story is now continuous: observed actions → reasoned mission → one-click entry → active instruction, with evidence still auditable.
- Each visible improvement has slightly increased the already oversized main bundle. The next internally actionable opportunity should reduce load cost before adding another surface.
- Human comprehension, independent correction, hidden transfer, and seven-day return remain unmeasured outcomes; UI proxies cannot substitute for them.

### Next highest-value opportunity

Measure module weight and first-load behavior, then split the training/quality/exam/practicum route surfaces if route-level lazy loading can reduce the initial bundle without delaying the first diagnosis. Use the production chunk sizes as the registered before/after metric and preserve all browser journeys.

## Active evaluation contract — initial route bundle

Status: closed with KEEP decision in Run 5.

Hypothesis:

If non-Today route components load on demand, the first visit can download materially less JavaScript without changing the first diagnosis or any route behavior.

Unchanged baseline:

- Production build emits one application JS asset: 533.28 kB, 166.20 kB gzip.
- Vite emits the >500 kB chunk warning.
- Today and all other page/workspace components are statically imported by `App.tsx`.

Primary metric:

- Initial application JS asset size. Target: at least 15% smaller than 533.28 kB (≤453.29 kB) and no >500 kB initial chunk warning.

Guardrails:

- Today and the first entrance diagnosis remain eager and show no route-loading fallback on first render.
- Lazy routes keep the app shell and show a readable, non-technical loading state.
- Diagnosis → recommended training, cold training, problem, exam, practicum, quality, and learning routes remain reachable.
- No new dependency or feature behavior change.
- Full tests, lint, typecheck, browser smoke, Mentor seed, and honest real-case gate behavior remain unchanged.

Revert threshold:

- Revert if the initial asset shrinks by less than 10%, if Today suspends, if any primary route fails to resolve, or if technical/browser guardrails regress.

Proxy limitation:

Bundle bytes are not field performance. This run may claim less initial JavaScript, not a measured improvement in LCP, INP, or completion time without production telemetry.

## Run 5 — Route-level initial bundle reduction

### Hypothesis

Loading non-Today route surfaces on demand will cut initial JavaScript by at least 15% while leaving the first diagnosis eager and every route reachable.

### Baseline

- Initial application JS: 533.28 kB, 166.20 kB gzip.
- One application asset and a >500 kB build warning.
- All page/workspace components statically imported.

### Change

- Added a reusable Suspense boundary with a learner-readable loading state that preserves the app shell.
- Converted problem, lesson, training, exam, practicum, quality, insights, trust, paths, problems, and review surfaces to route-level dynamic imports.
- Kept Today and its entrance diagnosis eager.
- Added no dependency and changed no domain behavior.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Initial application JS | 533.28 kB | 381.86 kB | −151.42 kB / −28.4% |
| Initial JS gzip | 166.20 kB | 122.02 kB | −44.18 kB / −26.6% |
| >500 kB warning | Yes | No | Removed |
| On-demand JS chunks | 0 | 17 | Route code no longer paid on first visit |
| Route-boundary test | Missing module RED | 1/1 GREEN | RED observed, then GREEN |
| Full tests | 602/602 | 603/603 | No regression |

- Real browser smoke resolved 12 primary routes: Today, problems, paths, review, exam, insights, quality, trust, practicum, lesson, training, and problem workspace.
- Today resolved without the route fallback; every lazy route removed the fallback after resolution.
- Problem workspace resolved its actual problem heading and code editor, not merely the outer top bar.
- Browser console errors: 0.
- Lint, web+gateway typecheck, production build, and `git diff --check` pass.
- Mentor seed benchmark remains green; real teacher-case gate remains honestly red at 0/100.
- CSS increased from 144.57 kB to 145.55 kB (+0.98 kB; gzip +0.15 kB) for the shared loading state.

### Decision

KEEP. The initial asset is 28.4% smaller, exceeds the registered 15% target, removes the build warning, keeps Today eager, and preserves all tested routes and quality gates.

### Learned

- Large user-perceived wins can come from removing work rather than adding visible UI.
- The initial chunk is still 381.86 kB; field metrics remain unknown and future route modules should stay lazy by default.
- The end of the teaching loop still needs a learner-visible handoff: an independent transfer pass is recorded, but the problem workspace has no persistent “验证通过 → 下一步” completion surface once independent mode closes.

### Next highest-value opportunity

Make independent transfer completion explicit in the problem workspace: bind it to the accepted attempt and lesson, show what was proven and what was not, and offer a clear return to the training map. Do not turn a single transfer pass into a long-term mastery claim.

## Active evaluation contract — transfer completion receipt

Status: closed with KEEP decision in Run 6.

Hypothesis:

If an accepted independent transfer submission produces a persistent evidence-bound receipt, the learner can understand what the pass proved, what remains unproven, and where to continue instead of falling back into an ordinary problem page.

Unchanged baseline:

- `lesson-transfer-passed` can be generated and stored with a lesson, problem, and attempt.
- The problem workspace has an “独立验证模式” banner while the transfer is active.
- Once a transfer pass closes active mode, there is no persistent completion receipt or “查看下一步” action in `ProblemReader`. Complete learner-visible closure: 0/1.
- A real local browser submission on the isolated port could not reach a pass because the runner service was unavailable; it correctly showed “服务不可用” and retained independent mode. This is not counted as a successful transfer baseline.

Primary proxy metric:

- Transfer closure pass: a bound completed event must render all of: verified action, exact attempt reference, lesson/skill context, explicit non-mastery boundary, and one next-step action. Baseline: 0/1; target: 1/1.

Guardrails:

- A receipt requires a matching `lesson-transfer-started` event followed by an unassisted correct `lesson-transfer-passed` event for the same lesson and problem.
- Failed, assisted, unbound, malformed, and still-pending transfers never show success.
- The receipt says “this transfer was verified”, never “long-term mastery”.
- Existing independent mode keeps Mentor, hints, and reference answers closed until a valid pass.
- No new dependency, score, mastery projection, or storage schema.
- Full browser and technical/AI quality gates must not regress.

Revert threshold:

- Revert if an unbound event can render success, if the attempt reference is absent, if the UI claims mastery, if independent restrictions lift before a pass, or if technical guardrails regress.

Proxy limitation:

The component and event contract prove truthful closure behavior. A real end-to-end accepted submission still requires an available runner and should not be claimed from the unavailable-runner browser attempt.

## Run 6 — Evidence-bound transfer completion

### Hypothesis

A persistent receipt bound to the transfer start and accepted attempt will make the end of the five-stage lesson understandable without promoting a single pass to long-term mastery.

### Baseline

- Active transfer mode visibly closes Mentor, hints, and references.
- A completed transfer event could update projections, but `ProblemReader` had no persistent success receipt or next action.
- Complete closure rubric: 0/1.

### Change

- Added a deterministic `verifiedTransferReceiptForProblem` projection requiring a matching start, same problem/lesson, correct unassisted pass, and attempt ID.
- Added a light completion receipt in the problem reader with lesson context, exact attempt ID, evidence references, timestamp, non-mastery boundary, and “查看下一步”.
- Wired the next action back to Today, where the event-projected plan and delayed-review system can choose the next step.
- Added no score, mastery mutation, model call, dependency, or storage field.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Complete learner-visible closure | 0/1 | 1/1 | Target met in event/component contract |
| Unbound pass can show success | Possible UI not present | No | Guardrail held |
| Assisted pass can show success | Possible UI not present | No | Guardrail held |
| Failed browser attempt shows success | No | No | Guardrail held |
| Focused tests | 2 tests RED | 12/12 GREEN | RED observed, then GREEN |
| Full tests | 603/603 | 605/605 | No regression |

- The receipt component exposes all registered elements and its next-step action is tested.
- Real browser failure path remained in “独立验证模式”, showed no success receipt, and kept references/Mentor closed.
- The isolated browser port had no live runner; the attempted sample submit correctly returned “服务不可用”. Therefore this run does not claim a real end-to-end browser pass.
- Lint, web+gateway typecheck, production build, and `git diff --check` pass.
- Mentor seed benchmark remains green; real teacher-case gate remains honestly red at 0/100.
- Initial JS: 381.86 kB → 382.84 kB (+0.98 kB; gzip +0.21 kB). The lazy ProblemReader chunk grew 52.34 kB → 53.29 kB (+0.95 kB; gzip +0.28 kB).
- CSS: 145.55 kB → 147.21 kB (+1.66 kB; gzip +0.37 kB).

### Decision

KEEP. The closure contract moves from 0/1 to 1/1, false-positive paths are rejected, and the failure browser path remains honest. End-to-end success remains explicitly unverified until the runner is available.

### Learned

- The user journey is now visibly connected from diagnosis through teaching and transfer completion, but local execution availability is the next hard dependency.
- On the isolated development origins, no backend port was listening on 8787/2358; a correct-looking transfer solution could not be judged. The UI reported this honestly, but the core learning outcome could not complete.
- This is now higher value than another frontend refinement because code execution is required for prediction, debugging, transfer, and Mentor evidence.

### Next highest-value opportunity

Make the documented local backend path reproducible and observable: verify Docker/Compose prerequisites, validate environment configuration, start the production-like stack when available, run health and representative JavaScript/Python submissions, and make the frontend report a specific recovery action when the runner is offline. Do not replace unavailable execution with fake success.

## Active evaluation contract — reproducible local execution

Status: closed with KEEP decision in Run 7.

Hypothesis:

If the documented production-like stack can be started from the repository and proves health plus representative JavaScript and Python execution, the core learning loop can complete locally instead of ending at an infrastructure-shaped “service unavailable” result.

Observed baseline:

- Docker CLI 29.6.1 and Compose v5.3.0 are installed, but the Docker Desktop Linux engine is not running.
- `npm run stack:config` renders all seven required services and passes the Judge0 isolation contract.
- `services/runner/.env` exists; no secret values were printed.
- Ports 8787, 2358, 5432, and 6379 have no listeners.
- Backend readiness rubric: gateway health 0/1, JavaScript execution 0/1, Python execution 0/1 — total 0/3.
- A real browser submission correctly failed closed, retained the learner's code, and did not produce a false transfer pass, but its recovery message was not actionable.

Primary metric:

- Production-like local execution readiness. Target: 3/3 — gateway health succeeds, JavaScript prints the expected result, and Python prints the expected result through the public gateway contract.

Secondary learner recovery metric:

- When an already-configured runner becomes unavailable, the result panel must state that the code is retained, distinguish retryable connection/service failure from missing deployment configuration, and provide one visible retry action. Baseline: retained-code statement 0/1, failure distinction 0/1, retry action 0/1 — total 0/3; target 3/3.

Local frontend handoff metric:

- A normal `npm run dev` currently requires three manual PowerShell environment assignments before it can reach the local gateway. Baseline: 0/1 zero-secret development defaults; target: 1/1 through a source-controlled loopback-only Vite development environment, while production remains explicitly configured.

Guardrails:

- Judge0 remains isolated behind the gateway; the browser never receives Judge0 credentials or a direct Judge0 URL.
- Source code is never sent when no private runner URL is configured.
- A runner outage never becomes a wrong-answer diagnosis, a mastery update, or a transfer pass.
- Secrets are neither logged nor copied into source-controlled files.
- Existing tests, lint, typecheck, production build, browser journeys, and Mentor quality gates do not regress.

Revert/stop threshold:

- Stop stack startup rather than weaken isolation, health checks, or authentication when the local Docker engine cannot become ready.
- Revert any product code that makes an unavailable service look successful or exposes developer-only infrastructure details to learners.

Measurement limitation:

Passing the local production-like smoke proves developer reproducibility and the gateway execution contract, not production SLO, capacity, regional latency, disaster recovery, or security certification.

## Run 7 — Reproducible full-stack execution and honest recovery

### Hypothesis

A repository-owned loopback development configuration plus a recoverable outage state will turn code execution from an undocumented manual dependency into a reproducible learner workflow without weakening Judge0 isolation.

### Baseline

- Docker CLI and Compose were installed, but the Docker Desktop engine was stopped.
- No service listened on gateway, Judge0, PostgreSQL, or Redis ports.
- Backend readiness was 0/3: no health response, JavaScript result, or Python result.
- Local Vite required three manual environment assignments; its normal default origin was not in the gateway allowlist.
- A retryable outage displayed only a connection error. Learner recovery rubric: 0/3.

### Change

- Started Docker Desktop and the repository's seven-service production-like stack without changing secrets or publishing Judge0, PostgreSQL, or Redis to the host.
- Added loopback-only public development endpoints in `web/.env.development`; production remains explicitly configured.
- Made Vite's default development origin `127.0.0.1:4178`, which is already part of the gateway's explicit CORS contract.
- Classified unavailable runs as missing configuration, service error, or network error.
- Replaced the generic outage result with an honest recovery surface: code-retention statement, no correctness judgment, one-click reconnect for retryable outages, and collapsed connection detail.
- Added interaction and configuration regression tests; no dependency or credential was added.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Gateway health | 0/1 | 1/1 | Ready |
| JavaScript gateway execution | 0/1 | 1/1 | `42`, 333 ms API probe |
| Python gateway execution | 0/1 | 1/1 | `42`, 173 ms API probe |
| Learner outage recovery rubric | 0/3 | 3/3 | Retention, distinction, retry |
| Zero-secret local frontend handoff | 0/1 | 1/1 | Loopback dev defaults + allowlisted port |
| Full tests | 605/605 | 607/607 | No regression |

- `npm run stack:config` reports all seven required services and a passing Judge0 isolation contract.
- `npm run stack:smoke` reports PostgreSQL learning storage, account identity, object store, and runner ready; Mentor remains honestly `experimental`, so overall capability status remains `degraded`.
- A real browser run on the allowed development origin executed `console.log(42)` through the gateway in 43 ms, displayed standard output `42`, recorded the attempt, and bound the Mentor to the exact attempt.
- The same browser flow on a deliberately non-allowlisted origin was rejected by CORS and displayed the 3/3 recovery surface; it did not produce a correctness, transfer, or mastery event.
- Browser console errors on the successful flow: 0.
- Durable authenticated hidden submission passed 2/2 hidden tests. Judge containment probes pass and Judge0 remains unpublished to the host.
- Lint, web+gateway typecheck, production build, golden content gate, Mentor seed gate, and `git diff --check` pass.
- Formal Mentor v2 gate remains correctly red: 0/100 eligible real teacher-adjudicated cases.
- Initial JS: 382.84 kB → 382.94 kB (+0.10 kB; gzip +0.03 kB). Lazy ProblemReader: 53.29 kB → 54.15 kB (+0.86 kB; gzip +0.22 kB).
- CSS: 147.21 kB → 147.86 kB (+0.65 kB; gzip +0.10 kB).

### Decision

KEEP. The primary backend rubric moves from 0/3 to 3/3, the learner recovery rubric moves from 0/3 to 3/3, normal local development needs no manual public endpoint exports, and the real browser execution path succeeds without weakening containment.

### Learned

- API health alone was insufficient: a non-allowlisted frontend origin still failed in the browser. The evaluation needed both a direct gateway probe and a rendered cross-origin user flow.
- Keeping the CORS failure was correct. Reproducibility was achieved by aligning the documented/default frontend origin, not by accepting arbitrary origins.
- The successful screen now exposes the next highest-value gap: despite a healthy gateway and configured model, the learner-visible Mentor reports “当前使用本地规则分析”. The product is executable, but its claimed AI differentiation is not yet consistently reaching the user.

### Next highest-value opportunity

Diagnose why a real, gateway-backed submission falls back to local Mentor rules despite the backend reporting an experimental DeepSeek model. Establish a measured dynamic-Agent rubric covering remote session creation, tool evidence, model/fallback disclosure, and a bounded teaching action; fix only the smallest verified cause. Never relabel deterministic rules as model output.

## Active evaluation contract — learner-visible dynamic Mentor

Status: closed with KEEP decision in Run 8.

Hypothesis:

If the Mentor uses the provider's non-reasoning tool-call route for orchestration, it can choose evidence tools and reach a bounded teaching action inside the learner's request budget instead of timing out and falling back to deterministic rules.

Observed baseline:

- A successful browser execution creates a remote Mentor session and binds the exact attempt.
- The final visible session says “当前使用本地规则分析” and contains an honest rejected event: “模型请求未完成，已切换确定性工具 — The operation was aborted due to timeout”.
- The configured `deepseek-v4-flash` route takes 12,534 ms for the first realistic tool decision, produces 1,315 completion tokens, and exceeds the provider's hard 8,000 ms request budget.
- A same-network minimal completion succeeds in about one second, so credentials, DNS, and provider reachability are not the cause.
- A controlled `deepseek-chat` alias probe returns two valid tool calls in 1,302 ms and 107 completion tokens. The provider reports the resolved backend model as `deepseek-v4-flash`; this is a routing/interaction-mode change, not a claim that the underlying model family changed.
- Dynamic Mentor rubric: remote attempt-bound session 1/1; session remains model mode 0/1; provider usage recorded 0/1; model-selected evidence tools 0/1; bounded teaching action 1/1 — total 2/5.

Primary metric:

- Dynamic Mentor rubric target: 5/5 in a fresh real browser submission, with session mode `deepseek`, positive provider call/token usage, model-selected tool executions carrying evidence references, and one learner-facing prediction/edit action, all returned before the 25-second browser request budget.

Secondary efficiency metrics:

- First tool decision latency and completion tokens. Target: p50 cannot be established from one live probe; for this run, require the verified fresh flow to finish under 15 seconds and avoid the previous 1,315-token first-decision baseline.

Guardrails:

- Deterministic judge results remain authoritative.
- Timeout, invalid tool calls, unsafe actions, or provider failure still fall back visibly and never masquerade as model output.
- Hidden tests and reference solutions never enter model context.
- Model-selected tools must pass the existing schema, repeat budget, evidence, and stop-policy enforcement.
- Secrets remain server-only and absent from logs, browser bundles, and committed environment files.
- Formal Mentor quality remains gated by real teacher adjudication; a successful runtime call is not evidence of pedagogical accuracy.

Revert threshold:

- Revert if the fresh browser session still falls back, exceeds 25 seconds, loses evidence references, leaks an answer, weakens deterministic fallback, or regresses technical/quality gates.

Measurement limitation:

One fresh real call proves runtime reachability and visible dynamic behavior, not latency distribution, teaching effectiveness, transfer lift, or provider reliability at scale.

## Run 8 — Dynamic Mentor route and visible AI decision receipt

### Hypothesis

Using the provider's non-reasoning tool orchestration route will keep model-selected evidence gathering inside the learner request budget and make the real AI work explicit without weakening judge authority or fallback behavior.

### Baseline

- The gateway, identity, runner, and Mentor session endpoint were live.
- A real attempt-bound Mentor session always ended in `fallback` because the first model tool decision exceeded the hard 8-second provider timeout.
- The screen honestly showed “当前使用本地规则分析”; deterministic tools still produced a teaching question.
- Realistic first decision: 12,534 ms, 1,315 completion tokens, two tool calls returned only after the timeout threshold.
- Dynamic Mentor rubric: 2/5.

### Change

- Changed the default orchestration route from the reasoning-heavy explicit backend name to the provider's `deepseek-chat` tool-call alias. Explicit `DEEPSEEK_MODEL` overrides still work.
- Kept the same model adapter, tool schema validation, repeat budget, circuit breaker, deterministic fallback, and judge authority.
- Updated the server environment example, runtime documentation, active OpenSpec design, and browser smoke expectation.
- Added a learner-visible AI decision receipt that distinguishes live DeepSeek planning, deterministic execution, and fallback; it shows model decisions, executed tools, model latency, and the judge-authority boundary.
- Added no client secret, dependency, score, or mastery mutation.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Dynamic Mentor rubric | 2/5 | 5/5 | Target met |
| Fresh browser end-to-end Mentor time | Fallback after 8 s | 7.5 s to teaching action | Under 15 s target |
| Controlled first tool decision | 12,534 ms | 1,302 ms | −89.6% |
| Controlled first-decision completion tokens | 1,315 | 107 | −91.9% |
| Model decisions / executed tools in fresh flow | 0 / deterministic 3 | 2 / model-selected 3 | Dynamic plan verified |
| Full tests | 607/607 | 607/607 | No regression |

- A first fresh browser origin reached `deepseek` mode in 8.8 seconds; a second clean verification after the visible receipt change reached it in 7.5 seconds.
- The final receipt displayed “DeepSeek 动态规划 · 2 次模型决策 · 3 个工具 · 377 ms” and “模型决定查什么；判题仍由运行服务决定”.
- Executed tools were `inspect_syntax`, `generate_counterexample`, and `ask_learner`; the question was grounded in the current fixed-output code and the public sample, not a generic template.
- The exact run attempt remained bound, the run result was 27 ms, and the Mentor retained seven evidence references.
- Browser fallback was false, browser service-unavailable was false, and browser console errors were 0.
- The stack smoke now reports model `deepseek-chat`, PostgreSQL Mentor storage, ready runner, and an honestly `experimental` Mentor capability because the real teacher quality gate is still red.
- Full tests (159 files / 607 tests), lint, web+gateway typecheck, production build, stack smoke, Mentor seed eval, production baseline generation, and `git diff --check` pass.
- Formal Mentor v2 remains correctly red at 0/100 eligible real cases.
- Initial JS remains 382.94 kB / 122.26 kB gzip. Lazy ProblemReader: 54.15 kB → 54.94 kB (+0.79 kB; gzip +0.23 kB).
- CSS: 147.86 kB → 148.74 kB (+0.88 kB; gzip +0.12 kB).

### Decision

KEEP. The learner-visible Agent path moves from deterministic fallback to model-selected evidence tools and a Socratic action within budget, while all failure disclosures, judge authority, and quality gates remain intact.

### Learned

- A nominally newer or more reasoning-heavy model route is not automatically better for an interactive Agent. Tool selection latency, token shape, and the request budget are product properties.
- Raising the timeout would have hidden the problem while increasing latency and cost. Selecting the correct interaction mode produced both a faster and cheaper first decision.
- Explicitly showing decisions, tools, latency, and the judge boundary makes the AI capability understandable without decorative Agent theater.
- The next reliability gap is structural: Mentor sessions use PostgreSQL, but the shared Mentor OS runtime defaults to in-memory storage unless separately configured. Plans, tool/cost events, checkpoints, and stop reasons can disappear on gateway restart even though a Postgres store already exists.

### Next highest-value opportunity

Wire Mentor OS to PostgreSQL in the production-like gateway and expose its storage mode in capabilities. Prove a real run, tool/cost metadata, checkpoint, and stop reason survive a gateway restart and remain scoped to the learner. Do not call an in-memory trace durable.

## Active evaluation contract — durable Mentor OS on the primary problem journey

Status: active in Run 9.

Hypothesis:

If every problem workspace establishes a route-scoped Mentor OS run before analysis, the same visible Mentor can persist its dynamic plan, provider usage, tool evidence, checkpoint, and stop reason through a gateway restart instead of bypassing the durable runtime on direct/Today entry.

Corrected observation:

- Production-like startup already injects the existing PostgreSQL Mentor OS store; no new backend store is needed.
- The actual gap is routing: `MentorDock` creates the OS run only on routes where the dock is rendered. Today suppresses it and the custom problem layout does not render it.
- A fresh direct problem entry therefore calls `/mentor/sessions` directly. Its useful DeepSeek result is bound to the attempt but creates no Mentor OS event/cost/checkpoint record.
- The problem reader accepts any previously cached `mentorOS.active` without checking that its route key matches the current problem, which can also contaminate context after navigation.
- Primary journey durable trace: 0/1. Route-scope enforcement: 0/1. Runtime storage disclosure in capabilities: 0/1.

Primary metrics:

- Fresh direct problem journey must create a problem-scoped OS run before Mentor analysis, execute the attempt through `/mentor-os/.../commands`, and persist provider metadata, tool events, evidence refs, checkpoint, and stop reason. Target: 1/1 complete trace.
- After a gateway restart, recovery by run ID and learner identity must return the same sequence and events. Target: 1/1.
- A cached run for another route must never receive the current problem attempt. Target route-scope enforcement: 1/1.
- `/api/v1/capabilities` must report Mentor session storage and Mentor OS runtime storage separately. Target: 1/1.

Guardrails:

- Keep one visible Mentor in the problem workspace; do not add a second floating dock.
- Do not delay the editor or code runner while the Mentor OS initializes. If the learner runs immediately, analysis waits for the scoped runtime rather than falling back to an untracked direct call.
- Independent exam/transfer suppression remains fail-closed.
- Run IDs remain learner-scoped; recovery with another learner remains forbidden.
- Existing idempotency, sequence conflicts, approval policy, hidden-test isolation, and model fallback remain unchanged.

Revert threshold:

- Revert if two Mentor UIs appear, direct analysis can still bypass OS when the gateway is configured, a stale route run receives the attempt, restart recovery loses metadata, or technical/security gates regress.

Measurement limitation:

Restart recovery proves durable local event sourcing, not multi-region availability, retention policy, backup restoration, or production disaster recovery.

## Run 9 — Route-scoped durable Mentor and exactly-once attempt analysis

### Hypothesis

Bootstrapping a headless, route-scoped Mentor OS run inside the primary problem workspace will keep the single visible Mentor while making every analysis recoverable, attributable, and isolated from stale route state.

### Baseline

- A direct problem entry used `/mentor/sessions` without a Mentor OS run, so provider usage, tool lifecycle, checkpoint, and stop reason were not part of the durable trace.
- Any cached active run could be passed into a different problem because the reader did not enforce learner and route scope.
- Platform capabilities exposed Mentor session storage but not runtime storage.
- The first real durable browser attempt exposed an additional failure in the evaluation itself: React StrictMode submitted the same attempt twice, producing two model/tool lifecycles and duplicate cost.

### Change

- Added a headless Mentor dock mode that bootstraps and recovers the route run without rendering a second Mentor surface.
- Made problem analysis fail closed while the scoped runtime is starting; it no longer silently bypasses to the direct session endpoint.
- Added a learner-and-route selector before supplying a run to the problem reader.
- Propagated the runtime requirement through the problem reader and runner without delaying code execution.
- Added separate `runtimeStorage` capability disclosure and required PostgreSQL for a runtime-ready Mentor capability.
- Reused the same in-flight durable operation across React StrictMode mounts.
- Added persistent, atomic operation claim/completion records. A repeated attempt after a reload or gateway restart now replays the saved Mentor result instead of rerunning the model and tools.
- Updated the active OpenSpec design and scenarios for direct-entry bootstrap, stale-route rejection, and the visible recovery wait state.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Direct problem durable trace | 0/1 | 1/1 | Provider, tools, evidence, checkpoint, stop persisted |
| Gateway restart recovery | 0/1 | 1/1 | Same sequence and same rendered diagnosis |
| Learner + route scope | 0/1 | 1/1 | Stale route run rejected by selector |
| Runtime storage disclosure | 0/1 | 1/1 | `mentor.runtimeStorage=postgres` |
| Same attempt under StrictMode | 2 Agent actions | 1 Agent action | Duplicate model cost removed |
| Reload after restart | 14 new events | 0 new events | Saved operation replayed |
| Full tests | 607/607 | 611/611 | No regression |

- The fresh browser attempt `1bccc03e-c209-4637-9280-3881193ccacb` created one completed operation record and one ordered 14-event lifecycle: provider metadata, three tool pairs, evidence-backed hypotheses, and an explicit `awaiting-learner` stop.
- PostgreSQL run sequence advanced once from 29 to 43. After restarting the gateway and reloading the same problem, the page restored the same DeepSeek receipt and teaching question while sequence remained 43 and event count remained 14.
- Capabilities report account/PostgreSQL identity, PostgreSQL learning storage, ready runner, PostgreSQL Mentor session storage, PostgreSQL runtime storage, and `deepseek-chat` separately.
- Full tests pass: 160 files / 611 tests. Lint is clean. Web and gateway typecheck pass. Production build passes.
- Production-like stack smoke, durable hidden submission (2/2), Judge containment, strict OpenSpec validation, and `git diff --check` pass.
- Formal Mentor v2 remains correctly red at 0/100 eligible real teacher-adjudicated cases.
- Initial JS: 382.94 kB → 383.13 kB (+0.19 kB; gzip +0.09 kB). Lazy ProblemReader: 54.94 kB → 55.31 kB. CSS remains 148.74 kB.

### Decision

KEEP. The primary coding journey now uses a real durable Agent runtime, survives gateway restart, rejects stale route state, and does not charge twice for one attempt. The visible Mentor remains a single surface and the runner remains immediately usable.

### Learned

- Persistence wiring was already present in startup; the actual product failure was at the route seam. Capability audits must follow a real user journey, not only inspect backend adapters.
- Event-level idempotency was insufficient. A multi-event Agent action needs a parent operation record so reloads replay the whole result rather than generating a new lifecycle.
- Browser verification found a duplicate-cost bug that unit checks of each component missed. StrictMode and restart/reload are now explicit regression cases.
- The recovered diagnosis is technically truthful but still includes noisy hypotheses such as unresolved Node built-ins (`require`, `readFileSync`) and repeated variants. Durability makes bad evidence durable too; diagnosis precision is now the highest-value AI-quality opportunity.

### Next highest-value opportunity

Reduce learner-visible false-positive hypotheses from external/runtime calls and duplicate semantic findings. Establish a fixture from the real JavaScript starter (`require`, `readFileSync`, empty `solve`) and measure irrelevant-hypothesis count before/after. Preserve genuine unresolved local-call evidence and never hide parser uncertainty.

## Active evaluation contract — high-signal semantic hypotheses

Status: active in Run 10.

Hypothesis:

If the semantic analyzer distinguishes runtime/library calls from unresolved local calls and deduplicates findings by stable source identity, the Mentor will focus on the learner's missing algorithm instead of blaming standard input scaffolding.

Observed baseline:

- A real JavaScript starter attempt produced six learner-visible unresolved-call hypotheses across `require` and repeated `readFileSync` findings.
- These findings were technically derived from the structural graph but irrelevant to the task and appeared before the useful Socratic question.
- Relevant empty-solution evidence and the model-selected teaching question were present, so the problem is evidence precision rather than provider reachability.

Primary metric:

- On the captured starter fixture, irrelevant runtime/library unresolved-call hypotheses: target 6 → 0.
- Duplicate hypothesis identities in one analysis: target >0 → 0.
- A genuinely unresolved local function call remains reported: target 1/1.

Guardrails:

- Do not hard-code a problem ID or answer.
- Do not suppress syntax, judge, runtime, or locally resolvable call evidence.
- Preserve source locations and evidence references for every retained finding.
- Do not change model prompts, correctness scores, mastery, or hidden-test boundaries in this loop.

Revert threshold:

Revert if a local missing function is hidden, evidence references become less specific, tool tests regress, or the real Mentor loses its bounded teaching action.

Measurement limitation:

One captured JavaScript scaffold and local-call control case improve precision evidence but do not establish cross-language diagnostic accuracy; the formal teacher-adjudicated gate remains required.

## Run 10 — High-signal semantic evidence and current-attempt timeline

### Hypothesis

Separating bare local calls from member/runtime calls, and displaying only the current attempt's evidence cycle, will remove irrelevant scaffold diagnoses without hiding genuine missing local functions.

### Baseline

- The captured JavaScript starter produced four semantic risks: one `require` and three nested `readFileSync` findings.
- The long-lived Mentor session also kept three of those stale findings visible after a later analysis no longer produced them.
- A real learner therefore still saw standard input scaffolding presented as “目前最可能的问题”.

### Change

- Derived call targets from Tree-sitter's function/name fields and classified each call as bare or member-dispatched.
- Correctly identified nested `readFileSync(...).trim().split(...)` calls instead of assigning the innermost callee to every parent call expression.
- Added a bounded language-specific allowlist for runtime-provided bare functions; member calls are no longer mislabeled as missing local definitions.
- Kept unresolved bare local calls as unverified, source-backed risks.
- Added an immutable attempt observation when a later attempt starts a fresh analysis cycle.
- Limited the visible timeline and evidence count to the current attempt cycle, while preserving the full session history in the backend.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Captured scaffold unresolved risks | 4 | 0 | Target met |
| Browser-visible `require` risk | 1 | 0 | Target met |
| Browser-visible `readFileSync` risks | 2 | 0 | Target met |
| Genuine missing local function retained | 0/1 control | 1/1 | Guardrail met |
| New attempt observation | 0/1 | 1/1 | Attempt-bound cycle |
| Full tests | 611/611 | 615/615 | No regression |

- Focused semantic tests pass for JavaScript runtime scaffolding, nested call identity, and a genuine `missingHelper` call. Existing JavaScript, Python, Java, and C++ structure tests still pass.
- A real browser rerun displayed zero `require/readFileSync` diagnosis cards, one current judge observation, and a bounded “先预测，再修改” action.
- The live provider timed out once during this verification. The product disclosed deterministic fallback, retained five real tool steps, and did not label the result as model-backed.
- Full tests pass: 160 files / 615 tests. Lint, web+gateway typecheck, production build, stack smoke, and Mentor seed quality pass.
- Formal Mentor v2 remains correctly red at 0/100 eligible real teacher-adjudicated cases.
- Initial JS remains 383.13 kB / 122.35 kB gzip. Lazy ProblemReader: 55.31 kB → 55.43 kB (+0.12 kB; gzip 18.51 kB). CSS remains 148.74 kB.

### Decision

KEEP. The Mentor now focuses the learner on the algorithm instead of blaming standard runtime scaffolding, while local missing-function evidence, uncertainty labels, and full backend history remain intact.

### Learned

- The parser was not merely producing duplicates: nested call expressions were all assigned the first inner callee. Fixing structural identity was safer than adding UI text filters.
- Correct current evidence was insufficient while a long-lived session rendered stale prior events. Every attempt needs an explicit evidence-cycle boundary.
- During the live timeout, the new attempt binding updated before the old result cleared. For roughly 20 seconds the page paired a new attempt ID with the prior attempt's AI receipt and hypotheses. This is now the highest-value context-integrity defect.

### Next highest-value opportunity

Clear prior result evidence immediately when analysis begins for a new attempt, while retaining the internal Mentor session for pedagogical continuity. Show a truthful current-attempt working state until the durable action resolves; never pair a new attempt snapshot with an old diagnosis.

## Active evaluation contract — zero stale receipt during analysis

Status: active in Run 11.

Hypothesis:

If the visible result, fallback, and checkpoint are reset at the exact new-attempt boundary, the learner will see a truthful working state instead of a new submission header above old AI evidence.

Observed baseline:

- During a real new attempt, the immutable attempt receipt changed immediately but the prior DeepSeek receipt, old next action, and old hypothesis cards remained visible until the new request settled.
- Provider timeout made the mismatch visible for about 20 seconds.
- Context-integrity rubric while busy: new attempt bound 1/1; old receipt absent 0/1; old events absent 0/1; truthful working state 0/1 — total 1/4.

Primary metric:

- Context-integrity rubric during a delayed new-attempt request: target 4/4.

Guardrails:

- Keep `sessionRef` so learner prediction/edit continuity is not lost.
- Do not clear the code, attempt history, durable run, or previous stored evidence.
- If the new request fails, show only its honest fallback, not the prior diagnosis.
- No additional model call, timeout increase, or loading overlay that blocks the editor.

Revert threshold:

Revert if the same-attempt StrictMode path loses its result, a revised attempt no longer reuses the Mentor session, or the editor/runner becomes blocked.

Measurement limitation:

This proves visual context integrity under one delayed request; it does not improve provider latency or model availability.

## Run 11 — Zero stale AI receipt during a new attempt

### Hypothesis

Resetting only the visible analysis state at the new-attempt boundary will preserve Mentor session continuity while preventing a new submission receipt from being paired with old AI evidence.

### Baseline

- New attempt binding updated immediately.
- Prior AI receipt, next action, evidence count, and hypothesis cards remained visible until the new durable action settled.
- Context-integrity rubric during a delayed request: 1/4.

### Change

- At a new attempt ID, synchronously cleared the visible result, fallback, and checkpoint before launching analysis.
- Retained `sessionRef`, the durable run, attempt history, code, and backend event history.
- Added a delayed-request regression that proves the interim state and then resolves into the new receipt.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| New attempt bound | 1/1 | 1/1 | Preserved |
| Old AI receipt absent while busy | 0/1 | 1/1 | Target met |
| Old hypothesis cards absent while busy | 0/1 | 1/1 | Target met |
| Truthful working state | 0/1 | 1/1 | Target met |
| Context-integrity rubric | 1/4 | 4/4 | Target met |
| Full tests | 615/615 | 616/616 | No regression |

- A real browser snapshot 150 ms after Run showed the new immutable attempt ID, `正在观察…`, no AI receipt, no old hypothesis, and a still-usable editor/runner.
- The settled request showed only the new fallback receipt and its teaching action. No runtime-scaffold diagnosis returned.
- Full tests pass: 160 files / 616 tests. Lint, web+gateway typecheck, and production build pass.
- Initial JS remains 383.13 kB / 122.35 kB gzip. Lazy ProblemReader: 55.43 kB → 55.47 kB (+0.04 kB; gzip 18.52 kB).

### Decision

KEEP. A learner can now trust that everything below an attempt receipt belongs to that attempt, even while the Agent is slow or degraded.

### Learned

- Attempt immutability must include the loading state, not only the final response.
- Preserving a pedagogical session and clearing its visible projection are separate concerns; conflating them caused the context mismatch.
- Two consecutive live provider timeouts were disclosed correctly. More importantly, the deterministic fallback asked an empty starter function which “variable first diverges”, a debugging question before the learner had modeled or implemented anything. Fallback pedagogy is now the highest-value user-facing gap.

### Next highest-value opportunity

Make deterministic fallback stage-aware. When the learner has only input scaffolding or an empty solution function, ask a modeling question about how input becomes output; reserve state-divergence debugging questions for code with learner-authored logic.

## Active evaluation contract — stage-aware deterministic teaching

Status: active in Run 12.

Hypothesis:

If fallback classifies the attempt as modeling versus debugging, a provider outage will still advance the learner's actual stage instead of asking an impossible debugging question.

Observed baseline:

- The JavaScript starter contains imports/input parsing and an empty `solve` body.
- During a real provider timeout, fallback asked: “哪个变量会首先偏离预期？”
- Stage-fit rubric: detects scaffold-only 0/1; asks modeling question 0/1; avoids state-divergence premise 0/1; preserves debugging question for implemented code 1/1 — total 1/4.

Primary metric:

- Stage-fit rubric target: 4/4 on scaffold-only and implemented-code fixtures.

Guardrails:

- No answer, pseudocode, algorithm name, or reference solution leakage.
- Question remains one bounded learner action, not a lecture.
- Implemented code with a real failing path keeps the debugging branch.
- No model prompt, provider retry, scoring, or mastery changes.

Revert threshold:

Revert if the scaffold detector classifies substantive learner code as empty, the question leaks a solution, or existing Mentor engine/eval tests regress.

Measurement limitation:

Two fixtures validate stage fit, not teaching effectiveness; independent transfer and teacher adjudication remain required.

## Run 12 — Stage-aware deterministic teaching

### Hypothesis

Classifying an attempt as modeling versus debugging will keep Mentor useful during a provider outage instead of asking an empty starter function which variable has diverged.

### Baseline

- The empty JavaScript `solve` scaffold was treated as implemented logic.
- Fallback asked a state-divergence debugging question before the learner had modeled or written the solution.
- Stage-fit rubric: 1/4.

### Change

- Added conservative empty-solution detection for JavaScript and Python scaffolds after comments are removed.
- Empty solution scaffolds now receive one bounded input-to-output modeling question.
- Substantive code with an index boundary still receives a boundary/state debugging question.
- Preserved answer-leakage boundaries: no algorithm name, pseudocode, reference answer, or code patch is disclosed.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Empty scaffold detected | 0/1 | 1/1 | Target met |
| Modeling question selected | 0/1 | 1/1 | Target met |
| State-divergence premise absent for scaffold | 0/1 | 1/1 | Target met |
| Debugging branch preserved for implemented code | 1/1 | 1/1 | Guardrail met |
| Stage-fit rubric | 1/4 | 4/4 | Target met |
| Full tests | 616/616 | 617/617 | No regression |

- Focused Mentor engine tests pass for the exact empty-scaffold and implemented-code branches.
- Full tests pass: 160 files / 617 tests. Lint, web+gateway typecheck, production build, and stack smoke pass.
- In a real browser outage path, the next action asked the learner to explain the ranking model/comparison logic and did not ask which variable diverged.
- The live provider fell back truthfully again. The result remained labeled deterministic rather than model-backed.

### Decision

KEEP. Provider failure no longer forces a learner who has not started implementing into a debugging interaction they cannot answer.

### Learned

- “Fallback works” is too weak a reliability claim; its teaching action must match the learner's stage.
- During provider timeout, deterministic fallback repeats deterministic tools that the model already completed. The visible timeline can contain duplicate syntax inspection and corpus retrieval, adding latency and noise without evidence gain.
- This duplication is independently testable and can be removed without changing model prompts or provider policy.

### Next highest-value opportunity

Resume deterministic fallback from evidence already collected in the current Agent turn. Run only missing tools, so a model timeout after inspection/retrieval produces one inspection, one retrieval, and one teaching action rather than repeating work.

## Active evaluation contract — resume fallback without duplicate tools

Status: active in Run 13.

Hypothesis:

If deterministic fallback reuses the current runtime context after a model error, the learner will receive the same bounded action faster and the execution timeline will contain no duplicate evidence acquisition.

Observed baseline:

- When the model completes syntax inspection and corpus retrieval, then fails on the next completion, the catch path starts the deterministic policy from step one.
- Browser traces during live provider timeouts showed repeated `我检查了代码结构` and/or `我检索完整题库证据` events.
- Duplicate-tool rubric for this controlled sequence: syntax inspection at most once 0/1; retrieval at most once 0/1; bounded teaching action present 1/1; honest fallback state 1/1 — total 2/4.

Primary metric:

- Duplicate-tool rubric target: 4/4 when the provider fails after two successful tool selections.

Guardrails:

- A provider that fails before collecting evidence still runs the full deterministic policy.
- Collected syntax/retrieval evidence, source references, execution order, and fallback disclosure remain visible.
- No provider retry, longer timeout, model prompt, score, mastery, hidden-test, or answer-leakage change.
- Existing Mentor engine and quality evals remain green.

Evaluation scenario:

- A deterministic model adapter selects `inspect_syntax`, then `search_evidence`, then throws.
- Assert the real returned execution list contains exactly one inspection, exactly one retrieval, and one bounded learner action.

Revert threshold:

Revert if any missing deterministic evidence tool is skipped, the fallback action disappears, source-backed evidence is lost, or full regression checks fail.

Measurement limitation:

Eliminating duplicate work improves degradation latency and legibility but does not make the DeepSeek provider more available; provider reliability remains a separate opportunity.

## Run 13 — Resume fallback without duplicate evidence tools

### Hypothesis

Reusing syntax and retrieval evidence already collected before a model error will remove redundant fallback work while preserving the same bounded teaching action.

### Baseline

- Controlled provider sequence produced `inspect_syntax → search_evidence → inspect_syntax → search_evidence → ask_learner`.
- Duplicate-tool rubric: 2/4.
- A prior browser trace showed one repeated retrieval in the current attempt cycle.

### Change

- Deterministic fallback now checks the live turn context before scheduling syntax inspection or retrieval.
- Missing evidence tools still run in the original order.
- The bounded `ask_learner` action always remains the final deterministic step.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Syntax inspection at most once | 0/1 | 1/1 | Target met |
| Retrieval at most once | 0/1 | 1/1 | Target met |
| Bounded teaching action present | 1/1 | 1/1 | Preserved |
| Honest fallback state | 1/1 | 1/1 | Preserved |
| Duplicate-tool rubric | 2/4 | 4/4 | Target met |
| Full tests | 617/617 | 618/618 | No regression |

- The new regression first failed with the exact five-step duplicate sequence, then passed with exactly three executions.
- In the real problem workspace, the current attempt displayed one structure inspection, one corpus retrieval, and one teaching action; the evidence-step count fell from four to three.
- Full tests pass: 160 files / 618 tests. Lint, web+gateway typecheck, production build, stack rebuild, stack smoke, seed Mentor quality, strict OpenSpec validation, and diff check pass.
- Formal Mentor v2 remains correctly red: 4 scored cases, 0/100 eligible real teacher-adjudicated cases.
- Bundle sizes are unchanged: initial JS 383.13 kB / 122.35 kB gzip; lazy ProblemReader 55.47 kB / 18.52 kB gzip; CSS 148.74 kB.

### Decision

KEEP. Degradation now resumes rather than restarts, reducing visible noise and duplicate evidence acquisition without weakening the fallback.

### Learned

- The latest production-like operation was not actually a provider timeout. Its durable receipt records two successful DeepSeek calls, 5,919 input tokens, 499 output tokens, and model-selected tool arguments.
- Despite that evidence, the result and browser both said `fallback` / `当前使用本地规则分析`.
- Root cause: a persisted Mentor session retains its previous `fallback` mode. A later successful model-backed turn initializes its provider receipt from that stale session mode and returns before resetting it.
- This status bug hides real AI capability and violates the product's honest capability-state contract in both directions.

### Next highest-value opportunity

Make provider mode a property of the current turn, not inherited session history. A successful model-backed turn after an earlier fallback must show DeepSeek, current model, calls, tokens, and AI decision evidence; a real failure must still switch back to fallback.

## Active evaluation contract — recover model-backed status after fallback

Status: active in Run 14.

Hypothesis:

If each analysis turn initializes provider mode from the currently available runtime before executing tools, a recovered DeepSeek turn will be truthfully visible as AI-backed instead of permanently inheriting an old fallback label.

Observed baseline:

- Durable operation `attempt:9299b19e-8d06-4aac-884b-00772b9989a9` recorded 2 model calls, 5,919 input tokens, 499 output tokens, model-selected tool arguments, and a contextual question.
- Its provider/session mode was nevertheless `fallback`, and the browser displayed `当前使用本地规则分析` plus `确定性工具接管`.
- Honest-current-turn rubric: model calls recorded 1/1; model tool decisions preserved 1/1; provider receipt says DeepSeek 0/1; learner sees model-backed status 0/1 — total 2/4.

Primary metric:

- Honest-current-turn rubric target: 4/4 after a prior fallback session successfully completes a model-selected learner action.

Guardrails:

- An actual provider exception still switches both provider and session to `fallback`.
- Deterministic mode remains explicit when no model adapter is configured.
- Provider calls/tokens/latency remain current-turn values; no fabricated usage.
- No change to prompts, teaching content, tool authority, scores, mastery, or hidden-answer boundaries.

Evaluation scenario:

- Start from a persisted session whose mode is `fallback`.
- Supply a working model adapter that selects a bounded learner question.
- Assert returned provider/session mode is `deepseek`, call count is non-zero, and a subsequent failure still reports `fallback`.

Revert threshold:

Revert if a true failure is labeled model-backed, a no-model turn gains fabricated calls, or regression/quality checks fail.

Measurement limitation:

Correct status makes existing AI capability perceptible and trustworthy; it does not prove teaching effectiveness or provider availability.

## Run 14 — Recover model-backed status after a prior fallback

### Hypothesis

Initializing capability mode from the current analysis runtime will make a recovered DeepSeek turn visible as AI-backed instead of inheriting stale fallback state.

### Baseline

- A durable operation completed 2 DeepSeek calls, 5,919 input tokens, 499 output tokens, and three model-selected tools.
- Session/provider mode remained `fallback` from an earlier outage.
- The browser therefore displayed `当前使用本地规则分析` and `确定性工具接管` for real model work.
- Honest-current-turn rubric: 2/4.

### Change

- Each new analysis cycle now initializes session/provider mode from the currently configured runtime after any response/outcome-only path.
- A configured model starts the cycle as `deepseek` with the current model identifier.
- A no-model cycle starts as `deterministic` and removes a stale model identifier.
- The existing catch path remains authoritative and changes a real model failure to `fallback`.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Model calls recorded | 1/1 | 1/1 | Preserved |
| Model-selected tools preserved | 1/1 | 1/1 | Preserved |
| Current provider receipt says DeepSeek | 0/1 | 1/1 | Target met |
| Learner sees model-backed status | 0/1 | 1/1 | Target met |
| Honest-current-turn rubric | 2/4 | 4/4 | Target met |
| Full tests | 618/618 | 619/619 | No regression |

- The new regression first failed with a successful recovered turn still returning `mode: fallback`, then passed with `deepseek`, one call, and exact usage.
- The real browser now shows `DeepSeek 已动态规划`, `AI 正在真实工作`, `2 次模型决策 · 3 个工具 · 693 ms`, and no local-rule/fallback label.
- The same page still showed exactly one syntax inspection, one retrieval, and one learner question.
- Full tests pass: 160 files / 619 tests. Lint, web+gateway typecheck, production build, rebuilt gateway, and stack smoke pass.
- An intermediate typecheck caught a narrowed receipt union; annotating it with the existing `MentorTurnResult['provider']` contract fixed the type without changing runtime behavior.

### Decision

KEEP. A recovered Agent is no longer permanently disguised as a rule engine, so the product truthfully exposes an AI capability it was already paying for and executing.

### Learned

- Capability state must describe the current turn, while session history describes continuity; combining them made recovery invisible.
- The next real interaction uncovered a deeper learning defect: a plainly correct learner answer was marked wrong because the evaluator required the response to contain the model's entire long `expectedConcept` string.
- That false negative immediately reduced the learner twin from 16% to 12% and gave irrelevant advice about loop variables even though the solution function was empty.

### Next highest-value opportunity

Replace binary exact-string response grading with a conservative evidence-aware assessment: accept a clear shared concept, otherwise say evidence is insufficient and ask for clarification. Never lower the learner twin or advance to code editing from an unproven “wrong” classification.

## Active evaluation contract — do not punish semantically correct or ambiguous predictions

Status: active in Run 15.

Hypothesis:

If response assessment recognizes a concrete shared concept and treats unmatched language as uncertain rather than wrong, Mentor will continue the Socratic loop without corrupting the learner model.

Observed baseline:

- Model question: when totals tie, compare counts of 10s, then 9s, and so on.
- Learner response: `选手A，因为总分相同先比较10分数量，A有3个，B有2个。`
- Backend marked it unverified/failure, reduced `greedy` mastery from 16% to 12%, and advised inspecting loop variables and array indices.
- Response-integrity rubric: clear concept accepted 0/1; ambiguous response does not reduce mastery 0/1; ambiguous response stays in prediction stage 0/1; next action remains context-appropriate 0/1 — total 0/4.

Primary metric:

- Response-integrity rubric target: 4/4 on a clear comparator answer and an unrelated/ambiguous answer fixture.

Guardrails:

- Do not call a model or reveal the expected answer merely to grade a prediction.
- Do not treat generic word overlap as proof; require an exact expected concept, the existing bounded domain rule, or a meaningful shared phrase.
- Only supported prediction evidence may increase the twin.
- Uncertain language must not be stored as failure evidence or move the learner to editing.
- Existing off-by-one prediction behavior remains supported.

Evaluation scenarios:

- A verbose expected concept containing `10分数量` accepts a learner explanation containing that same specific rule.
- `我不知道，先试试代码` remains uncertain, preserves the twin, keeps `awaiting-prediction`, and asks for one clearer rule/state statement.

Revert threshold:

Revert if generic overlap is accepted as correct, uncertainty changes mastery, a supported boundary response stops working, or regression/quality checks fail.

Measurement limitation:

These deterministic fixtures protect false-negative and unsafe-update behavior; broad semantic grading quality still needs teacher-adjudicated response data.

## Run 15 — Conservative evidence-aware learner response assessment

### Hypothesis

Recognizing a concrete shared concept and treating unmatched language as uncertain will prevent false failure evidence while keeping the Socratic loop moving.

### Baseline

- A plainly correct comparator explanation was classified as failure because it did not contain the model's entire verbose expected string.
- The learner moved to editing with irrelevant loop/index advice.
- The learner twin fell from 16% to 12%.
- Response-integrity rubric: 0/4.

### Change

- Normalized small surface variation such as `比较` versus `比`.
- Accepted only the full expected concept, the existing bounded boundary rule, or a shared specific phrase of at least five normalized characters.
- Unmatched language is now `unverified`, not `failure`: it keeps the pending question, stays in prediction, asks for one clearer rule/state statement, and does not update the twin.
- Supported responses alone emit `prediction-correct`, update the twin, and advance to one stage-appropriate implementation step.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Clear comparator concept accepted | 0/1 | 1/1 | Target met |
| Ambiguous answer preserves mastery | 0/1 | 1/1 | Target met |
| Ambiguous answer stays in prediction | 0/1 | 1/1 | Target met |
| Next action remains context-appropriate | 0/1 | 1/1 | Target met |
| Response-integrity rubric | 0/4 | 4/4 | Target met |
| Full tests | 619/619 | 621/621 | No regression |

- Both new tests failed on the old exact-string/binary-failure behavior and passed after the change.
- Existing off-by-one prediction remains supported and still narrows the next action to the loop upper bound.
- In the real browser, `两人总分相同，10分数量相同，9分数量也相同，所以完全并列` was accepted; the irrelevant loop/index advice disappeared and the next action asked for only one small implementation step.
- The real twin moved upward from 12% to 14% instead of recording another failure.
- Full tests pass: 160 files / 621 tests. Lint, web+gateway typecheck, production build, rebuilt gateway, and stack smoke pass.

### Decision

KEEP. The product no longer punishes a learner for paraphrasing a correct idea, and it declines to invent failure evidence when understanding is ambiguous.

### Learned

- A binary keyword grader undermined the AI-generated Socratic question more than the quality of the question itself.
- Safe uncertainty is a better product behavior than false precision because the learner twin controls future recommendations.
- The positive 12% → 14% update exposed a contradictory UI sentence: `这次证据提示仍有未掌握部分；系统只下调…` is hard-coded for every non-assisted/non-transfer change, including `prediction-correct`.

### Next highest-value opportunity

Make the capability-update explanation derive from evidence kind and direction. A supported prediction or independent pass must explain the increase and its limits; only negative evidence may use downward-language.

## Active evaluation contract — capability copy matches evidence direction

Status: active in Run 16.

Hypothesis:

If the capability card explains why a score moved in the same direction as the displayed percentage, learners can trust the digital twin instead of seeing contradictory feedback.

Observed baseline:

- Real browser card displayed `greedy 12% → 14%`.
- The same sentence said `这次证据提示仍有未掌握部分；系统只下调有直接证据的技能`.
- Direction-consistency rubric: percentage direction correct 1/1; prediction evidence named 0/1; positive movement described positively 0/1; stronger mastery boundary explained 0/1 — total 1/4.

Primary metric:

- Direction-consistency rubric target: 4/4 for `prediction-correct`; preserve assisted-pass, transfer-pass, and failure wording branches.

Guardrails:

- Do not overstate a prediction as independent mastery.
- Failure/decrease language remains available only for negative evidence.
- Mixed or unchanged changes receive neutral wording rather than a fabricated direction.
- No change to probabilities, learner evidence, recommendation logic, or model behavior.

Evaluation scenario:

- Render a capability card with `prediction-correct`, prior 0.12, posterior 0.14.
- Assert it names the supported judgment, explains the small increase, states that independent/transfer evidence is still required, and contains no downward-only claim.

Revert threshold:

Revert if the displayed numbers change, negative evidence receives positive language, special assisted/transfer explanations regress, or UI/full tests fail.

Measurement limitation:

This improves interpretability of one digital-twin event; whether it increases user trust needs user research or behavioral evidence.

## Run 16 — Capability copy matches evidence direction

### Hypothesis

Explaining capability movement from its evidence kind and direction will remove a visible contradiction and make the learner twin interpretable.

### Baseline

- Real capability card showed `greedy 12% → 14%`.
- The same card claimed the system had only lowered directly evidenced skills.
- Direction-consistency rubric: 1/4.

### Change

- Added one evidence-direction explanation function for capability changes.
- `prediction-correct` now names the supported judgment, explains the small increase, and states that independent/transfer evidence is still required.
- Assisted pass, transfer pass, independent pass, negative evidence, and mixed/unchanged evidence each retain distinct, bounded explanations.
- Percentages and learner-twin calculations are unchanged.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Percentage direction displayed correctly | 1/1 | 1/1 | Preserved |
| Prediction evidence named | 0/1 | 1/1 | Target met |
| Positive movement described positively | 0/1 | 1/1 | Target met |
| Stronger mastery boundary explained | 0/1 | 1/1 | Target met |
| Direction-consistency rubric | 1/4 | 4/4 | Target met |
| Full tests | 621/621 | 622/622 | No regression |

- The new UI test failed on the contradictory downward sentence, then passed with the positive but bounded explanation.
- Real browser now displays `12% → 14%。你的关键判断得到支持，因此能力档案小幅上调；只有独立完成和迁移验证才会形成更强的掌握证据。`
- The same card contains no `系统只下调` claim.
- Full tests pass: 160 files / 622 tests. Lint, web+gateway typecheck, production build, and diff check pass.
- Lazy ProblemReader grew from 55.47 kB / 18.52 kB gzip to 56.01 kB / 18.76 kB gzip (+0.54/+0.24 kB); initial JS and CSS remain unchanged.

### Decision

KEEP. The digital twin now explains the evidence it actually applied instead of contradicting its own number.

### Learned

- A correct probability is not enough; interpretation text is part of the learning contract.
- The latest model-backed run used six tools, including four corpus searches. The searches returned overlapping solution/problem evidence and crowded the visible timeline before one teaching question.
- The runtime limits identical fingerprints but has no per-tool evidence budget, so changing the query bypasses the repeat limit.

### Next highest-value opportunity

Bound corpus retrieval per turn and let the model replan from an explicit rejected action. Two searches are enough for initial evidence plus one refinement; a third should be rejected without executing or appearing as evidence work.

## Active evaluation contract — bounded retrieval with observable replanning

Status: active in Run 17.

Hypothesis:

If the Agent enforces a two-search evidence budget before tool execution, it will preserve dynamic refinement while reducing latency, cost, and timeline noise.

Observed baseline:

- Real model-backed turn: 6 tool executions, 4 `search_evidence`, 1 syntax inspection, 1 learner question.
- Retrieval-budget rubric: first search allowed 1/1; one refinement allowed 1/1; third search rejected 0/1; Agent can replan to learner action 0/1 — total 2/4.

Primary metric:

- Retrieval-budget rubric target: 4/4 in a controlled model sequence and at most two searches in the real browser cycle.

Guardrails:

- Different search queries may still run twice; this is not simple query deduplication.
- A rejected third search returns an explicit tool result so the model can replan instead of silently losing context.
- Rejected requests do not create tool executions or evidence claims.
- Syntax, verification, learner action, fallback honesty, and answer-leakage policies remain unchanged.

Evaluation scenario:

- Model selects three distinct `search_evidence` calls followed by `ask_learner`.
- Assert exactly two search executions, one rejected-model-action event for the third, and one learner question without fallback.

Revert threshold:

Revert if the second refinement is blocked, the model cannot recover to a learner action, a rejected search appears as completed evidence, or regression/quality checks fail.

Measurement limitation:

A two-search cap is a product/runtime proxy derived from observed redundancy; optimal retrieval depth still needs outcome and relevance evaluation.

## Run 17 — Bounded retrieval with observable replanning

### Hypothesis

A two-search evidence budget will preserve one refinement while preventing repeated retrieval from dominating the Agent turn.

### Baseline

- Real model-backed turn executed 6 tools, including 4 corpus searches.
- Distinct query strings bypassed the existing identical-fingerprint limit.
- Retrieval-budget rubric: 2/4.

### Change

- Counted successful `search_evidence` actions in the current model turn.
- Allowed two distinct searches.
- Rejected a third search before execution with an explicit tool-action error returned to the model, allowing it to replan.
- Rejected searches create no execution receipt or evidence claim.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| First search allowed | 1/1 | 1/1 | Preserved |
| One refinement allowed | 1/1 | 1/1 | Preserved |
| Third search rejected | 0/1 | 1/1 | Target met |
| Agent replans to learner action | 0/1 | 1/1 | Target met |
| Retrieval-budget rubric | 2/4 | 4/4 | Target met |
| Full tests | 622/622 | 623/623 | No regression |

- The new test first executed all three distinct searches; after the change it executed two searches plus `ask_learner`, with a rejected-model-action trace for the third.
- Real browser turn changed from 6 tools / 4 searches to 4 tools / 2 searches: one syntax inspection, two retrievals, and one learner question.
- The real Agent remained DeepSeek-backed, completed 4 model decisions and 4 tools in about 1.0 seconds, and did not fall back.
- Full tests pass: 160 files / 623 tests. Lint, web+gateway typecheck, production build, rebuilt gateway, stack smoke, and seed Mentor quality pass.

### Decision

KEEP. The Agent still refines evidence dynamically but can no longer spend most of a learner turn repeatedly searching overlapping corpus content.

### Learned

- Tool fingerprints prevent exact loops but do not control semantic work budgets; both are necessary.
- Explicit rejection is better than silent caching because it exercises the model's ability to replan.
- After a learner response, the result correctly has zero new model calls and zero tools, but the UI still labels it `AI 正在真实工作 / DeepSeek 动态规划`, creating a new current-turn receipt inconsistency.

### Next highest-value opportunity

Distinguish a model-backed planning turn from a deterministic response/outcome projection. When no new model call occurs, say that the system is applying the prior question's evidence rule and making no extra model request.

## Active evaluation contract — truthful zero-call response receipt

Status: active in Run 18.

Hypothesis:

If the receipt uses current-turn call count as well as session capability, learners will understand when DeepSeek planned the interaction and when deterministic evidence logic merely updates state.

Observed baseline:

- After a learner prediction, provider receipt showed 0 model calls, 0 tools, and 0 ms.
- The same card said `AI 正在真实工作` and `DeepSeek 动态规划`.
- Zero-call honesty rubric: zero new calls visible 1/1; no claim of current model work 0/1; prior AI origin explained 0/1; deterministic evidence update explained 0/1 — total 1/4.

Primary metric:

- Zero-call honesty rubric target: 4/4 in UI and real browser response flow.

Guardrails:

- A turn with one or more model calls keeps the existing prominent DeepSeek receipt.
- Fallback and no-model deterministic states keep their current labels.
- Do not hide model usage, provider latency, or tool count when they are non-zero.
- No backend mode, trace, learner evidence, or teaching behavior change.

Evaluation scenario:

- Render a DeepSeek session response with provider calls 0 and executions 0.
- Assert the receipt says no additional model request, explains it is applying the prior AI question's evidence rule, and does not say `AI 正在真实工作` or `DeepSeek 动态规划`.

Revert threshold:

Revert if a real model-backed turn loses its AI receipt, fallback becomes mislabeled, usage numbers disappear, or UI/full tests fail.

Measurement limitation:

This clarifies execution provenance; it does not change the intelligence of the response assessor.

## Run 18 — Truthful zero-call learner-response receipt

### Hypothesis

Using both session capability and current call count will distinguish AI planning from deterministic response projection without hiding the prior AI origin.

### Baseline

- Learner-response result had 0 model calls, 0 tools, and 0 ms.
- UI still said `AI 正在真实工作 / DeepSeek 动态规划`.
- Zero-call honesty rubric: 1/4.

### Change

- Added current-turn receipt copy derived from session mode plus provider call count.
- DeepSeek turns with calls keep the full model decision/tool/latency receipt.
- DeepSeek sessions with zero new calls now say `正在核对你的回答`, `本轮无需再次调用模型`, and `沿用上一步 AI 问题的验证标准`.
- Fallback and deterministic modes retain distinct truthful notes.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Zero additional calls visible | 1/1 | 1/1 | Preserved |
| No claim of current model work | 0/1 | 1/1 | Target met |
| Prior AI origin explained | 0/1 | 1/1 | Target met |
| Deterministic evidence update explained | 0/1 | 1/1 | Target met |
| Zero-call honesty rubric | 1/4 | 4/4 | Target met |
| Full tests | 623/623 | 624/624 | No regression |

- The new UI test failed on `AI 正在真实工作 / DeepSeek 动态规划 / 0 次模型决策` and passed on the evidence-projection receipt.
- In the real browser, a correct learner response displayed the new zero-call receipt and remained accepted; neither active-AI claim remained.
- Full tests pass: 160 files / 624 tests. Lint, web+gateway typecheck, production build, and strict OpenSpec validation pass.
- Lazy ProblemReader grew from 56.01 kB / 18.76 kB gzip to 56.62 kB / 18.95 kB gzip (+0.61/+0.19 kB); initial JS remains 383.13 kB / 122.34 kB gzip.

### Decision

KEEP. The interface now distinguishes “AI planned this” from “the evidence system applied that plan” instead of treating every state update as a fresh model inference.

### Learned

- Honest AI-native UX needs per-turn provenance, not only a session-level model badge.
- The real capability card still attributes this custom-ranking problem to `greedy`.
- The problem record marks `greedy` as a candidate classification at 0.9 confidence, while its title, ranking rule, and reference explanation describe custom sorting. Candidate skill labels are currently treated exactly like verified labels and therefore write future learner evidence into the wrong skill.

### Next highest-value opportunity

Make skill inference trust-aware. Verified persisted labels remain authoritative; candidate/inferred labels may be replaced by stronger title/description signals. Remove generic `最多/最少` as standalone proof of greedy and recognize ranking/comparator language as sorting.

## Active evaluation contract — trust-aware skill attribution

Status: active in Run 19.

Hypothesis:

If candidate skills are treated as proposals rather than truth, future Mentor evidence for custom-ranking tasks will update `sorting` instead of incorrectly training `greedy`.

Observed baseline:

- `od-7380421e88aa` is labeled `skills: ['greedy']`, `classification.source: candidate`, confidence 0.9.
- Its problem asks for top-three ranking with multi-level tie-breaking; the supplied explanation explicitly describes array sorting and comparator logic.
- Browser capability updates therefore showed `greedy`.
- Attribution rubric: candidate not treated as verified 0/1; ranking language maps to sorting 0/1; generic `最多` does not imply greedy 0/1; verified persisted labels remain authoritative 1/1 — total 1/4.

Primary metric:

- Attribution rubric target: 4/4 and future real-browser Mentor update names `sorting` for this task.

Guardrails:

- Do not rewrite the 754-problem corpus or historical learner evidence in this loop.
- Verified persisted skill labels remain unchanged.
- Candidate labels remain a fallback when no stronger textual skill signal exists.
- Existing multi-skill inference and simulation fallback tests remain green.
- No teaching, model, score, or recommendation-weight change beyond future skill attribution.

Evaluation scenario:

- Infer skills for a custom-ranking fixture with candidate `greedy` and text containing `得分最多`, `排名`, and tie-break comparison.
- Assert primary/only inferred skill is `sorting`, not `greedy`.
- Assert a verified persisted `greedy` fixture still returns `greedy`.

Revert threshold:

Revert if verified labels are overridden, well-known graph/binary-search fixtures regress, unknown tasks lose their candidate fallback, or full/browser checks fail.

Measurement limitation:

One high-signal misclassification proves a trust-ordering defect, not overall corpus taxonomy accuracy; a larger teacher-reviewed skill set remains necessary.

## Run 19 — Trust-aware future skill attribution

### Hypothesis

Treating candidate labels as fallback proposals will prevent a weak corpus tag from overriding stronger ranking/comparator evidence.

### Baseline

- Custom-ranking problem carried candidate `greedy` at confidence 0.9.
- Runtime always preferred persisted labels, regardless of trust source.
- `最多/最少` were also standalone greedy keywords, making false greedy attribution likely.
- Attribution rubric: 1/4.

### Change

- Added classification provenance to the skill-inference input.
- Verified persisted skills remain authoritative.
- Candidate/inferred persisted skills are used only when title/description produce no stronger recognized signal.
- Added ranking, rank, comparator, and top-three language to sorting evidence; removed generic maximum/minimum words as standalone greedy proof.
- Mentor and learning-Agent request builders now pass problem classification provenance.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Candidate label not treated as verified | 0/1 | 1/1 | Target met |
| Ranking language maps to sorting | 0/1 | 1/1 | Target met |
| Generic maximum does not imply greedy | 0/1 | 1/1 | Target met |
| Verified persisted label remains authoritative | 1/1 | 1/1 | Preserved |
| Attribution rubric | 1/4 | 4/4 | Target met |
| Full tests | 624/624 | 626/626 | No regression |

- The custom-ranking regression first returned `['greedy']`, then returned `['sorting']`; the new verified-label guardrail remained green.
- Focused skill, Mentor client, and Agent client tests pass: 14/14.
- In the real browser, a later correct prediction updated `sorting` and no longer updated `greedy`; historical greedy evidence was intentionally not rewritten.
- Full tests pass: 160 files / 626 tests. Lint, web+gateway typecheck, production build, and stack smoke pass.
- Skills chunk increased from 2.91/1.53 kB to 3.02/1.59 kB; lazy ProblemReader is 56.69/18.96 kB gzip; initial JS remains 383.13/122.35 kB gzip.

### Decision

KEEP. Candidate content intelligence now behaves like candidate evidence, while verified labels retain their authority.

### Learned

- Correcting the primary skill exposed evidence fan-out: the real prediction increased `io-parsing`, `array`, `sorting`, and `interval` together.
- Root cause: `handleLearnerResponse` projects `prediction-correct` to every problem skill, even though the AI question tested only comparator/sorting knowledge.
- One answer should update the skill it actually tested; otherwise the adaptive planner becomes overconfident across unrelated prerequisites.

### Next highest-value opportunity

Bind every learner question to one target skill selected from the problem's allowed skills. Persist that target with the pending prompt and project response evidence only to it.

## Active evaluation contract — question-scoped learner evidence

Status: active in Run 20.

Hypothesis:

If `ask_learner` must name one allowed target skill, a supported sorting prediction will update only `sorting` instead of broadcasting evidence across all problem skills.

Observed baseline:

- Real question tested a scoring comparator/data structure.
- Real prediction card updated four skills: `io-parsing · array · sorting · interval`.
- Question-scope rubric: question records one target 0/1; target constrained to problem skills 0/1; correct response updates only target 0/1; legacy prompt has safe single-skill fallback 0/1 — total 0/4.

Primary metric:

- Question-scope rubric target: 4/4 in tool validation/engine tests; real browser capability card contains only the model-selected target skill.

Guardrails:

- The model cannot name a skill outside `problem.skillIds`; invalid targets are rejected and returned for replanning.
- Existing persisted prompts without a target use one primary-skill fallback, never all skills.
- Do not rewrite historical learner evidence.
- Do not change probability weights, question wording, reference access, or mastery thresholds.
- Deterministic fallback questions still carry one target.

Evaluation scenario:

- Problem has `['io-parsing', 'array', 'sorting', 'interval']`.
- Model asks a comparator question with `targetSkillId: 'sorting'`; supported response produces exactly one twin change for sorting.
- A target outside the allowed list is rejected before a learner prompt is stored.

Revert threshold:

Revert if valid model questions stop working, invalid target skill reaches the twin, deterministic fallback loses its learner action, or regression/quality checks fail.

Measurement limitation:

This prevents evidence fan-out but still relies on model/tool-policy selection of the correct target; teacher-reviewed question-to-skill accuracy remains a future eval.

## Run 20 — Question-scoped learner evidence

### Hypothesis

Requiring each learner question to identify one allowed target skill will stop one supported answer from inflating every skill attached to the problem.

### Baseline

- The real comparator prediction updated four skills: `io-parsing · array · sorting · interval`.
- `ask_learner` did not carry a target skill, and `handleLearnerResponse` projected `prediction-correct` to all problem skills.
- Question-scope rubric: 0/4.

### Change

- Added required `targetSkillId` to the model-visible learner-question tool contract.
- Rejected targets outside the current problem skills and returned the rejection to the model for replanning.
- Persisted the target on the pending prompt and projected supported response evidence only to that skill.
- Deterministic fallback now selects one allowed target; legacy prompts fall back to at most the first current skill.
- Removed the unconditional `off-by-one` misconception attached to every supported prediction.
- Added the question-scoped evidence contract to the active OpenSpec change.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Question persists one target | 0/1 | 1/1 | Target met |
| Target constrained to current problem | 0/1 | 1/1 | Target met |
| Supported response updates only target | 0/1 | 1/1 | Target met |
| Legacy prompt avoids fan-out | 0/1 | 1/1 | Target met |
| Question-scope rubric | 0/4 | 4/4 | Target met |
| Full tests | 626/626 | 628/628 | No regression |

- Focused runtime test first failed 2/18 and then passed 18/18.
- In the production-like browser flow, DeepSeek selected `io-parsing`; PostgreSQL persisted that target, and the capability card changed only `io-parsing` from 21% to 24%.
- The same journey previously displayed four simultaneous skill changes.
- Full tests pass: 160 files / 628 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and global Skill validation pass.

### Decision

KEEP. The digital twin now records what the learner was actually asked to demonstrate instead of treating every question as evidence for the entire problem taxonomy.

### Learned

- The real-browser evaluation exposed the next trust defect: the learner's first answer — “4 rows: one header row plus M=3 score rows” — was semantically correct, but the conservative phrase matcher requested clarification.
- The model's expected concept expressed `1 + M`, while the learner expressed the equivalent instantiated arithmetic `1 + 3 = 4`; literal five-character overlap could not recognize that equivalence.
- A tutor that rejects a clearly correct explanation feels less intelligent than a conventional answer checker, even when its evidence scoping is correct.

### Next highest-value opportunity

Recognize high-confidence instantiated arithmetic explanations for structured input questions without relaxing the general conservative prediction policy.

## Active evaluation contract — equivalent structured-input predictions

Status: active in Run 21.

Hypothesis:

If the response evaluator recognizes the specific equivalence between a symbolic expected rule (`1 + M`) and a learner's instantiated explanation (`M=3`, therefore 4 rows), the Mentor will accept the correct first answer without increasing broad false-positive risk.

Observed baseline:

- Real question: with `M=3`, how many input rows including the first row?
- Expected concept: `input rows = 1 + M`, one parameter row plus M score rows.
- Learner response: one parameter row plus `M=3` score rows, therefore 4 rows.
- Runtime kept the learner in clarification and recorded no skill evidence.
- Equivalence rubric: symbolic rule identified 0/1; question variable resolved 0/1; instantiated total matched 0/1; unrelated numeric answer rejected 1/1 — total 1/4.

Primary metric:

- Equivalence rubric target: 4/4, and the exact real learner wording reaches `awaiting-edit` on the first response.

Guardrails:

- Apply only when the expected concept explicitly contains a simple `constant + variable` row-count rule and the question supplies that variable.
- Require the response to state both the computed total and row/input reasoning; a bare number is insufficient.
- Preserve clarification for unrelated explanations and all other ambiguous concepts.
- Do not add a model call, change twin weights, or broaden mastery claims.

Evaluation scenario:

- Expected `输入行数 = 1 + M`, question contains `M=3`, response says `一共4行：第一行是M,N，后面还有M=3行评分数据`.
- The response is accepted and updates only the pending target skill.
- `一共5行` and `我猜是4` remain unverified.

Revert threshold:

Revert if a wrong total or bare guess is accepted, existing boundary/comparator prediction tests regress, or full/browser checks fail.

Measurement limitation:

This closes one high-confidence equivalence class; it is not a general semantic-answer judge and should not be presented as one.

## Run 21 — Equivalent structured-input predictions

### Hypothesis

Recognizing one tightly bounded symbolic-to-instantiated arithmetic equivalence will prevent a clearly correct learner explanation from being rejected as ambiguous.

### Baseline

- Expected concept: `input rows = 1 + M`.
- Learner explained one header row plus `M=3` score rows and concluded four rows.
- The real production-like Mentor requested clarification instead of accepting the explanation.
- Equivalence rubric: 1/4.

### Change

- Added a narrow row-count equivalence check to learner-response assessment.
- The rule requires a simple `constant + variable` formula in the expected concept, a concrete variable assignment in the question, the correct computed row total, and explicit row/input structure reasoning in the response.
- Wrong totals and bare guesses remain unverified.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Symbolic row rule identified | 0/1 | 1/1 | Target met |
| Question variable resolved | 0/1 | 1/1 | Target met |
| Correct instantiated total accepted | 0/1 | 1/1 | Target met |
| Wrong total and bare guess rejected | 1/1 | 1/1 | Preserved |
| Equivalence rubric | 1/4 | 4/4 | Target met |
| Full tests | 628/628 | 629/629 | No regression |

- Focused runtime test first failed 1/19 and then passed 19/19.
- The exact learner wording observed in the browser now reaches `awaiting-edit` in the production runtime test; `5 rows` and `I guess 4` stay in clarification.
- The production-like gateway was rebuilt and remains healthy with PostgreSQL persistence and `deepseek-chat`.
- Full tests pass: 160 files / 629 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, stack smoke, and diff check pass.
- Formal Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases.

### Decision

KEEP. The tutor now accepts this provable explanation without weakening the general evidence threshold.

### Learned

- Question-scoped evidence is now technically real but remains mostly invisible until after a response updates the capability card.
- Before answering, the learner sees a question but not the adaptive decision: which capability is being tested and why only that capability will change.
- Hidden personalization produces little AI-native product perception even when the backend behavior is correct.

### Next highest-value opportunity

Expose the current question's target skill beside the prediction input, using a human-readable Chinese skill title and an explicit statement that only this capability is being evaluated.

## Active evaluation contract — visible adaptive training target

Status: active in Run 22.

Hypothesis:

If the prediction step names the one capability being tested and explains its evidence boundary, learners can perceive the adaptive decision before answering rather than discovering it only after a score changes.

Observed baseline:

- Browser shows the Mentor question and a generic `your state prediction` field.
- No visible target skill or explanation of why this question was selected.
- Perception rubric: target skill visible 0/1; human-readable title 0/1; single-skill evidence boundary explained 0/1; prediction input remains primary action 1/1 — total 1/4.

Primary metric:

- Perception rubric target: 4/4 in component tests and production-like browser DOM.

Guardrails:

- Render only when a valid pending target exists; legacy prompts remain usable without an empty card.
- Do not expose the expected answer, hidden evidence, internal IDs, or confidence scores.
- Keep the prediction input and submit button as the primary interaction.
- No new model call, route, dependency, or backend mutation.

Evaluation scenario:

- Pending prompt targets `array`; UI shows `本轮训练：数组与序列` and `答对只更新这一项能力证据` before the input.
- A legacy pending prompt without a target shows no target card and still renders the prediction form.

Revert threshold:

Revert if the card leaks expected concepts, breaks legacy sessions, obscures the prediction input, or frontend/full checks regress.

Measurement limitation:

DOM visibility is a UX proxy; whether learners can later explain the personalization still needs moderated first-use testing.

## Run 22 — Visible adaptive training target

### Hypothesis

Showing the selected capability before the learner answers will make the adaptive decision legible without weakening the prediction-first teaching flow.

### Baseline

- The prediction panel showed only a generic question and input.
- The target skill existed in PostgreSQL but was invisible to the learner until a later capability update.
- Perception rubric: 1/4.

### Change

- Added the pending question target to the typed web Mentor session contract.
- Resolved recognized skill IDs to localized, human-readable curriculum titles.
- Added a compact target card immediately beside the prediction action: `AI selected the training target`, `This round trains: <skill>`, and an explicit single-skill evidence boundary.
- Added OpenSpec scenarios for recognized targets and target-less legacy prompts.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Target skill visible before answer | 0/1 | 1/1 | Target met |
| Human-readable localized title | 0/1 | 1/1 | Target met |
| Single-skill evidence boundary explained | 0/1 | 1/1 | Target met |
| Prediction remains primary action | 1/1 | 1/1 | Preserved |
| Perception rubric | 1/4 | 4/4 | Target met |
| Full tests | 629/629 | 629/629 | No regression |

- The component test first failed because no `本轮训练技能` region existed, then passed 12/12.
- In the real production-like browser journey, the active comparator question displayed `本轮训练：排序` and `答对只更新这一项能力证据` directly above the still-active prediction field.
- The card exposes neither the expected concept nor hidden evidence or confidence.
- Full tests pass: 160 files / 629 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Lazy ProblemReader grew from 56.69/18.96 kB to 57.14/19.11 kB gzip; initial JavaScript remains 383.13/122.34 kB gzip.

### Decision

KEEP. A previously hidden adaptive behavior is now visible at the moment it matters, with a clear evidence boundary instead of decorative AI branding.

### Learned

- The browser now communicates what the AI is testing, but the surrounding prediction controls still contain legacy 9 px label/input/button typography in `App.css`.
- That violates the product's own readability rule of at least 14 px body/action text and is especially harmful for beginners and laptop split-screen use.
- Formal learning-effect claims remain blocked by the honest Mentor v2 gate: 0/100 eligible teacher-adjudicated cases.

### Next highest-value opportunity

Normalize the Mentor interaction typography to the existing readability standard, measure the rendered prediction controls at desktop and narrow widths, and preserve the code workspace density through spacing rather than sub-10-pixel text.

## Active evaluation contract — readable Mentor prediction controls

Status: active in Run 23.

Hypothesis:

Raising Mentor prediction labels, input text, and the submit action from 9 px to the 14 px interaction standard will improve immediate legibility without causing horizontal overflow or hiding the primary action in the split workspace.

Observed baseline:

- `.mentor-prediction label`, input, and button explicitly use 9 px.
- Supporting copy resolves to the 12 px meta token through the later global override.
- Real 1280×720 browser screenshot shows the prompt controls as visibly smaller than the surrounding problem and code text.
- Readability rubric: label >=14 px 0/1; input >=14 px 0/1; action >=14 px 0/1; supporting copy >=12 px and row remains usable 1/1 — total 1/4.

Primary metric:

- Readability rubric target: 4/4, with the input and submit action both visible in the real split workspace.

Guardrails:

- Preserve one-row input/action layout where at least 320 px is available.
- At narrow widths, wrap the action to a full-width button rather than shrinking text.
- Do not change Mentor logic, wording, routes, model calls, or evidence projection.
- Initial JavaScript bundle must not grow; CSS growth should remain below 0.5 kB gzip.

Evaluation scenario:

- Static style contract asserts 14 px label/input/button and 12 px supporting copy.
- Component interaction test still enters and submits a prediction.
- Real 1280×720 browser view keeps both input and submit action visible; narrow CSS path stacks them without overflow.

Revert threshold:

Revert if the submit action disappears, input width collapses, the Mentor panel overflows horizontally, CSS grows above the threshold, or frontend/full checks regress.

Measurement limitation:

Rendered visibility and CSS dimensions prove legibility mechanics, not comprehension; beginner usability still needs moderated testing.

## Run 23 — Readable Mentor prediction controls

### Hypothesis

Readable interaction typography can improve the prediction step without sacrificing the LeetCode-style split workspace density.

### Baseline

- Label, input, and submit action were all 9 px.
- The real 1280×720 screenshot made the prediction action visibly smaller than the surrounding code and problem content.
- Readability rubric: 1/4.

### Change

- Raised the prediction label, input, and button to 14 px.
- Added 44 px minimum input/action height and retained 12 px supporting copy.
- Added a <=420 px fallback that stacks the action full-width instead of shrinking text.
- Added a dedicated static readability contract test.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Label >=14 px | 0/1 | 1/1 | Target met |
| Input >=14 px | 0/1 | 1/1 | Target met |
| Action >=14 px | 0/1 | 1/1 | Target met |
| Support >=12 px and usable layout | 1/1 | 1/1 | Preserved |
| Readability rubric | 1/4 | 4/4 | Target met |
| Full tests | 629/629 | 631/631 | No regression |

- Focused tests first failed 2/2, then passed 14/14 across style and interaction coverage.
- The real 1280×720 browser screenshot keeps the larger input and submit action visible on one row inside the split workspace.
- Full tests pass: 161 files / 631 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- CSS changed from 149.15/26.80 kB to 149.36/26.84 kB gzip (+0.21/+0.04 kB); initial JavaScript remains 383.13/122.34 kB gzip.

### Decision

KEEP. The primary Mentor action is materially easier to read with negligible asset cost and no workspace regression.

### Learned

- The action is readable once focused, but the JSX still renders every timeline event and execution trace before the target and prediction form.
- In the initial 1280×720 view the prediction control is below the visible Mentor region; clicking it programmatically scrolls the panel before it appears.
- Agent trace is important evidence, but making learners traverse it before answering reverses the product hierarchy: system process outranks learner action.

### Next highest-value opportunity

Move the active target and prediction action directly after the current phase/next-step summary, before detailed Agent events and executions; keep the evidence fully available below.

## Active evaluation contract — learner action before Agent trace

Status: active in Run 24.

Hypothesis:

Placing the current learner action before the Agent trace will reduce interaction discovery friction while preserving all evidence and AI provenance.

Observed baseline:

- DOM order is phase summary -> capability/transfer -> timeline events -> executions -> target -> prediction form.
- Real initial split-workspace screenshot does not show the prediction input; focusing the input causes the panel to scroll before it becomes visible.
- Action-priority rubric: question/next step visible 1/1; target/form before event trace 0/1; form before execution trace 0/1; evidence remains accessible 1/1 — total 2/4.

Primary metric:

- Action-priority rubric target: 4/4 and initial real-browser view reaches the active prediction controls before any detailed event cards.

Guardrails:

- Preserve every timeline event, evidence reference, execution trace, and technical disclosure.
- Do not change event data, model behavior, answer evaluation, or persisted session state.
- Target card remains immediately adjacent to the prediction form.
- Non-prediction phases retain their existing capability and transfer actions.

Evaluation scenario:

- Component awaiting prediction renders target -> form -> event timeline -> execution details in that order.
- Prediction submission still reaches the same Mentor session endpoint and changes phase.
- Real 1280×720 page exposes the active action without requiring traversal of event history.

Revert threshold:

Revert if evidence disappears, prediction submission breaks, transfer/capability cards reorder incorrectly, the initial viewport regresses, or full checks fail.

Measurement limitation:

DOM and viewport order reduce mechanical friction; actual time-to-response needs product telemetry or moderated observation.

## Run 24 — Learner action before Agent trace

### Hypothesis

Making the question and response control the first Mentor content will expose the actual learning action without sacrificing trustworthy Agent evidence.

### Baseline

- Prediction form followed attempt metadata, AI receipt, loop progress, events, and execution trace.
- The initial 1280×720 split-workspace screenshot showed no prediction control; focusing it caused an internal scroll.
- Action-priority rubric: 2/4.

### Change

- Moved the pending question and prediction form immediately below the Mentor header.
- Combined the human-readable target, single-skill evidence boundary, full question, readable input, and submit action into one compact active task.
- Kept attempt snapshot, platform disclosure, AI receipt, stop reason, loop progress, every event, evidence reference, and execution detail below.
- Added an OpenSpec requirement that the learner action precede the Agent trace.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Current question visible first | 1/1 | 1/1 | Preserved and expanded |
| Form before event history | 0/1 | 1/1 | Target met |
| Form before metadata/AI/execution proof | 0/1 | 1/1 | Target met |
| All evidence remains accessible | 1/1 | 1/1 | Preserved |
| Action-priority rubric | 2/4 | 4/4 | Target met |
| Full tests | 631/631 | 631/631 | No regression |

- The first partial reorder passed a narrow DOM test but failed the real screenshot because metadata still occupied the first viewport; it was not accepted.
- The strengthened test failed until the form preceded both attempt binding and AI receipt, then focused tests passed 14/14.
- A fresh, untouched 1280×720 browser load now shows the full Mentor question and the input/submit action in the lower pane before any evidence cards.
- Full tests pass: 161 files / 631 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- CSS changed from 149.36/26.84 kB to 149.45/26.85 kB gzip (+0.09/+0.01 kB); initial JavaScript remains 383.13/122.34 kB gzip.

### Decision

KEEP. The interface now expresses the correct hierarchy: learner action first, Agent provenance second.

### Learned

- The active Mentor step is now visible and readable, so further local styling work has diminishing value compared with the upstream activation journey.
- The next product-level question is whether the Today page gets a learner from “open the app” to this evidence-bound interaction quickly and explains why the chosen task is personally relevant.

### Next highest-value opportunity

Re-observe the current Today/onboarding journey in a fresh browser state, measure the number and clarity of actions before the first runnable AI training task, and choose the smallest activation improvement supported by that evidence.

## Active evaluation contract — truthful anonymous storage status

Status: active in Run 25.

Hypothesis:

Showing an unauthenticated learner the truthful local-storage state instead of a failed cloud-sync state will remove a false first-minute error signal without hiding real sync failures for authenticated accounts.

Observed baseline:

- A clean anonymous visit reaches the first runnable learning example in seven clicks: start diagnosis, answer three auto-advancing questions, start the ten-minute training, acknowledge the plain-language explanation, then run the first small step.
- The diagnosis result explains the three observed actions, why array traversal was selected, what can change the plan, and that this is not mastery proof.
- Despite having no signed-in account and therefore no cloud state to synchronize, the global header displays `同步待重试` after session restoration fails.
- First-minute trust rubric: adaptive reason visible 1/1; runnable task within seven direct actions 1/1; no false failure state 0/1; local-data truth visible 0/1 — total 2/4.

Primary metric:

- First-minute trust rubric target: 4/4. An anonymous session must show `仅保存在本机` even when the optional account service cannot restore a session; an authenticated sync error must continue to show `同步待重试`.

Guardrails:

- Do not suppress or relabel a real sync error for an authenticated account.
- Do not change authentication, session restoration, outbox behavior, routes, diagnosis logic, or learning recommendations.
- Keep the existing status classes so visual state styling remains stable.
- No production JavaScript growth beyond negligible render-branch output.

Evaluation scenario:

- Component test renders an unauthenticated session with `syncStatus="error"` and expects the local-storage label and local status class.
- Component test renders an authenticated session with the same error and still expects the retry label and error status class.
- Real anonymous browser state that previously showed `同步待重试` shows `仅保存在本机` after reload.

Revert threshold:

Revert if authenticated failures are hidden, the account control becomes inaccessible, frontend checks regress, or the real anonymous header remains misleading.

Measurement limitation:

This removes a false trust penalty; it does not prove that users understand account migration or that cloud synchronization itself is reliable.

## Run 25 — Truthful anonymous storage status

### Hypothesis

An anonymous learner should see the storage state that actually applies to them, not a cloud-sync failure for an account they have not created.

### Baseline

- Fresh-user observation reached the first runnable small program in seven direct clicks with a clear three-action diagnosis and a justified ten-minute recommendation.
- The same anonymous first screen displayed `同步待重试` after optional session restoration failed.
- First-minute trust rubric: 2/4.

### Change

- Derived the account-header status from both identity and sync state.
- Anonymous sessions now always disclose `仅保存在本机` with the local status treatment.
- Authenticated sessions still expose `正在同步`, `云端已同步`, or `同步待重试` exactly as before.
- Added separate component contracts for anonymous restore failure and authenticated sync failure.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Adaptive reason visible | 1/1 | 1/1 | Preserved |
| Runnable task within seven direct actions | 1/1 | 1/1 | Preserved |
| No false anonymous failure state | 0/1 | 1/1 | Target met |
| Truthful local-storage status visible | 0/1 | 1/1 | Target met |
| First-minute trust rubric | 2/4 | 4/4 | Target met |
| Focused component tests | 3/3 existing | 5/5 | New contracts pass |
| Full tests | 631/631 | 633/633 | No regression |

- The new anonymous contract failed first because the component rendered `.account-sync.error` and `同步待重试`; it passed after the identity-aware display rule.
- A real anonymous browser session that previously showed the retry warning now shows `仅保存在本机`, with no retry text present.
- Full tests pass: 161 files / 633 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- CSS is unchanged at 149.45/26.85 kB gzip. Initial JavaScript changed from 383.13/122.34 kB to 383.16/122.38 kB gzip (+0.03/+0.04 kB), within the negligible branch-output guardrail.

### Decision

KEEP. The header now tells a new learner the truth about their data without hiding real failures from signed-in users.

### Learned

- The adaptive onboarding itself is materially stronger than its old product framing: it observes three actions, explains the chosen starting point, names uncertainty, and hands off into a runnable ten-minute lesson.
- The most visible remaining contradiction is brand-level. The shell still calls the whole product `OD 算法学习教练`, even though the validated product thesis defines OD as one initial content source and TIA as the algorithm-bridge product.
- This creates the wrong expectation before the learner can perceive the broader learn-transfer-apply system.

### Next highest-value opportunity

Align the persistent app identity with the current product thesis: present TIA and the algorithm-bridge promise in the shell, while retaining OD only where it truthfully identifies a problem source or exam track.

## Active evaluation contract — trustworthy first-run activation metric

Status: active in Run 26. The brand candidate is intentionally deferred because naming requires an explicit human decision; this metric-integrity fix does not.

Prioritization:

| Candidate | Impact | Confidence | Effort | Risk | Decision |
|---|---:|---:|---:|---:|---|
| Correct polluted first-run activation evidence | 5 | 5 | 1 | 1 | Selected |
| Rename persistent shell from OD to TIA | 5 | 5 | 1 | 3 | Deferred for human brand approval |
| Increase training-cabin visual contrast | 3 | 2 | 2 | 2 | Observe later with user evidence |

Hypothesis:

Making `first-minute-first-run` a one-time learning fact and deriving duration from the earliest valid run after the matching mission will keep the core activation KPI stable after later frames, reloads, and legacy duplicate events.

Observed baseline and root cause:

- The starter training cabin emits `first-minute-first-run` every time `运行这一小步` is clicked; the array lesson has three observation frames, so one normal journey emits the same semantic event three times.
- `deriveFirstMinuteMetrics` selects the latest event of that kind, so the measured “first run” moves later as the learner continues training.
- The problem-workspace flow already guards first-run emission, but the training-cabin and legacy/reloaded lesson paths do not provide a global storage invariant.
- Metric-integrity rubric: first-run event stored once 0/1; earliest matching post-mission run used 0/1; later duplicate cannot change duration 0/1; malformed/pre-mission events excluded 1/1 — total 1/4.

Primary metric:

- Metric-integrity rubric target: 4/4. A 09:00 mission, 09:02:10 first run, and any number of later duplicates must remain 2.17 minutes and under three minutes.

Guardrails:

- Preserve all real training-stage events and later lesson progression.
- Do not manufacture a first-run when no matching post-mission run exists.
- Match the run to the mission lesson; an unrelated lesson must not satisfy the KPI.
- Preserve imported legacy events rather than rewriting or deleting learner history.
- Do not change the learner-visible training sequence or mastery logic.

Evaluation scenario:

- A learning-memory test records `first-minute-first-run` twice and proves only the first fact is appended.
- A metric test includes a matching first run, a later duplicate, an unrelated-lesson run, and a pre-mission run; duration must remain anchored to the first valid matching run.
- Existing training journey tests and full checks remain green.

Revert threshold:

Revert if a legitimate first run is lost, unrelated lessons are paired, activation becomes measurable without a valid mission/run pair, any training stage regresses, or full checks fail.

Measurement limitation:

This makes the metric mathematically trustworthy. It does not create real-user samples or prove that the under-three-minute target is achieved across the population.

## Run 26 — Trustworthy first-run activation metric

### Hypothesis

The first runnable action must remain an immutable activation fact; continuing the lesson must never make the recorded first-run time worse.

### Baseline

- A normal three-frame starter lesson emitted three `first-minute-first-run` signals.
- The metric selected the latest duplicate, turning a true 2.17-minute first run into 8 minutes in the deterministic reproduction.
- An unrelated lesson run could also satisfy the metric because mission/run lesson IDs were not paired.
- Metric-integrity rubric: 1/4.

### Change

- Made `first-minute-first-run` idempotent at the learner-memory boundary, so all UI entry paths share one storage invariant.
- Changed activation projection to use the earliest mission and the earliest matching-lesson run at or after that mission.
- Preserved legacy duplicate events in history while making their projection stable.
- Added regressions for duplicate writes, pre-mission runs, unrelated lessons, and later-frame duplicates.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| First-run fact stored once | 0/1 | 1/1 | Target met |
| Earliest matching post-mission run used | 0/1 | 1/1 | Target met |
| Later duplicate cannot change duration | 0/1 | 1/1 | Target met |
| Pre-mission/unrelated evidence excluded | 1/1 | 1/1 | Preserved and strengthened |
| Metric-integrity rubric | 1/4 | 4/4 | Target met |
| Deterministic activation duration | 8.00 min | 2.17 min | Corrected |
| Full tests | 633/633 | 635/635 | No regression |

- Both new tests failed first: memory contained two first-run facts and the projection reported 8 minutes instead of 2.17.
- Focused learner-memory, metric, training-cabin, and lesson coverage passes 26/26.
- Full tests pass: 161 files / 635 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- A fresh real browser tab loads the ten-minute training mission without a runtime error after the change.
- CSS remains 149.45/26.85 kB gzip. Initial JavaScript changed from 383.16/122.38 kB to 383.25/122.41 kB gzip (+0.09/+0.03 kB).

### Decision

KEEP. The activation KPI now represents the first action instead of the learner's most recent observation-frame click.

### Learned

- Core outcome metrics need invariants at both write and projection boundaries: UI-only deduplication cannot repair imported or historical duplicate events.
- `LearnerMemory` intentionally retains only the newest 500 events. Therefore the earliest mission and first-run facts can eventually age out, making activation evidence disappear for long-lived local accounts.
- Real population performance remains unmeasurable until consented server-side product analytics or an aggregate metric store exists; local deterministic evidence only proves calculation correctness.

### Next highest-value opportunity

Audit the 500-event retention boundary against every longitudinal metric. Select the smallest evidence-preservation design that keeps lifecycle facts measurable without turning the bounded learning log into an unbounded privacy or storage liability.

## Active evaluation contract — acknowledge diagnostic learning without fake mastery

Status: active in Run 27. The retention audit remains a confirmed architectural candidate, but a real-browser cross-page contradiction has higher immediate user impact.

Hypothesis:

When a learner has completed entrance-diagnosis actions but has no code-submission mastery evidence yet, the ability page should acknowledge what the AI actually observed, clearly separate it from mastery, and return the learner to the adaptive training path.

Observed baseline and root cause:

- In a real browser session after all three entrance-diagnosis actions and entry into the ten-minute lesson, `#/insights` displays `0 条证据` and `先完成一个 8 分钟练习`.
- The Today and training pages say the AI used three observed actions to choose array traversal, so the ability page directly contradicts the preceding journey.
- `InsightsPage` derives its only visible evidence state from `SkillMastery`, which intentionally counts code submissions only; it receives learning events but uses them only for collapsed replay/project sections.
- The correct rule is not to turn diagnosis into mastery. The missing behavior is a separate, learner-visible formative-evidence state.
- Cross-page truth rubric: observed actions acknowledged 0/1; mastery boundary explicit 0/1; adaptive continuation action 0/1; no diagnostic-to-mastery promotion 1/1 — total 1/4.

Primary metric:

- Cross-page truth rubric target: 4/4 in component tests and the same real browser session.

Guardrails:

- Diagnostic steps must never increase a skill mastery percentage, confidence, or mastery evidence count.
- Continue displaying zero mastery evidence until a qualifying code submission exists.
- Use only event-projected diagnostic observations and their existing human-readable labels; do not invent an AI judgment.
- Preserve the true cold-start baseline action when no diagnosis evidence exists.
- Do not change routes, diagnosis scoring, learner memory, or mastery projection.

Evaluation scenario:

- With three diagnostic events and no mastery, the page shows `0 条掌握证据`, `AI 已记录 3 个入口动作`, all three observed capabilities, an explicit non-mastery boundary, and `继续 AI 训练` linking to Today.
- With no diagnostic or mastery evidence, the existing first-practice empty state remains.
- A real browser session that already completed diagnosis no longer claims that no evidence exists.

Revert threshold:

Revert if diagnosis changes mastery, the cold-start action disappears, labels diverge from the diagnostic projection, the continuation route is wrong, or full/browser checks regress.

Measurement limitation:

This repairs perceived continuity and truthfulness. It does not prove that the learner understands the distinction between formative actions and mastery without moderated user research.

## Run 27 — Acknowledge diagnostic learning without fake mastery

### Hypothesis

The ability page can make AI observation perceptible while preserving the stricter rule that only qualifying code and transfer evidence changes mastery.

### Baseline

- The real completed-diagnosis browser session showed `0 条证据` and told the learner to start an unrelated eight-minute practice.
- Today and the training cabin had already explained that three observed actions selected the lesson.
- Cross-page truth rubric: 1/4.

### Change

- Renamed the header metric to `掌握证据`, preserving zero until real mastery evidence exists.
- Projected the existing three-step diagnostic snapshot into a separate formative-evidence empty state.
- Displayed the exact observed action labels and stable/needs-practice result from the same event projection used by the training handoff.
- Added a clear non-mastery boundary and one `继续 AI 训练` action back to Today.
- Preserved the original cold-start practice action for a learner with no diagnosis or mastery evidence.
- Added a narrow-width single-column fallback for the three evidence cards.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Entrance actions acknowledged | 0/1 | 1/1 | Target met |
| Mastery boundary explicit | 0/1 | 1/1 | Target met |
| Adaptive continuation action | 0/1 | 1/1 | Target met |
| No diagnosis-to-mastery promotion | 1/1 | 1/1 | Preserved |
| Cross-page truth rubric | 1/4 | 4/4 | Target met |
| Full tests | 635/635 | 636/636 | No regression |

- The component contract failed first on the old `0 条证据` state, then passed with all three projected observation labels and the Today continuation link.
- A real browser session now shows `0 条掌握证据`, `AI 已记录 3 个入口动作`, all three observations, the mastery boundary, and `继续 AI 训练`; the old eight-minute empty state is absent.
- The rendered desktop card is readable and balanced; <=760 px uses one evidence column.
- Full tests pass: 161 files / 636 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- CSS changed from 149.45/26.85 kB to 150.39/26.98 kB gzip (+0.94/+0.13 kB). The algorithm knowledge graph now splits into a lazy 30.17/11.20 kB chunk, reducing initial JavaScript from 383.25/122.41 kB to 353.26/111.55 kB gzip (-29.99/-10.86 kB).

### Decision

KEEP. The product now carries the AI's observation across pages without pretending that a short diagnosis proves mastery.

### Learned

- `learningEvents` were already available to the ability page; the gap was information hierarchy, not missing AI or storage infrastructure.
- Separating `formative action evidence` from `mastery evidence` creates a clearer product language that can extend to lessons, projects, and delayed reviews.
- The earlier retention finding remains valid: both activation and prerequisite evidence can disappear after local 500-event truncation even though PostgreSQL retains the full signed-in history.

### Next highest-value opportunity

Define the minimum bounded longitudinal projection needed to survive event-log truncation: activation facts, completed prerequisites, latest transfer status, and due delayed reviews. Keep raw local events bounded and keep server PostgreSQL authoritative rather than pinning an unbounded set of historical events.

## Active evaluation contract — resume means resume

Status: active in Run 28. The bounded longitudinal projection remains the highest architectural candidate; this deterministic continuation bug is selected first because it is smaller, user-visible, and fully testable.

Hypothesis:

If learning events prove that the diagnosis-selected training session already started, every continuation action should say `继续` and open that training route directly instead of returning to Today and presenting another `开始` action.

Observed baseline:

- Clicking the new ability-page `继续 AI 训练` link routes to `#/today`.
- The real resumed Today page shows the diagnosis result again and labels the mission action `开始 10 分钟训练`, even though a `training-session-started` event already exists.
- The actual training cabin can restore stage progress, so the loss is navigation semantics and an unnecessary intermediate screen rather than missing state.
- Resume-continuity rubric: direct route to selected lesson 0/1; started session uses `继续` 0/1; not-started session still uses `开始` 1/1 — total 1/3.

Primary metric:

- Resume-continuity rubric target: 3/3 across ability-page and Today-page component contracts plus the existing real browser state.

Guardrails:

- Derive the lesson only from the event-projected bridge plan; never hard-code a training ID.
- A completed diagnosis without `training-session-started` must continue to say `开始`.
- A start event for another lesson must not change the selected lesson action.
- Preserve training-stage restoration, diagnosis evidence, cold start, routes, and mastery behavior.

Evaluation scenario:

- Ability page with completed diagnosis and matching training start links directly to `#/training/<entryLessonId>` and says `继续 10 分钟训练`.
- Today diagnosis result with the same events says `继续 10 分钟训练` and opens the projected lesson.
- Completed diagnosis without a matching start retains `开始 10 分钟训练`.

Revert threshold:

Revert if a cold session is mislabeled, the wrong lesson opens, diagnosis evidence disappears, browser back/resume breaks, or full checks regress.

Measurement limitation:

This removes one redundant screen and a false label. Time-to-resume at population scale still requires interaction telemetry.

## Run 28 — Resume means resume

### Hypothesis

The same event-projected lesson and start evidence can make continuation direct and semantically accurate across Today and the ability page.

### Baseline

- Ability-page continuation routed to Today instead of the active training lesson.
- Today then displayed `开始 10 分钟训练` despite matching `training-session-started` evidence.
- Resume-continuity rubric: 1/3.

### Change

- Derived the selected bridge lesson on the ability page with the existing bridge plan projection.
- Linked directly to the projected training route.
- Changed both ability and Today diagnosis-result actions to `继续 10 分钟训练` only when a matching lesson start event exists.
- Preserved `开始 10 分钟训练` for a completed diagnosis whose selected lesson has not started, and `继续入口诊断` for partial diagnosis.
- Added independent component contracts for ability-page direct start/resume and Today resume labeling.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Direct route to selected lesson | 0/1 | 1/1 | Target met |
| Started session uses `继续` | 0/1 | 1/1 | Target met |
| Not-started session retains `开始` | 1/1 | 1/1 | Preserved |
| Resume-continuity rubric | 1/3 | 3/3 | Target met |
| Full tests | 636/636 | 638/638 | No regression |

- Three focused contracts failed first on the old Today indirection and false `开始` label, then the focused suite passed 13/13.
- In the existing real browser session, Today shows `继续 10 分钟训练`, the ability link resolves to `#/training/starter-array-traversal`, and one click lands on the restored array training mission.
- Full tests pass: 161 files / 638 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- CSS remains 150.39/26.98 kB gzip. Initial JavaScript changed from 353.26/111.55 kB to 353.40/111.58 kB gzip (+0.14/+0.03 kB); the lazy Insights chunk changed from 9.07/3.27 kB to 9.33/3.40 kB gzip (+0.26/+0.13 kB).

### Decision

KEEP. Resume now means returning directly to the selected in-progress lesson, and the language reflects persisted state.

### Learned

- Existing event projection was sufficient; the friction came from routing through a generic page and ignoring start evidence in action copy.
- The resume contract should be reused anywhere a mission card appears so `开始`, `继续`, and `复测` remain state-derived rather than hand-written.
- The 500-event truncation remains the next material correctness risk because it can erase the very start/completion facts now driving accurate continuation.

### Next highest-value opportunity

Create an OpenSpec design for a bounded longitudinal projection rather than patching retention ad hoc. The design must keep raw local events bounded, preserve prerequisite/activation/transfer/review facts, migrate existing v1 memory and backups, and use PostgreSQL as signed-in authority.

## Evaluation contract — preserve bounded longitudinal learning state

Status: implemented and evaluated in Run 29.

Hypothesis:

Replacing plain newest-500 truncation with a deterministic 200-milestone / 300-recent projection will keep the product's activation, prerequisite, resume, transfer, and project claims correct for long-lived learners without making local storage unbounded or inventing evidence.

Observed baseline:

- Browser memory and the file-local gateway kept only the newest 500 events.
- An old first-minute mission, lesson completion, training start, transfer pass, or practicum completion disappeared after 500 ordinary newer events.
- The UI selectors therefore lost first-run measurement, prerequisites, resume position, transfer status, and project completion even though PostgreSQL still had the signed-in history.
- Longitudinal-survival rubric: exact 500 bound 1/1; activation 0/1; prerequisite 0/1; resume 0/1; transfer 0/1; project completion 0/1; browser/gateway parity 0/1 — total 1/7.

Primary metric:

- Longitudinal-survival rubric target: 7/7 with exact source event IDs, at least the newest 300 events, and no synthetic mastery or completion.

Guardrails:

- Keep browser and file-local histories at or below 500 events.
- Reserve no more than 200 milestone slots and retain at least 300 newest events.
- Preserve exact validated events and evidence identifiers; never manufacture a fact absent from the input.
- Keep PostgreSQL event history complete and authoritative.
- Require browser/gateway event-ID parity and project 5,000 events in under 500 ms on the supported local runtime.
- Preserve memory v1 and backup v5 compatibility.

Evaluation scenario:

- Feed activation, diagnosis, lesson completion, active training stages, transfer, and project completion followed by 520 ordinary events into every bounded storage path.
- Verify first-run duration, next lesson, active training stage, transfer status, and project completion remain derivable.
- Re-import an existing v5 backup with and without an old milestone.
- Bootstrap 521 events from PostgreSQL and prove it remains untruncated before browser projection.

Revert threshold:

Revert if local history exceeds 500, fewer than 300 newest events survive, a missing fact is synthesized, browser/gateway parity diverges, existing selectors regress, or the 5,000-event probe exceeds 500 ms.

Measurement limitation:

The initial 200/300 split is a safety default, not yet tuned from production event distributions. Evidence already absent from an old truncated local backup cannot be reconstructed; only a complete PostgreSQL bootstrap can recover it.

## Run 29 — Preserve bounded longitudinal learning state

### Hypothesis

A bounded semantic projection can protect the evidence behind user-visible learning continuity while preserving the existing privacy and storage ceiling.

### Baseline

- Plain newest-500 truncation erased every tested old milestone after 520 ordinary newer events.
- Longitudinal-survival rubric: 1/7.
- Browser bootstrap also truncated the complete PostgreSQL response immediately.

### Change

- Added a pure browser retention policy: exact chronological events, ID deduplication, three mandatory earliest activation facts, latest keyed longitudinal milestones, and newest-event fill to exactly 500.
- Added a contract-equivalent gateway policy and an explicit cross-runtime event-ID parity test.
- Applied projection to browser parse/append, backup import, file/memory gateway load, and gateway append.
- Recovered milestones from up to 5,000 file-local replay receipts when exact original evidence still exists.
- Left PostgreSQL unbounded and verified a 521-event bootstrap returns the complete history.
- Documented local bounded durability and PostgreSQL recovery authority without changing memory v1 or backup v5 formats.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Local event hard bound | 500 | 500 | Preserved |
| Minimum recent window | 500 newest only | ≥300 newest | Target met |
| Activation facts survive | 0/1 | 1/1 | Target met |
| Prerequisite survives | 0/1 | 1/1 | Target met |
| Training resume survives | 0/1 | 1/1 | Target met |
| Transfer evidence survives | 0/1 | 1/1 | Target met |
| Project completion survives | 0/1 | 1/1 | Target met |
| Browser/gateway parity | Unspecified | Exact event-ID parity | Target met |
| Longitudinal-survival rubric | 1/7 | 7/7 | Target met |
| 5,000-event projection | Not measured | 3.57 ms | Under 500 ms |
| Full tests | 638/638 | 650/650 | No regression |

- Focused retention, bootstrap, backup, file recovery, parity, and performance suites pass.
- Full tests pass: 165 files / 650 tests. Lint, web+gateway typecheck, production build, both strict OpenSpec validations, and diff check pass.
- Production assets remain healthy: CSS 150.39/26.98 kB gzip; initial JavaScript 354.78/111.93 kB gzip.
- In the real browser, Today still displays all three diagnosis actions and `继续 10 分钟训练`; one click returns directly to the restored `02 / 看见每一步` stage. The ability page still shows zero mastery evidence separately from three formative actions and links directly to the same training route.
- The real browser export action completes without breaking the page. v5 round-trip, long-history import, honest absence, and legacy-v2 import paths pass automated integration tests; the connected browser controller does not expose a file-upload primitive for a live import chooser replay.

### Decision

KEEP. The system now stays locally bounded without forgetting the exact evidence used to explain what the learner did, what remains unlocked, and where training resumes.

### Learned

- A small retention policy can protect multiple user-visible flows because those flows already share semantic learning events.
- Preserving exact event IDs is more valuable than storing more raw noise: metrics, evidence links, and explanations remain auditable.
- PostgreSQL authority and bounded offline state are complementary; local state supports continuity, while signed-in complete history supports recovery.
- The 200/300 split needs real distribution telemetry before further tuning, but the hard invariants are now executable rather than aspirational.

### Next highest-value opportunity

Audit whether the visible `持续导师` state matches the real gateway/model condition on every route. The current real browser still says `导师暂不可用` and `等待可解释的学习证据` on the ability page even while the product presents AI-derived diagnosis elsewhere; this cross-surface status mismatch can undermine the user's trust in the product's intelligence more directly than another content or page expansion.

## Active evaluation contract — make Mentor availability truthful and useful

Status: active in Run 30.

Hypothesis:

Separating the always-available local evidence-based learning planner from the optional deep code Mentor will remove the visible contradiction between `AI 已记录 3 个入口动作` and `导师暂不可用`, while a route-derived next action will make the dock useful even before a model or tool run exists.

Observed baseline:

- The real ability page presents three AI-observed entrance actions and an adaptive training route.
- On the same screen, the persistent Mentor says `导师暂不可用，当前不生成 AI 结论` and `等待可解释的学习证据`.
- With no gateway URL, the dock correctly performs no remote calls, but it describes the whole product as unavailable instead of distinguishing local planning from deep code analysis.
- Status-coherence rubric: distinct local/deep layers 0/1; no fake model/tool activity 1/1; route-derived next action 0/1; remote failure preserves local availability 0/1 — total 1/4.

Primary metric:

- Status-coherence rubric target: 4/4 in component contracts and the existing real browser session.

Guardrails:

- Never claim a model, agent tool, or deep code diagnosis ran when the gateway is absent or failed.
- Do not make a remote call when `baseUrl` is empty.
- Preserve remote connecting, compiled, agent-analysis, recovery, approval, and route-isolation behavior.
- Preserve assessment suppression and the one-Mentor-surface rule.
- Derive the local fallback action only from the current route contribution; do not hard-code a cross-route action.

Evaluation scenario:

- With no gateway and a Today/Insights route contribution, show local evidence planning as available, disclose that deep code analysis is not connected, disclose zero dynamic tools/model activity, and display the contribution's next action.
- When a configured client rejects, retain the same local availability boundary while truthfully reporting the deep Mentor connection failure.
- When a configured run succeeds, keep the existing verified timeline and checkpoint behavior.

Revert threshold:

Revert if the UI implies DeepSeek or a dynamic tool ran locally, route actions leak across workspaces, remote recovery/approval regresses, the dock makes a request without a base URL, or the full/browser checks regress.

Measurement limitation:

This makes capability boundaries visible and coherent. It does not by itself increase Mentor diagnosis quality or prove that users understand the distinction without moderated usability research.

## Run 30 — Make Mentor availability truthful and useful

### Hypothesis

Naming the local planner and deep code Mentor as separate layers will make the AI experience more credible, while a route-scoped fallback action will keep the persistent dock useful before any runtime evidence exists.

### Baseline

- Insights showed three AI-observed entrance actions beside `导师暂不可用，当前不生成 AI 结论`.
- The empty dock said `等待可解释的学习证据` even though the route contribution already contained a next action.
- The sidebar's `导师状态 · 只在需要时提供帮助` did not identify which capability was actually online.
- Status-coherence rubric: 1/4.

### Change

- Split Mentor lifecycle into `local`, `connecting`, `compiled`, `agent`, and `degraded` states.
- No-gateway state now says `本地学习编排在线 · 深度代码导师未连接`.
- Gateway failure now says `深度代码导师连接失败 · 本地学习编排仍可用`.
- Both local-only states explicitly state that no model or dynamic tool was called and explain when code diagnosis becomes available.
- Empty-runtime next action now comes from the current validated route contribution, with a neutral current-page fallback.
- Sidebar status now names the always-available layer: `学习编排在线 · 根据你的学习证据安排下一步`.
- Preserved configured runtime timelines, checkpoints, recovery, approvals, route isolation, mobile collapse, headless operation, and assessment suppression.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Local/deep layers distinct | 0/1 | 1/1 | Target met |
| No fake model/tool activity | 1/1 | 1/1 | Preserved |
| Route-derived empty action | 0/1 | 1/1 | Target met |
| Failure preserves local planning | 0/1 | 1/1 | Target met |
| Status-coherence rubric | 1/4 | 4/4 | Target met |
| Full tests | 650/650 | 651/651 | No regression |

- Three component assertions failed first on the collapsed old status model, then the focused suite passed 18/18.
- Full tests pass: 165 files / 651 tests. Lint, web+gateway typecheck, production build, both strict OpenSpec validations, and diff check pass.
- Production CSS remains 150.39/26.98 kB gzip. Initial JavaScript changed from 354.78/111.93 kB to 355.17/112.04 kB gzip (+0.39/+0.11 kB).
- In the real Insights browser state, the page now simultaneously shows `AI 已记录 3 个入口动作`, `学习编排在线`, `深度代码导师连接失败 · 本地学习编排仍可用`, `当前没有调用模型或动态工具`, and the route action `查看一个最需要补强的技能`.
- In the real Today browser state, the sidebar reports evidence-based planning online while the adaptive diagnosis, exact three observations, mastery boundary, and `继续 10 分钟训练` remain intact.

### Decision

KEEP. The UI now explains exactly which intelligence is working, which deeper capability is offline, and what the learner can do next without pretending that a model or tool ran.

### Learned

- “AI unavailable” was too coarse for a layered AI-native product; it erased real local adaptation and created a contradiction users could see immediately.
- Honest degradation can increase perceived intelligence because the system names its evidence and boundaries instead of displaying a generic failure.
- The existing route contribution already held a useful next action. The gap was presentation, not a new agent framework.

### Next highest-value opportunity

Make the Mentor fallback action and the page's primary CTA share one projected action contract. Insights currently says `查看一个最需要补强的技能` in the dock while its primary action is `继续 10 分钟训练`; this is no longer a capability-status contradiction, but it is still an avoidable cross-surface planning mismatch.

## Active evaluation contract — one projected next action

Status: active in Run 31.

Hypothesis:

If the entry diagnosis, Insights CTA, and Mentor fallback consume one event-projected learning action, the learner will see one consistent next step and destination instead of reconciling independent recommendations.

Observed baseline:

- With the same completed diagnosis and matching training-start evidence, Insights shows `继续 10 分钟训练` linking to `#/training/starter-array-traversal`.
- The persistent Mentor on that same page shows `查看一个最需要补强的技能` and does not expose the destination.
- `BridgeEntryDiagnosis`, `InsightsPage`, and `App` independently decide their action copy.
- Action-coherence rubric: shared projection 0/1; matching visible label 0/1; matching destination 0/1; cold/partial/start/resume states covered 0/1 — total 0/4.

Primary metric:

- Action-coherence rubric target: 4/4 in pure contracts, component tests, and the existing real browser state.

Guardrails:

- Derive action only from validated learning events and the current route; do not ask a model to choose navigation.
- Preserve the distinction between not-started diagnosis, partial diagnosis, ready-to-start training, and resumable training.
- Never label an unstarted training session `继续` or a started matching session `开始`.
- Preserve all existing routes, diagnosis evidence, mastery boundaries, deep Mentor checkpoints, and non-bridge route actions.

Evaluation scenario:

- Project actions for no diagnosis, partial diagnosis, completed diagnosis without start, and completed diagnosis with matching training start.
- Render Insights and BridgeEntryDiagnosis from the same event history and assert their CTA label/target matches the projected action.
- Build the Mentor route contribution for Insights and assert it receives the same label.
- Verify the real Insights page shows the same `继续 10 分钟训练` in both the page and local Mentor fallback.

Revert threshold:

Revert if a wrong lesson opens, start/resume language regresses, Mentor overrides a real runtime checkpoint, non-bridge routes lose their current action, or full/browser checks regress.

Measurement limitation:

This removes contradictory next steps. It does not prove that the projected action is pedagogically optimal; that still requires transfer outcomes and user behavior data.

## Run 31 — One projected next action

### Hypothesis

One evidence-derived action value can make the learner page and Mentor agree on both language and destination across the full entry-to-training journey.

### Baseline

- Insights primary CTA: `继续 10 分钟训练` → `#/training/starter-array-traversal`.
- Mentor fallback on the same screen: `查看一个最需要补强的技能`.
- Cold Insights sent the learner to an arbitrary first practice or the learning center instead of the product's AI entrance diagnosis.
- Action-coherence rubric: 0/4.

### Change

- Added `projectBridgeLearningAction`, a pure event projection carrying authority, state, label, typed route, hash href, and exact evidence references.
- Covered four states: `开始 3 分钟诊断`, `继续入口诊断`, `开始 10 分钟训练`, and `继续 10 分钟训练`.
- Matching training-start evidence changes only the projected lesson to `继续`; an unrelated lesson start cannot do so.
- Added `projectMentorNextAction`, using the bridge action only on Today/Insights before real mastery evidence exists while preserving review and established-learning actions.
- Replaced independent start/resume copy logic in BridgeEntryDiagnosis and Insights.
- Wired the App's route contribution to the same projection, while keeping a recovered deep Mentor checkpoint higher priority.
- Changed cold Insights from an arbitrary baseline problem to the same three-minute AI entrance diagnosis used by Today.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| One shared action projection | 0/1 | 1/1 | Target met |
| Page and Mentor label match | 0/1 | 1/1 | Target met |
| Destination bound to action | 0/1 | 1/1 | Target met |
| Cold/partial/start/resume covered | 0/1 | 1/1 | Target met |
| Action-coherence rubric | 0/4 | 4/4 | Target met |
| Full tests | 651/651 | 653/653 | No regression |

- The new pure contract first failed because the module did not exist; cold Insights tests then failed on its old eight-minute-practice route before implementation.
- Focused projected-action, entry-diagnosis, Insights, Mentor, and context suites pass.
- Full tests pass: 166 files / 653 tests. Lint, web+gateway typecheck, production build, all three strict OpenSpec validations, and diff check pass.
- Production CSS remains 150.39/26.98 kB gzip. Initial JavaScript changed from 355.17/112.04 kB to 355.99/112.20 kB gzip (+0.82/+0.16 kB); the lazy Insights chunk decreased from 9.33/3.40 kB to 8.90/3.22 kB gzip (-0.43/-0.18 kB).
- In the real Insights browser state, both the page CTA and Mentor now say `继续 10 分钟训练`; the CTA resolves to `#/training/starter-array-traversal` and opens the restored `02 / 看见每一步` stage.
- In the real Today browser state, the diagnosis result consumes the same action and also says `继续 10 分钟训练` for the matching started lesson.

### Decision

KEEP. The learner now receives one next step from one evidence projection, and the target travels with the label instead of being re-created in each component.

### Learned

- The inconsistency was not an AI reasoning problem; it was duplicated product decision logic.
- Binding navigation to the projected action is safer than sharing copy alone because a correct label with a wrong target would still break trust.
- Cold Insights is now a better entry point: it starts with the same short AI diagnosis instead of bypassing the product's differentiated learning method.

### Next highest-value opportunity

Exercise the complete ten-minute training interaction in the real browser—run the observation frame, answer the prediction, complete the local code action, and enter transfer—to find the first actual learner-facing break. This is higher value than another structural refactor because the product promise now depends on that full interaction producing a coherent learning loop.

## Active evaluation contract — same-skill first transfer

Status: active in Run 32.

Hypothesis:

If the first independent challenge executes a new surface form of exactly the skill just taught, a zero-basis learner can experience genuine transfer without being thrown into an unrelated multi-skill OD problem.

Observed baseline:

- The real browser journey completed explain, three observable frames, prediction, and local coding successfully.
- `数组遍历` then opened `会议室占用时间`, whose catalog skills are `io-parsing`, `array`, and `interval` and whose solution requires sorting and interval merging.
- The lesson had taught only sequential traversal; at least two unintroduced prerequisites were added at the moment labeled `独立迁移`.
- Transfer-fit rubric: different surface 1/1; same taught skill only 0/1; executable evidence 0/1; honest mastery boundary 1/1 — total 2/4.

Primary metric:

- Transfer-fit rubric target: 4/4 in pure contracts, component tests, and a real browser run against the configured private runner.

Secondary measures:

- Extra unintroduced skills at the first transfer boundary: at least 2 → 0.
- First transfer must execute at least two distinct inputs; passing copy/string comparison alone is not accepted.
- A successful immediate transfer must not create `lesson-transfer-passed` or claim long-term mastery.

Guardrails:

- Keep hidden/reference answers closed during the challenge.
- Use the existing private runner; never execute learner code in the page process.
- Preserve the 754-problem catalog and the later real-problem workspace instead of relabeling an advanced OD problem as beginner transfer.
- On runner failure, show an honest retryable unavailable state and preserve progress.
- Do not alter unrelated lessons until this first lesson has measured browser evidence.

Evaluation scenario:

- Complete the array lesson, write a full traversal function for a different everyday context, and run it against two inputs.
- Verify wrong output does not advance, runner unavailability does not advance, and both passing tests create only an immediate transfer-stage event.
- Confirm the growth replay distinguishes immediate transfer from delayed retention and real-problem mastery.
- Re-run full tests, lint, typecheck, production build, strict OpenSpec validation, diff check, and the real browser flow.

Revert threshold:

Revert if learner code runs in the browser, a single visible literal can pass every test, unavailable execution advances progress, the UI claims durable mastery, the normal problem workspace regresses, or full/browser checks fail.

Measurement limitation:

Passing a two-case immediate transfer is evidence that the learner used the operation on a new surface. It is not evidence of seven-day retention, broad algorithmic mastery, or job performance.

## Run 32 — Same-skill first transfer

### Hypothesis

A first transfer that changes the surface but not the required algorithmic skill will let a beginner demonstrate real use of the just-learned operation without an artificial difficulty cliff.

### Baseline

- The real flow successfully completed explanation, three observable state frames, prediction, and constrained coding.
- The button labeled `进入独立挑战` then opened `会议室占用时间`.
- That problem requires `io-parsing`, `array`, and `interval`; its solution sorts and merges intervals, although the lesson taught only sequential array traversal.
- Extra unintroduced skills at the first transfer boundary: at least 2.
- Transfer-fit rubric: 2/4.

### Change

- Added a trusted immediate-transfer contract for `starter-array-traversal`: `逐件核对行李重量`.
- The learner writes a complete Python traversal function in a new everyday context rather than filling one token or copying a reference answer.
- The existing private runner executes the function against two different arrays; learner Python never runs in the page process.
- Empty source, wrong output, compile/runtime failure, timeout, and runner unavailability cannot advance the stage.
- A two-case pass records only `training-stage-completed: transfer` with `skillIds: ['array']`.
- The immediate pass does not create `lesson-transfer-passed`; the replay explicitly distinguishes immediate transfer from long-term retention and accepted real-problem mastery.
- Other lessons retain their previous catalog-problem fallback while this first measured slice remains bounded.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Different surface | 1/1 | 1/1 | Preserved |
| Same taught skill only | 0/1 | 1/1 | Target met |
| Executable evidence | 0/1 | 1/1 | Target met |
| Honest mastery boundary | 1/1 | 1/1 | Preserved |
| Transfer-fit rubric | 2/4 | 4/4 | Target met |
| Extra unintroduced skills | at least 2 | 0 | Target met |
| Full tests | 653/653 | 661/661 | No regression |

- Red evidence: the new contract suite first failed because `training-transfer` did not exist; component tests then showed the old `会议室占用时间` button instead of a same-skill challenge.
- Focused transfer, training-session, and cabin suites pass 24/24.
- Full tests pass: 167 files / 661 tests. Lint, web+gateway typecheck, production build, four strict OpenSpec validations, and diff check pass.
- Production CSS changed from 150.39/26.98 kB gzip to 152.02/27.26 kB gzip (+1.63/+0.28 kB). Initial JavaScript changed from 355.99/112.20 kB gzip to 356.28/112.26 kB gzip (+0.29/+0.06 kB). The lazy training cabin is 14.65/4.93 kB gzip.
- Browser degradation check: a `localhost:4174` origin correctly reported `运行服务暂时不可用` and did not advance because the local stack contract uses `127.0.0.1`.
- Real browser pass at `http://127.0.0.1:4174/#/training/starter-array-traversal`: the private runner executed both cases, the UI showed `2/2 组测试通过`, the rail gained `独立迁移`, and the replay showed `即时迁移已通过` plus `不等于长期掌握`.

### Decision

KEEP. The first learner-facing transfer now tests the operation that was actually taught, produces real execution evidence, and preserves the distinction between immediate success and durable mastery.

### Learned

- A broad catalog tag is not a pedagogical prerequisite contract. `skills: ['array']` or inclusion of `array` cannot prove that a problem is suitable immediately after learning traversal.
- The first useful application layer can be smaller than an OD problem while still being real: complete learner code, isolated execution, multiple cases, and evidence-bound claims.
- Honest runner degradation worked as designed; using one canonical local origin is part of the product contract, not a reason to weaken browser security.

### Next highest-value opportunity

Make the shared next-action projection completion-aware. After immediate transfer passes, the in-cabin action correctly says `查看我的训练地图`, but Today and Insights may still project `继续 10 分钟训练` from the earlier session-start evidence. The next loop should ensure the completed event produces one coherent post-training action without claiming durable mastery.

## Active evaluation contract — completion-aware next action

Status: active in Run 33.

Hypothesis:

If an immediate-transfer event has higher projection priority than missing diagnosis or an earlier training start, every learner surface can acknowledge the completed session and recommend the next training choice instead of restarting finished work.

Observed baseline:

- The real browser emitted `training-stage-completed: transfer` after 2/2 runner tests.
- The in-cabin action said `查看我的训练地图` and opened Insights.
- Insights then showed `先完成 3 分钟 AI 入口诊断` and `开始 3 分钟诊断`; it ignored the stronger, newer transfer event because no entrance-diagnosis events existed on that origin.
- Completion-action coherence: completion acknowledged 0/1; no restart 0/1; page/Mentor label match 0/1; evidence-bound destination 0/1 — total 0/4.

Primary metric:

- Completion-action coherence target: 4/4 in pure projection tests, Insights component tests, and the same real browser history.

Guardrails:

- Project only from validated learning events; no model-authored navigation.
- Immediate transfer may change the next action but must not become mastery evidence.
- Preserve cold, partial-diagnosis, ready-to-train, and in-progress states.
- Preserve real Mentor runtime checkpoints over fallback projection.

Evaluation scenario:

- Project with an immediate-transfer event alone and with older diagnosis/start events.
- Confirm the completion event wins and carries its evidence reference.
- Render Insights with no mastery but a completed immediate transfer; show an honest result card and one next-training action.
- Verify page and Mentor show the same label/destination in the real browser.

Revert threshold:

Revert if cold learners skip diagnosis, unfinished learners skip training, immediate transfer is counted as mastery, or established Mentor/runtime actions regress.

Measurement limitation:

This improves action continuity after one session. It does not yet adaptively rank which specific next lesson is pedagogically optimal.

## Run 33 — Completion-aware next action

### Hypothesis

Making immediate transfer the strongest completed bridge event will prevent the product from restarting onboarding and will keep the page and Mentor on one post-training action.

### Baseline

- After a real 2/2 immediate-transfer pass, the training cabin linked to the training map.
- Insights then ignored the completion event and showed `先完成 3 分钟 AI 入口诊断`.
- The persistent Mentor showed a generic context-compilation checkpoint rather than the page's action.
- Completion-action coherence: 0/4.

### Change

- Added `choose-next-training` to the typed projected-action state with label `选择下一项训练`, destination `#/paths`, and the exact completion-event reference.
- A valid immediate-transfer completion now outranks missing diagnosis and older training-start evidence.
- A newer training start still resumes that newer lesson instead of being trapped by an older completion.
- Insights now renders an evidence-bound immediate-transfer result while keeping the mastery count at zero and stating the delayed-retention boundary.
- Completion-aware Mentor projection now wins even when unrelated sample-submit evidence exists.
- The Mentor dock now uses the route's explicit next action after context-only compilation, while preserving checkpoints from real hypotheses, tools, approvals, verification, stopped runs, and policies.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Completion acknowledged | 0/1 | 1/1 | Target met |
| Finished work not restarted | 0/1 | 1/1 | Target met |
| Page/Mentor label match | 0/1 | 1/1 | Target met |
| Evidence-bound destination | 0/1 | 1/1 | Target met |
| Completion-action coherence | 0/4 | 4/4 | Target met |
| Full tests | 661/661 | 663/663 | No regression |

- Red evidence: the projection returned `开始 3 分钟诊断` and Insights rendered the cold-onboarding card for a transfer-only history; a second red assertion showed established attempt evidence caused Mentor to ignore the completion action.
- Focused projection, Insights, BridgeEntryDiagnosis, and MentorDock suites pass 27/27.
- Full tests pass: 167 files / 663 tests. Lint, web+gateway typecheck, production build, both strict OpenSpec validations, and diff check pass.
- Production CSS remains 152.02/27.26 kB gzip. Initial JavaScript changed from 356.28/112.26 kB gzip to 357.17/112.46 kB gzip (+0.89/+0.20 kB); Insights changed from 8.90/3.22 kB to 9.76/3.48 kB gzip (+0.86/+0.26 kB).
- In the same real browser history, Insights shows `即时迁移已通过`, `0 条掌握证据`, the exact event reference, and `选择下一项训练 → #/paths`; the persistent Mentor also says `选择下一项训练`.

### Decision

KEEP. The product now closes one training session coherently: execution success becomes an honest immediate result, and every visible surface recommends the same next action without restarting completed work or inflating mastery.

### Learned

- Event priority must follow pedagogical meaning, not onboarding chronology. A newer validated completion is stronger than absence of entrance-diagnosis evidence.
- A server checkpoint created by context compilation is lifecycle state, not necessarily a learner action. An explicit route projection is more useful until the Agent has produced a real hypothesis/tool/stop checkpoint.
- Preserving `0 条掌握证据` next to `即时迁移已通过` makes the evidence ladder understandable instead of collapsing all success into one score.

### Next highest-value opportunity

Exercise `选择下一项训练` into the learning center and verify that it offers one evidence-aware next lesson rather than a large undifferentiated curriculum. The action is now coherent; its destination must still prove that the learner can act without deciding among dozens of modules.

## Active evaluation contract — direct next-lesson handoff

Status: active in Run 34.

Hypothesis:

If the post-transfer action reuses the curriculum's prerequisite projection and carries the exact next lesson in its route, the learner can move from one completed session to the next teachable task without searching a large curriculum map.

Observed baseline:

- `选择下一项训练` opens `#/paths`.
- The destination renders 12 foundation lessons, 5 future modules, and 6 real-problem paths at once.
- It does mark one item as `当前任务` (`给信息贴标签` in the measured browser state), but the learner must scan the map and click again.
- Post-transfer handoff: direct next lesson 0/1; prerequisite-consistent 1/1; one-click continuation 0/1; page/Mentor destination match 1/1 — total 2/4.
- Clicks from the completed Insights state to the actual next lesson: 2.

Primary metric:

- Post-transfer handoff target: 4/4 and one click from Insights to the exact prerequisite-valid lesson.

Guardrails:

- Reuse `deriveLessonProgress` and `nextFoundationLesson`; do not create a second curriculum ranking rule.
- Keep the learning center available for voluntary exploration.
- A locked lesson must never be projected.
- Preserve cold diagnosis, partial diagnosis, in-progress training, mastery boundaries, and real Mentor checkpoints.
- If no foundation lesson is available, retain the safe learning-center fallback.

Evaluation scenario:

- Project after immediate transfer with no foundation completions, with `input-output` completed, and with an in-progress next lesson.
- Assert the route and label identify the same lesson that FoundationMap marks as current.
- Verify Insights and Mentor share the exact action.
- Click once in the existing real browser history and confirm the correct lesson page opens.

Revert threshold:

Revert if the action opens a locked lesson, disagrees with FoundationMap, skips a prerequisite, breaks exploratory navigation, or regresses full/browser checks.

Measurement limitation:

This removes navigation and decision friction using a deterministic prerequisite path. It does not prove that the curriculum sequence itself is optimal for learning outcomes.

## Run 34 — Direct next-lesson handoff

### Hypothesis

Reusing the curriculum's prerequisite projection in the post-transfer action will remove one page and one decision from the learner's path without opening a locked lesson.

### Baseline

- The completed-session action opened `#/paths`.
- The learning center displayed 12 foundation lessons, 5 future modules, and 6 real-problem paths before the learner could act.
- It correctly marked `给信息贴标签` as `当前任务`, but reaching it required a second click.
- Post-transfer handoff: 2/4; clicks from Insights to the actual next lesson: 2.

### Change

- Added a typed `continue-foundation` action whose route contains the exact lesson ID.
- The action reuses `nextFoundationLesson(events)`, which itself uses the same `deriveLessonProgress` prerequisite state as FoundationMap.
- The visible label now names the destination, for example `继续下一课：给信息贴标签`, instead of asking the learner to choose again.
- The action carries the immediate-transfer event plus relevant prerequisite or in-progress lesson-event references.
- If the foundation curriculum is exhausted, the product still falls back to `选择下一项训练 → #/paths`.
- Cold diagnosis, partial diagnosis, in-progress training, the zero-mastery boundary, and real Mentor runtime checkpoints remain unchanged.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Exact next lesson projected | 0/1 | 1/1 | Target met |
| Prerequisite-consistent | 1/1 | 1/1 | Preserved |
| One-click continuation | 0/1 | 1/1 | Target met |
| Page/Mentor destination match | 1/1 | 1/1 | Preserved |
| Post-transfer handoff | 2/4 | 4/4 | Target met |
| Clicks to actual next lesson | 2 | 1 | 50% reduction |
| Full tests | 663/663 | 666/666 | No regression |

- Red evidence: four focused assertions first failed because the projection still returned `选择下一项训练 → #/paths` for first, prerequisite-complete, and Insights scenarios.
- Focused projection and Insights suites pass 14/14.
- Full tests pass: 167 files / 666 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Production CSS remains 152.02/27.26 kB gzip. Initial JavaScript changed from 357.17/112.46 kB gzip to 357.67/112.55 kB gzip (+0.50/+0.09 kB); the lazy Insights chunk remains 9.76/3.48 kB gzip.
- Real browser evidence on the existing learner history: Insights and the persistent Mentor both showed `继续下一课：给信息贴标签`; one click opened `http://127.0.0.1:4174/#/learn/variables-state`, whose heading was `给信息贴标签`.

### Decision

KEEP. The learner now moves from a verified immediate-transfer result to the exact prerequisite-valid lesson in one click, while the full learning map remains available for voluntary exploration.

### Learned

- A large map can be a good exploration surface and a poor continuation surface at the same time.
- Naming the next lesson in the action removes both navigation friction and uncertainty about what will happen after the click.
- One deterministic prerequisite authority is enough for FoundationMap, Insights, and Mentor; a second AI-generated ranking would have created disagreement without adding evidence.

### Next highest-value opportunity

Make the destination itself explain `为什么现在学这节`. The direct route is correct, but the lesson opens with a generic course objective and does not visibly connect the learner's preceding evidence, the missing prerequisite skill, and the expected payoff. The next loop should add one evidence-bound, plain-language AI handoff explanation without inventing a learner weakness or changing mastery.

## Active evaluation contract — evidence-bound lesson handoff

Status: active in Run 35.

Hypothesis:

If the exact next lesson names the preceding verified action, explains the prerequisite-based sequence, states its payoff, and exposes the supporting records, learners can immediately perceive adaptive AI value without the system inventing a weakness or mastery claim.

Observed baseline:

- The real `给信息贴标签` page shows the static objective `理解变量会随语句执行而改变，并能预测某一步的值。`.
- It does not say that the learner just completed an immediate transfer, why this course is the current unlocked step, or which events support the route.
- It does not repeat the immediate-success-versus-durable-mastery boundary at the point where the learner starts the next lesson.
- Explanation completeness: source action 0/1; sequencing reason 0/1; expected payoff 1/1; evidence plus honest boundary 0/1 — total 1/4.

Primary metric:

- Evidence-bound handoff target: 4/4 on the exact projected lesson, with zero AI-personalization claims on mismatched or evidence-free lessons.

Confirmed public test seams:

- Pure seam: `projectLessonHandoff(lesson, events)` returns either a fully evidenced view model or `null`.
- Rendered seam: `LessonPage` exposes the plain-language reason, payoff, mastery boundary, and progressive evidence disclosure from that view model.

Guardrails:

- Reuse `projectBridgeLearningAction`; do not create a second lesson-selection rule.
- Do not call a model or infer a weakness, score, diagnosis, or mastery state.
- Do not render personalization when the current lesson and projected route differ.
- Do not change course unlocking, event schemas, or mastery calculations.
- Keep raw event references behind progressive disclosure for non-technical learners.

Evaluation scenario:

- Project the first lesson from an immediate-transfer event alone.
- Project `variables-state` from immediate transfer plus completed `input-output`.
- Reject a different available lesson and a lesson opened without transfer evidence.
- Render the matching handoff and inspect its visible copy and evidence disclosure.
- Revisit the same real browser history and verify the reason appears above the lesson flow.

Revert threshold:

Revert if the card appears on a mismatched/manual lesson, cites no evidence, implies long-term mastery, changes unlocking, or regresses full/browser checks.

Measurement limitation:

This measures whether the adaptive decision is understandable and traceable. It does not prove that learners agree with the reason or that the prerequisite sequence maximizes learning outcomes.

## Run 35 — Evidence-bound lesson handoff

### Hypothesis

Making the event-derived sequence visible at the lesson entrance will let a learner understand why this lesson is next, what it will unlock, and where the evidence boundary ends.

### Baseline

- The exact projected lesson opened successfully but showed only a static curriculum objective.
- It did not name the preceding completed training, explain the prerequisite-based decision, or expose supporting records.
- Explanation completeness was 1/4: only expected payoff was visible.

### Change

- Added a pure `projectLessonHandoff(lesson, events)` seam that returns personalization only when the current lesson exactly matches `projectBridgeLearningAction`'s `continue-foundation` route.
- The view model names the preceding verified training, explains the prerequisite sequence in plain language, states the curriculum objective, and keeps the immediate-success-versus-durable-mastery boundary visible.
- `LessonPage` renders the handoff as an accessible `AI 学习编排` region before the five-stage lesson flow.
- Exact `event:*` references are available behind progressive disclosure instead of occupying the main explanation.
- Manual mismatches and evidence-free lessons receive `null` and retain the normal course page without any AI-personalization claim.
- Browser inspection first exposed 15 repeated `lesson-started` references. The handoff was tightened to a minimal sufficient evidence set: one verified transfer plus the latest completion of each required prerequisite. The same real page now shows 2 records.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Preceding verified action named | 0/1 | 1/1 | Target met |
| Prerequisite-based reason visible | 0/1 | 1/1 | Target met |
| Expected payoff visible | 1/1 | 1/1 | Preserved |
| Evidence and honest mastery boundary | 0/1 | 1/1 | Target met |
| Explanation completeness | 1/4 | 4/4 | Target met |
| AI claim on manual mismatch | absent | absent | Guardrail passed |
| Visible evidence-record count | 15 during first render | 2 minimal records | Noise removed |
| Full tests | 666/666 | 670/670 | No regression |

- Red evidence: the pure suite first failed because `lesson-handoff` did not exist; the rendered seam then failed because `LessonPage` ignored the handoff prop. A browser-discovered refinement test failed on repeated start-event refs and first-lesson copy before the minimal-evidence fix.
- Final focused handoff, projected-action, and LessonPage suites pass; full tests pass: 168 files / 670 tests.
- Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- The Mentor v2 quality gate remains honestly red at 0/100 eligible real teacher-adjudicated cases; this change does not bypass or improve that unrelated evidence gate.
- Production CSS changed from 152.02/27.26 kB gzip to 153.66/27.50 kB gzip (+1.64/+0.24 kB). Initial JavaScript changed from 357.67/112.55 kB gzip to 358.91/112.94 kB gzip (+1.24/+0.39 kB). The lazy Lesson page changed from 7.05/2.43 kB to 7.85/2.64 kB gzip (+0.80/+0.21 kB).
- Real browser at `#/learn/variables-state` shows `AI 为什么现在安排「给信息贴标签」`, the preceding array-traversal transfer, the prerequisite reason, payoff, mastery boundary, and exactly 2 expandable event references.
- Real browser at the manually opened `#/learn/input-output` shows the lesson but no AI handoff, proving the mismatch guardrail through the integrated App path.

### Decision

KEEP. The adaptive decision is now visible, specific, traceable, and honest at the moment the learner starts the next lesson; it does not degrade manual exploration into fake personalization.

### Learned

- Correct personalization is not enough if the user sees only the destination; the causal explanation is part of the product value.
- More provenance is not always more trustworthy to a learner. A minimal sufficient evidence set is clearer than every repeated lifecycle event.
- Deterministic event projection can feel more intelligent than generated prose when it names the exact prior action and makes a useful decision immediately.

### Discovered problems

- Reopening the same lesson appends another `lesson-started` event, even after the lesson has already started or completed. The handoff now hides that noise, but the underlying event log, sync cost, and replay remain polluted.
- The product has no direct learner feedback signal for whether the recommendation explanation was understood or useful; current evidence proves visibility and traceability, not perceived helpfulness.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Make lesson-start recording idempotent | 7 | 9 | 2 | 2 | Highest ratio; removes observed evidence pollution and sync/replay cost without changing learning claims |
| Add a one-tap `这正是我需要的 / 我不明白为什么` feedback signal | 8 | 6 | 4 | 2 | Produces direct usefulness evidence but requires an event contract and downstream interpretation |
| Add contextual Mentor intervention inside a lesson | 9 | 5 | 7 | 5 | Highly visible, but risks duplicating the structured lesson and increasing hint dependence |

### Next highest-value opportunity

Make `lesson-started` recording idempotent per learner and lesson lifecycle. Reopening a started or completed lesson should not append meaningless duplicate starts, while a genuinely new learner or reset lifecycle must still produce one start event. Measure event growth, replay stability, sync payload reduction, and all existing lesson flows before considering UI feedback instrumentation.

## Active evaluation contract — semantic lesson-start idempotency

Status: active in Run 36.

Hypothesis:

If lesson start/open milestones are deduplicated by learner lifecycle and lesson ID at both memory boundaries, repeated mounts will stop inflating sync and replay evidence while first starts and different lessons remain fully observable.

Observed baseline:

- `recordLearningSignal` only deduplicates exact event IDs; three same-lesson signals with three IDs produce three learner events.
- `recordPedagogicalSignal` likewise produces three `lesson-opened` events for the same `lesson:<id>` evidence.
- The Run 35 real browser first exposed 15 relevant start references for one lesson before handoff evidence was minimized.
- Prospective repeated-start growth: learner memory 3/3 appended; pedagogical memory 3/3 appended; duplicate reduction 0%.

Primary metrics:

- Three repeated same-lesson signals produce one learner milestone and one pedagogical open milestone: 66.7% fewer newly stored events in each store.
- First event ID and timestamp remain unchanged.
- Two different lesson IDs still produce two events.
- An independent empty learner memory still records its own first event.

Confirmed public test seams:

- `recordLearningSignal(memory, signal, now, id)` at the learner-memory domain boundary.
- `recordPedagogicalSignal(memory, learnerId, signal, now, id)` at the replay-memory domain boundary.

Guardrails:

- Apply semantic deduplication only to `lesson-started` / projected `lesson-opened`.
- Do not mutate, delete, or rewrite imported historical events.
- Preserve attempts, hints, predictions, completions, transfers, and different lessons.
- Preserve the earliest activation timestamp and event ID.
- Do not introduce a reset lifecycle without an explicit bounded reset event.

Evaluation scenario:

- Record one lesson three times with different event IDs and timestamps.
- Record two different lessons in one memory.
- Record the same lesson in separate empty learner memories.
- Parse a historical memory with duplicates, then emit another repeated start.
- Repeat the same cases through pedagogical projection.
- Confirm existing lesson progress, handoff, outbox, and full product tests remain stable.

Revert threshold:

Revert if first starts disappear, different lessons collapse, imported history is rewritten, any non-start evidence is deduplicated, or full checks regress.

Measurement limitation:

This stops future duplicate growth but deliberately does not clean historical duplicates. It reduces event count and payload opportunity; it does not measure production bandwidth until real sync telemetry exists.

## Run 36 — Semantic lesson-start idempotency

### Hypothesis

Enforcing semantic idempotency at both memory boundaries will turn repeated UI mounts into delivery retries rather than fake learning evidence.

### Baseline

- Three same-lesson signals with different IDs created three learner events.
- The same three signals created three pedagogical `lesson-opened` events.
- Combined prospective growth was 6 stored events for one learning fact.

### Change

- `recordLearningSignal` now preserves the first `lesson-started` event for a matching `lessonId` in the current learner memory.
- `recordPedagogicalSignal` now preserves the first `lesson-opened` projection for the same learner and lesson evidence reference.
- Different lessons and different learners remain separate.
- Existing imported duplicates remain untouched, but reopening that lesson appends no further duplicate.
- All other learning and pedagogical event kinds retain their previous append behavior.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Learner events after 3 repeated starts | 3 | 1 | 66.7% fewer |
| Pedagogical events after 3 repeated starts | 3 | 1 | 66.7% fewer |
| Combined new events | 6 | 2 | 66.7% fewer |
| First ID and timestamp preserved | no guarantee | 1/1 | Target met |
| Two different lessons preserved | 2 | 2 | Guardrail passed |
| Independent learner preserved | 1 each | 1 each | Guardrail passed |
| Imported duplicate history | 2 | 2 | No rewrite |
| Full tests | 670/670 | 675/675 | No regression |

- Red evidence: the learner test first received three start events instead of one; the pedagogical test then received three `lesson-opened` events instead of one.
- Focused learner-memory, pedagogical-memory, lesson-progress, lesson-handoff, and platform-outbox suites pass 42/42.
- Full tests pass: 168 files / 675 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass after correcting one widened test literal type.
- Production CSS remains 153.66/27.50 kB gzip. Initial JavaScript changed from 358.91/112.94 kB gzip to 359.18/112.99 kB gzip (+0.27/+0.05 kB); lazy page chunks are unchanged.
- Repeated real-browser navigation between `variables-state` and the learning map still renders the exact lesson, AI reason, and minimal 2-record handoff without runtime errors.
- The Mentor v2 gate remains honestly red at 0/100 real teacher-adjudicated cases and was not bypassed.

### Decision

KEEP. The product now records one learning fact once, even when React mounts, navigation, or retries emit it repeatedly; sync opportunity and replay noise fall by two thirds in the measured scenario.

### Learned

- Random event-ID idempotency protects network retries but not semantically duplicate UI events; both identities matter.
- Page-view analytics and learning milestones are different domains. Revisits need a future dedicated telemetry event, not repeated `lesson-started` evidence.
- Prospective deduplication is safer than silently cleaning historical evidence because it preserves auditability.

### Discovered problems

- Historical duplicate starts remain in existing backups and local histories by design; projections must continue using set or minimal-evidence semantics.
- There is no explicit reset lifecycle ID. A future course-reset feature must define one before a reset can legitimately create another start milestone.
- The product can now explain a recommendation but still cannot measure whether the learner found that explanation useful or confusing.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| One-tap recommendation feedback | 8 | 7 | 4 | 2 | Highest current ratio; converts a visible AI explanation into direct usefulness evidence and an actionable recovery path |
| Contextual Mentor intervention inside lesson | 9 | 5 | 7 | 5 | More visible intelligence, but high risk of duplicating structured teaching or increasing dependence |
| Explicit course-reset lifecycle | 4 | 6 | 5 | 4 | Needed eventually, but no current user flow requires it |

### Next highest-value opportunity

Add a bounded one-tap response to the AI handoff: `这正是我需要的` or `我不明白为什么`. Record one replaceable response per recommendation evidence set, show an immediate recovery action for confusion, and expose aggregate counts only when real responses exist. This should measure explanation usefulness without storing free text or pretending that a click proves learning.

## Active evaluation contract — bounded handoff feedback

Status: active in Run 37.

Hypothesis:

If the learner can respond to one exact recommendation and confusion triggers an immediate deterministic recovery, the AI handoff becomes a measurable two-way product loop rather than a one-way explanation.

Observed baseline:

- The AI handoff explains source, sequence, payoff, and evidence, but has no response control.
- Navigation or reload cannot restore whether the learner understood the explanation.
- No frontend/gateway/sync event can distinguish `helpful` from `unclear`.
- A confused learner receives no specific recovery action from the handoff.
- Feedback-loop completeness: visible bounded choice 0/1; persisted/restored response 0/1; symmetric sync validation 0/1; confusion recovery 0/1; mastery boundary 1/1 — total 1/5.

Primary metric:

- Feedback-loop completeness target: 5/5 in domain, component, gateway/migration, mastery-guard, and real-browser evidence.

Confirmed public test seams:

- Web and gateway learning-event parsers plus platform migration planner.
- Pure `projectLessonHandoff` recommendation identity and latest-response projection.
- `recordLearningSignal` active-choice idempotency.
- Rendered `LessonPage` interaction through its existing `onSignal` public prop.

Guardrails:

- Store only `helpful` or `unclear`; no free text.
- Bind to valid `lessonId` and deterministic `recommendationId` derived from exact evidence refs.
- Same-as-active repeat appends nothing; a changed response remains an immutable newer revision.
- Feedback does not unlock lessons, update mastery, verify transfer, or affect teacher quality.
- Confusion copy must say the sequence is not a weakness label.
- Reject schema drift at frontend, gateway, and migration boundaries.

Evaluation scenario:

- Generate the same recommendation ID from identical evidence and a different ID when evidence changes.
- Record helpful twice, then unclear; assert two revisions and unclear active.
- Validate good and bad events through web, gateway, and migration.
- Assert feedback-only history leaves lesson progress and mastery unchanged.
- Click both choices in the real page; verify pressed state, acknowledgement, recovery link, and reload persistence.

Revert threshold:

Revert if feedback can contain free text, fails sync, changes mastery, loses state after reload, appends identical repeats, or shows a recovery link for the wrong source training.

Measurement limitation:

This produces real usefulness/confusion responses but not yet statistically meaningful aggregates. No product claim should be made until actual non-demo responses exist.

## Run 37 — Bounded AI handoff feedback

Date: 2026-08-15

### Improvement

Turned the evidence-bound AI lesson handoff from a one-way explanation into a bounded, auditable response loop:

- every handoff now has a deterministic recommendation ID derived from the lesson and exact evidence set;
- the learner can answer only `这正是我需要的` or `我不明白为什么`;
- the active answer is restored from immutable learning events after navigation or reload;
- repeating the active answer appends nothing, while changing the answer creates one auditable revision;
- confusion reveals an immediate review path to the exact source training and explicitly says this is not a weakness label;
- the web parser, gateway parser, and migration planner enforce the same bounded contract;
- feedback-only history contributes no mastery evidence.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Visible bounded response | 0/1 | 1/1 | Target met |
| Persisted and restored response | 0/1 | 1/1 | Target met |
| Symmetric web/gateway/migration validation | 0/1 | 1/1 | Target met |
| Confusion recovery action | 0/1 | 1/1 | Target met |
| Mastery boundary | 1/1 | 1/1 | Guardrail preserved |
| Feedback-loop completeness | 1/5 | 5/5 | +4 capabilities |
| Focused tests | red UI test | 54/54 | Green |
| Full tests | 675/675 | 684/684 | No regression |

- Red evidence: `LessonPage` could not find an accessible `这正是我需要的` button before implementation.
- Focused component, recommendation, learner-memory, mastery, gateway, and migration suites pass 54/54.
- Full tests pass: 168 files / 684 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Real browser: `unclear` showed a pressed control, honest acknowledgement, and the exact source-training recovery link; navigation reload restored it. Changing to `helpful` removed recovery, marked the new choice pressed, and survived another reload.
- Production CSS changed from 153.66/27.50 kB gzip to 155.21/27.72 kB gzip (+1.55/+0.22 kB). Initial JavaScript changed from 359.18/112.99 kB gzip to 360.62/113.47 kB gzip (+1.44/+0.48 kB). The lazy Lesson page changed from 7.85/2.64 kB gzip to 9.07/3.05 kB gzip (+1.22/+0.41 kB).
- The Mentor v2 gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The measured loop moved from 1/5 to 5/5 without letting a sentiment click masquerade as learning. This gives the visible AI surface a real input, deterministic response, and durable evidence trail.

### Learned

- A two-choice control is enough to close the first product loop when the response has a precise recommendation identity and a useful consequence.
- Latest-state UX and immutable audit history are compatible: projection chooses the newest revision while storage preserves changed answers.
- Confusion feedback is only valuable when the product changes what the learner can do next; acknowledgement alone would be decorative.

### Discovered problems

- The recovery link opens the correct source training, but it does not yet carry an explicit return route to the recommended lesson. A confused learner can review successfully and still have to find the recommendation again.
- Feedback responses are now real local/server-syncable evidence, but there are not enough non-demo responses to display aggregates or claim explanation quality.
- The feedback control asks about recommendation usefulness, not whether the learner understood the lesson; those signals must remain separate.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Return-aware confusion recovery | 8 | 9 | 3 | 2 | Highest ratio; closes the only broken step observed in the real user path |
| Use real feedback to rank explanation variants | 9 | 4 | 8 | 6 | Valuable later, but there is not enough real response volume yet |
| Contextual Mentor intervention inside lesson | 9 | 5 | 7 | 5 | High visibility, but should consume reliable confusion evidence rather than appear unprompted |

### Next highest-value opportunity

Make confusion recovery round-trip safe: the source review route must remember the exact recommended lesson, show why the learner is reviewing, and return in one click without manufacturing completion or mastery evidence.

## Active evaluation contract — return-aware confusion recovery

Status: active in Run 38.

Hypothesis:

If source review preserves and verifies the exact recommendation context, a confused learner can understand why they left, review safely, and return without losing the AI-guided learning thread.

Observed baseline:

- The recovery link opens the correct source lesson.
- The route drops the recommended lesson and recommendation ID.
- The immersive cabin cannot explain that it is a recovery review.
- The only way back is generic browser/history behavior; no explicit named return exists.
- Round-trip completeness: exact source 1/1; trusted return identity 0/1; visible recovery context 0/1; explicit one-click return 0/1; evidence-neutrality 1/1 — total 2/5.

Primary metric:

- Round-trip completeness target: 5/5 in typed route, validation, component, event-neutrality, and real-browser evidence.

Guardrails:

- Old training links remain valid.
- Query values are navigation hints, never trusted learning evidence.
- Recovery context renders only when current handoff identity and source both match.
- Opening or returning emits no completion, transfer, mastery, or feedback event.
- The learner may return without being forced to manufacture review completion.

Evaluation scenario:

- Build and parse both ordinary and return-aware routes with encoded IDs.
- Render valid recovery context and invoke one explicit return callback.
- Reject incomplete, stale, or wrong-source context at App projection boundary.
- In the real browser, choose confusion, open review, verify named context, return, and confirm the exact handoff is restored.

Revert threshold:

Revert if ordinary training links break, route values can create an unverified AI claim, returning emits a learning event, or the user cannot return to the exact recommendation in one click.

## Run 38 — Return-aware confusion recovery

Date: 2026-08-15

### Improvement

Closed the confused-learner round trip and repaired a real persistence failure found only by hard-refresh testing:

- recovery routes now preserve source lesson, return lesson, and deterministic recommendation ID;
- App revalidates all route hints against the current evidence-derived handoff before showing any AI recovery claim;
- the immersive training cabin names why the learner is reviewing and the exact lesson they can return to;
- one explicit button returns to that recommendation without emitting a learning signal;
- ordinary training URLs remain unchanged;
- server bootstrap now merges append-only learning events by immutable ID, preserving valid local-only facts while the remote version wins an ID conflict.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Exact source review | 1/1 | 1/1 | Preserved |
| Trusted return identity | 0/1 | 1/1 | Target met |
| Visible recovery context | 0/1 | 1/1 | Target met |
| Explicit one-click return | 0/1 | 1/1 | Target met |
| Evidence-neutral navigation | 1/1 | 1/1 | Guardrail preserved |
| Round-trip completeness | 2/5 | 5/5 | +3 capabilities |
| Focused tests | 3 intentional red failures | 42/42 | Green |
| Full tests | 684/684 | 688/688 | No regression |

- Red evidence: return-aware URLs fell back to Today, the cabin had no recovery explanation or return action, and append-only merge did not exist.
- Focused route, handoff, lesson, training-cabin, and authority suites pass 42/42.
- Full tests pass: 168 files / 688 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Real browser: confusion produced a link containing all three identities; the cabin showed the verified recovery reason and mastery boundary; one click returned to `#/learn/variables-state` with the exact handoff.
- A same-document HMR navigation first exercised a stale parser closure. A true hard reload then revealed the substantive issue: server bootstrap erased an unsynced feedback event. After append-only reconciliation, two hard reloads preserved the pressed `unclear` state, recovery copy, source-review context, return destination, and original handoff.
- Production CSS changed from 155.21/27.72 kB gzip to 156.10/27.88 kB gzip (+0.89/+0.16 kB). Initial JavaScript changed from 360.62/113.47 kB gzip to 361.69/113.77 kB gzip (+1.07/+0.30 kB). Training cabin changed from 14.65/4.93 kB gzip to 15.23/5.15 kB gzip (+0.58/+0.22 kB); Lesson page changed by +0.05/0.00 kB gzip.
- The Mentor v2 gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The recovery experience now has a verified beginning, visible purpose, and deterministic end. More importantly, the user’s latest response is no longer sacrificed to a lagging server snapshot.

### Learned

- Soft hash navigation is not a persistence test. Any locally saved learning signal must be exercised through a document reload and authenticated bootstrap.
- Append-only learning facts need union semantics; mutable practice/progress state can remain server-authoritative, but treating both the same causes silent evidence loss.
- Adaptive UI claims should be re-projected from current evidence after navigation rather than trusted from query parameters.

### Discovered problems

- The recovery cabin restores the source lesson's existing progress. In the observed browser account that lesson was already at `独立迁移`, so a learner asking for conceptual review did not land on the explanation they needed.
- The local app still reports `同步待重试` when the running gateway has not been restarted with the latest event contract. Local facts are now safe, but operational recovery remains visible and unresolved.
- The compact recovery banner is honest, but it does not yet distinguish “quick recap” from “repeat the whole training.”

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Evidence-neutral conceptual recap mode | 9 | 9 | 4 | 3 | Highest ratio; the browser showed recovery landing at the wrong stage for the stated need |
| Visible sync retry and contract diagnosis | 7 | 8 | 5 | 4 | Important reliability surface; local data loss is fixed but the stale service remains confusing |
| Feedback-ranked explanation variants | 9 | 4 | 8 | 6 | Requires real response volume not yet available |

### Next highest-value opportunity

When a learner enters through confusion recovery, start a clearly labeled quick recap at the source explanation regardless of prior progress, allow them to replay the teaching stages without writing duplicate evidence, and keep ordinary resume behavior unchanged.

## Active evaluation contract — evidence-neutral conceptual recap

Status: active in Run 39.

Hypothesis:

If confusion recovery opens the prerequisite explanation rather than the stored achievement stage, the learner receives the help they explicitly asked for without corrupting their evidence history.

Observed baseline:

- Verified recovery context and return are visible.
- A completed source lesson resumes at stage 05 `独立迁移`.
- The explanation needed for conceptual review is not initially visible.
- Replaying normal stages would emit duplicate learning signals.
- Recap fitness: correct source 1/1; explanation-first 0/1; visible recap boundary 0/1; evidence-neutral replay 0/1; ordinary resume preserved 1/1 — total 2/5.

Primary metric:

- Recap fitness target: 5/5 in component and real-browser evidence.

Guardrails:

- Stored progress is never reset or rewritten.
- Recap transitions emit no learning signals.
- Ordinary training without recovery context still resumes.
- Return remains available at every recap stage.

Revert threshold:

Revert if recap starts after explanation, emits any learning signal, changes stored progress, or ordinary resume no longer returns to its latest stage.

## Run 39 — Evidence-neutral conceptual recap

Date: 2026-08-15

### Improvement

Separated conceptual recovery from ordinary progress resume:

- verified recovery context now opens a `快速复习模式` at stage 01 `先用人话听懂` even when the source lesson was previously at stage 05;
- the learner can replay explanation, observation, prediction, and build interactions locally;
- recap stage changes, example runs, completion, and transfer actions are guarded from emitting duplicate learning signals;
- the banner states that replay does not write new mastery evidence;
- ordinary training without recovery context keeps its persisted-stage resume behavior.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Correct source lesson | 1/1 | 1/1 | Preserved |
| Explanation-first recovery | 0/1 | 1/1 | Target met |
| Visible recap boundary | 0/1 | 1/1 | Target met |
| Evidence-neutral replay | 0/1 | 1/1 | Target met |
| Ordinary resume preserved | 1/1 | 1/1 | Guardrail preserved |
| Recap fitness | 2/5 | 5/5 | +3 capabilities |
| Full tests | 688/688 | 688/688 | No regression |

- Red evidence: the recovery component could not find `快速复习模式` and rendered stored stage 05 instead of explanation.
- Focused training-cabin tests pass 8/8, including live transition to observation with zero `onSignal` calls. The pre-existing ordinary-resume test remains green.
- Full tests pass: 168 files / 688 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Real browser on a source lesson with completed stages: recap rendered stage 01, did not render stage 05 content, stated the no-new-evidence boundary, advanced visibly to stage 02, kept return available, reset to explanation on hard reload, and returned with the original `unclear` feedback intact.
- Production CSS changed from 156.10/27.88 kB gzip to 156.23/27.90 kB gzip (+0.13/+0.02 kB). Initial JavaScript remained 361.69/113.77 kB gzip. Training cabin changed from 15.23/5.15 kB gzip to 15.35/5.21 kB gzip (+0.12/+0.06 kB).
- The Mentor v2 gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The recovery action now satisfies the learner's expressed need instead of mechanically resuming their achievement stage, and it does so without inflating the learning record.

### Learned

- Resume and review are different product intents even when they display the same curriculum content.
- A trustworthy learning system sometimes must deliberately refuse to credit an interaction; later independent evidence is the correct place to measure improvement.
- Browser screenshots exposed the pedagogical mismatch faster than domain tests because the code's resume behavior was technically valid but experientially wrong.

### Discovered problems

- The app still exposes `同步待重试` without a direct retry or explanation, even though pending local facts are now safe.
- The recap returns the learner to the same `unclear` handoff, but there is no explicit `现在我明白了` transition distinct from the broader `这正是我需要的` response.
- Conceptual recap is deterministic; it does not yet adapt the analogy itself based on the learner's exact misunderstanding.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Visible sync diagnosis and retry | 8 | 9 | 5 | 3 | Highest current ratio; an unresolved status is visible on every tested page |
| Post-recap `现在我明白了` transition | 7 | 8 | 4 | 2 | Closes the semantic recovery outcome without claiming mastery |
| Evidence-grounded analogy adaptation | 9 | 4 | 8 | 6 | More AI-native, but needs misconception evidence and evaluation before model generation |

### Next highest-value opportunity

Turn `同步待重试` into an actionable reliability surface: explain that local progress is safe, show the blocking operation category without leaking internals, and provide one bounded retry that reports success or the honest remaining blocker.

## Active evaluation contract — actionable sync recovery

Status: active in Run 40.

Hypothesis:

If an authenticated sync failure clearly separates local safety from cloud status and gives one honest retry, learners can recover without guessing or fearing that recent work disappeared.

Observed baseline:

- Authenticated error state renders only `同步待重试`.
- Status typography is 8px and not an actionable control.
- Local-safety explanation 0/1; pending count 0/1; safe blocker category 0/1; explicit retry 0/1; retry outcome 0/1; anonymous truth 1/1 — recovery completeness 1/6.
- The outbox already has the required internal evidence, but App discards it before rendering.

Primary metric:

- Recovery completeness target: 6/6 in pure projection, component, App callback, and real-browser evidence.

Candidate ranking:

| Candidate | Impact | Confidence | Effort | Risk | Relative priority |
|---|---:|---:|---:|---:|---:|
| Actionable sync recovery | 8 | 9 | 5 | 3 | Highest visible reliability gap |
| Post-recap understanding transition | 7 | 8 | 4 | 2 | Valuable, but sync failure is visible globally |
| Adaptive analogy generation | 9 | 4 | 8 | 6 | Insufficient misconception/eval evidence |

Guardrails:

- No raw error, endpoint, operation ID, or payload reaches UI.
- Pending local data is described as device-safe, never cloud-saved.
- Retry cannot delete, skip, or reorder operations.
- Anonymous users do not see cloud recovery controls.
- Button is disabled while retry runs and reports both success and continued pending state.

Evaluation scenario:

- Project event/state/unknown blockers and hostile raw errors.
- Render authenticated failure, open it from the status, retry once, and assert success/pending messages.
- Render anonymous error and assert local-only truth.
- Exercise the existing real `同步待重试` state in the browser and attempt one bounded retry.

Revert threshold:

Revert if raw details appear, local pending data is called cloud-saved, retry mutates operation order, anonymous behavior changes, or the retry result cannot be distinguished from its pre-click state.

## Run 40 — Actionable learning-sync recovery

Date: 2026-08-15

### Improvement

Turned the global authenticated sync failure from a tiny passive label into a bounded recovery surface:

- `同步待重试` is now a 12px accessible button that opens the exact problem directly;
- a pure projector reduces outbox evidence to pending count and one safe category: account settings, learning records, progress snapshot, submission records, or sync service;
- raw error strings, endpoints, operation IDs, payloads, and stack details are not passed to the component;
- copy distinguishes device-safe pending records from cloud-confirmed synchronization;
- automatic debounce and manual retry now use the same idempotent synchronization callback;
- manual retry is disabled while running and returns either `云端同步已经恢复` or an honest remaining count;
- anonymous users continue to see only `仅保存在本机`.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Local-safety explanation | 0/1 | 1/1 | Target met |
| Pending count | 0/1 | 1/1 | Target met |
| Safe blocker category | 0/1 | 1/1 | Target met |
| Explicit retry | 0/1 | 1/1 | Target met |
| Distinct retry outcome | 0/1 | 1/1 | Target met |
| Anonymous truth | 1/1 | 1/1 | Guardrail preserved |
| Recovery completeness | 1/6 | 6/6 | +5 capabilities |
| Full tests | 688/688 | 696/696 | No regression |

- Red evidence: the safe projection module did not exist, the error status was a non-interactive span, and both recovery component tests could not find `查看同步问题`.
- Focused sync projector, account panel, outbox, and server-authority suites pass 24/24.
- Full tests pass: 169 files / 696 tests. Lint, web+gateway typecheck, production build, strict OpenSpec validation, and diff check pass.
- Real browser on the current authenticated failure: the trigger opened a panel stating local safety, `76 项等待同步`, and `当前阻塞：账户设置`; no raw internal detail appeared. One retry remained blocked and correctly announced `仍有 76 项等待同步，本机记录不会丢失`.
- Gateway health is independently green at HTTP 200 with PostgreSQL storage and `deepseek-chat`; therefore the remaining write blocker is narrower than total service unavailability.
- Component tests cover the success announcement and the continued-pending announcement; the real environment honestly exercised the latter.
- Production CSS changed from 156.23/27.90 kB gzip to 157.19/28.07 kB gzip (+0.96/+0.17 kB). Initial JavaScript changed from 361.69/113.77 kB gzip to 363.75/114.48 kB gzip (+2.06/+0.71 kB). Lazy feature chunks remain effectively unchanged.
- The Mentor v2 gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The product now tells the truth about where learning data exists, gives a direct recovery action, and produces an observable outcome instead of leaving the learner with an unexplained warning.

### Learned

- A green health endpoint does not prove authenticated writes work; reliability UX must preserve this distinction.
- Internal errors are not required for useful recovery. Pending count plus operation category was enough to make the state understandable without leaking implementation.
- Refactoring automatic and manual retry onto one callback prevented the UI from becoming a second, divergent sync implementation.

### Discovered problems

- The actual environment still has 76 pending operations and blocks first on profile synchronization even though Gateway health is green. The product now explains the condition but has not repaired its root cause.
- Because ordered outbox flushing stops at the first failure, one profile write prevents the user from knowing whether later learning-event writes would succeed.
- The account panel still uses the English label `SERVER IDENTITY`, which conflicts with the product's simplified-Chinese readability direction but is less urgent than restoring writes.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Diagnose and repair authenticated profile sync | 10 | 9 | 5 | 4 | Highest value: 76 real pending writes and a live-but-failing service path |
| Post-recap `现在我明白了` transition | 7 | 8 | 4 | 2 | Valuable semantic closure after reliability is restored |
| Localized account identity copy | 4 | 10 | 1 | 1 | Easy polish, but does not unblock user data |

### Next highest-value opportunity

Reproduce the authenticated profile PUT failure at the gateway boundary, identify whether the cause is CSRF/session, payload validation, route/version drift, or persistence, add a regression test at that exact boundary, and drain the existing outbox only through the corrected normal retry path.

## Active evaluation contract — version-tolerant profile synchronization

Status: active in Run 41.

Hypothesis:

If mutable profile/state snapshots are classified before exact-id immutable conflict checks, a queue created across frontend versions can adopt the current valid snapshot and resume normal ordered synchronization without losing learning evidence.

Observed baseline:

- The real authenticated browser reports 76 pending operations and blocks first on `账户设置`.
- Manual retry remains at 76 pending.
- Gateway health is HTTP 200 with PostgreSQL storage, and the authoritative profile route test accepts the same current payload with session and CSRF.
- The outbox currently throws before network I/O when a mutable snapshot reuses an id with changed payload; no same-id mutable-evolution regression test exists.
- After mutable replacement advanced the blocker from `账户设置` to `学习记录`, safe failure projection identified a second pre-network `本机队列需要更新` conflict. Source history shows the transport contract moved learner ownership from a redundant payload field into the operation envelope.

Primary metric:

- Real pending operations: 76 → 0 through the existing product retry, or a newly surfaced downstream server-contract blocker with the profile operation demonstrably advanced.

Guardrails:

- Never clear, skip, or manually edit the existing outbox.
- Immutable event and attempt operations keep strict same-id conflict behavior.
- A legacy top-level payload `learnerId` may be removed only when it exactly equals the immutable operation envelope owner; all evidence fields remain exact.
- Surviving immutable operations keep relative order and exact payloads.
- Raw errors remain absent from the UI.
- A server rejection remains visible as pending rather than being called success.

Evaluation scenario:

- Queue profile/state snapshots whose ids are reused with evolved payloads and verify latest-snapshot replacement.
- Queue an event whose id is reused with different evidence and verify strict rejection plus original preservation.
- In the existing authenticated browser, activate `立即重试` and observe the real pending count/status.

Revert threshold:

Revert if any immutable operation is removed or reordered, an evolved mutable snapshot is not the one flushed, the UI claims cloud success with pending writes, or the browser pending count cannot advance because of the same local idempotency conflict.

## Run 41 — Version-tolerant authenticated learning sync

Date: 2026-08-15

### Improvement

Repaired the real authenticated synchronization path instead of only explaining its failure:

- profile and state snapshots now use their existing latest-snapshot contract even when an operation id is reused across frontend versions;
- pending immutable events and attempts are preserved byte-for-byte and are not re-enqueued over an existing operation id before flush;
- a redundant legacy payload owner may be canonicalized only when it exactly equals the immutable operation envelope owner;
- current first-minute, training-session, and bridge-diagnostic events now survive anonymous-to-account migration;
- retry failures are projected into six bounded learner-facing reasons without exposing raw messages or internals;
- an explicit stale-CSRF response refreshes the in-memory token and retries the write once, while network and other unsafe failures remain non-retried;
- the local Gateway image was rebuilt from the current source so runtime and frontend contracts match.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Real pending writes | 76 | 0 | Target met |
| First blocking category | 账户设置 | None | Recovered |
| Current event migration coverage | 0/4 | 4/4 | Target met |
| Bounded retry-reason classes | 0 | 6 | Added without raw leakage |
| Same-id immutable content conflict | Rejected | Rejected | Guardrail preserved |
| Non-CSRF unsafe retry count | 1 request | 1 request | Guardrail preserved |
| Full tests | 696/696 | 706/706 | No regression |

- Red evidence reproduced three separate failure modes: same-id mutable payload conflict, current learning events quarantined during migration, and stale CSRF write rejection.
- Focused outbox, platform client, safe recovery, account panel, and gateway validation suites pass.
- Full tests pass: 169 files / 706 tests. Lint, web+gateway typecheck, production build, all 32 strict OpenSpec changes, and diff check pass.
- Real browser evidence: the queue advanced from profile to event without deletion, expanded from 76 to 94 when previously missing current events were durably enqueued, then drained to `云端已同步` through the normal product flow. A later hot update reproduced stale CSRF; the bounded classifier identified it and one normal retry recovered 75 remaining writes without a page reload.
- Gateway health and runtime remained green after rebuilding the local container.
- Production CSS remained 157.19/28.07 kB gzip. Initial JavaScript changed from 363.75/114.48 kB gzip to 366.26/115.21 kB gzip (+2.51/+0.73 kB); no new dependency was added.
- The Mentor v2 gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The improvement recovered the actual user's cloud queue, preserved immutable learning evidence, and made future token/contract failures both understandable and recoverable.

### Learned

- A healthy service plus a valid route test is insufficient when client-side idempotency can fail before network I/O.
- Mutable snapshots and immutable evidence need different upgrade semantics; applying one global duplicate rule caused the outage.
- Recovery UX became diagnostically useful only after raw failures were reduced to bounded reasons.
- Frontend and gateway event whitelists are a schema contract and must evolve together; duplicated lists remain a maintainability risk.
- Session recovery must cover short-lived CSRF rotation, not only full page startup.

### Discovered problems

- Learning-event compatibility is still duplicated between web and Gateway; future schema additions could drift again without a generated/shared contract.
- The large synchronization orchestration still lives inside `App.tsx`, which makes isolated integration testing harder than necessary.
- The account panel still displays `SERVER IDENTITY`, an avoidable English implementation label.
- The post-recap flow still lacks a precise `现在我明白了` outcome distinct from generic recommendation feedback.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Shared/generated learning-event contract | 8 | 9 | 5 | 3 | Prevents recurrence of a just-observed data-loss risk |
| Extract and integration-test sync orchestrator | 8 | 8 | 6 | 4 | Reduces App complexity and proves ordered recovery as one unit |
| Post-recap `现在我明白了` outcome | 7 | 8 | 4 | 2 | Strong learner-visible closure after reliability is restored |
| Localize account identity copy | 4 | 10 | 1 | 1 | Easy readability win but lower product value |

### Next highest-value opportunity

Replace duplicated frontend/Gateway learning-event whitelists with one generated or shared contract and prove that adding a new event cannot silently quarantine it during account migration.

## Active evaluation contract — shared learning-event vocabulary

Status: active in Run 42.

Hypothesis:

If device parsing, account migration, and Gateway validation import one literal event vocabulary and an exhaustive fixture crosses all three boundaries, adding an event can no longer silently update only part of the persistence path.

Observed baseline:

- Three independent event-kind lists exist: learner memory, platform outbox migration, and Gateway validation.
- Three independent data-key lists exist at the same boundaries.
- Run 41 measured a real drift: 4/4 current training/diagnostic fixtures were quarantined before the manual list repair.
- There is no test requiring one valid fixture for every canonical event kind.
- Gateway Docker allowlisting currently excludes any repository-level `contracts/` source.

Primary metric:

- Event-kind vocabulary sources: 3 → 1, with 100% canonical kinds accepted by device parsing, account migration, and Gateway authority in one conformance test.

Guardrails:

- No stored-event or wire-format change.
- No semantic validator is weakened merely to make parity pass.
- Unknown kinds and unknown data keys remain rejected.
- No runtime dependency is added.
- Gateway production-like image must build and become healthy with the shared import.
- Real authenticated browser synchronization remains `云端已同步`.

Evaluation scenario:

- Count kind/data-key definitions before and after.
- Build an exhaustive fixture record keyed by the canonical literal union; TypeScript/test failure must expose a missing fixture.
- For every fixture, parse device memory, plan account migration without quarantine, and validate at the Gateway route boundary.
- Rebuild the Gateway image, check health, and exercise the current browser sync state.

Revert threshold:

Revert if either package cannot typecheck/build, the Gateway image cannot start, any current valid kind is rejected at a boundary, unknown fields become accepted, stored formats change, or authenticated sync regresses.

## Run 42 — One learning-event vocabulary across every persistence boundary

Date: 2026-08-15

### Improvement

Replaced three manually synchronized event vocabularies with one dependency-free repository contract:

- learner-memory parsing, account migration, and Gateway validation now import the same readonly kind, data-key, target, language, outcome, stage, phase, reflection, and diagnostic vocabularies;
- a compile-time exhaustive fixture function plus runtime loop exercises every one of the 29 canonical event kinds;
- every fixture must pass device parsing, migration planning without quarantine, and authoritative Gateway validation;
- unknown kinds and unknown data keys remain rejected at device, migration, and Gateway boundaries;
- the Gateway Docker allowlist and image explicitly include only the canonical contract source;
- semantic validation remains separate at each trust boundary instead of being weakened into one permissive parser.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Event-kind vocabulary definitions | 3 | 1 | Target met |
| Event-data-key vocabulary definitions | 3 | 1 | Target met |
| Canonical kinds accepted at all 3 boundaries | Unmeasured | 29/29 | Target met |
| Unknown kind rejected at all 3 boundaries | Partial tests | 3/3 | Guardrail proven |
| Production-like Gateway package proof | No shared source | Image build + healthy runtime | Target met |
| Full tests | 706/706 | 708/708 | No regression |

- Red evidence: the exhaustive test failed before collection because `contracts/learning-event-contract` did not exist.
- Focused conformance, outbox, learner-memory, and Gateway validation suites pass 44/44.
- Full tests pass: 170 files / 708 tests. Lint and both package typechecks pass.
- Web production build passes with 121 transformed modules. CSS remains 157.19/28.07 kB gzip; initial JavaScript decreased from 366.26/115.21 kB gzip to 365.11/114.94 kB gzip (-1.15/-0.27 kB) after duplicate constants were bundled once.
- Production-like Gateway image copied `/app/contracts/learning-event-contract.ts`, rebuilt successfully, became healthy, and returned HTTP 200 with PostgreSQL and `deepseek-chat`.
- Real browser on the authenticated current account loaded the Today journey, remained interactive, and settled at `云端已同步` after the rebuilt Gateway started.
- All 33 OpenSpec changes validate strictly and diff check passes.
- The Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The specific failure class observed in Run 41 is now structurally prevented: adding an event vocabulary member updates all three consumers, and missing boundary semantics fails an exhaustive test instead of silently quarantining learner history.

### Learned

- Literal types can be shared across separately built packages without a schema dependency when the monorepo and container paths are explicit.
- Equality of enum lists was too weak; an exhaustive valid fixture proved the event can actually traverse each boundary.
- One shared vocabulary does not make trust boundaries identical. Device ownership, migration envelopes, and server authority still justify separate semantic validators.
- Removing duplicate constants slightly improved the initial bundle while increasing reliability.

### Discovered problems

- Semantic rule bodies are still duplicated; the exhaustive positive fixture catches missing acceptance but not every possible rejection mismatch.
- The synchronization orchestration remains embedded in `App.tsx`, so queue ordering and concurrent automatic/manual retry are not covered by one integration-level unit.
- The learner-facing recap flow still lacks a precise `现在我明白了` closure after remedial review.
- The account panel still includes the implementation-facing English label `SERVER IDENTITY`.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Extract and integration-test sync orchestrator | 8 | 9 | 6 | 4 | Recent live failures came from ordering/concurrency inside App; high reliability leverage |
| Post-recap `现在我明白了` closure | 7 | 8 | 4 | 2 | Highest learner-visible improvement now that durability is stable |
| Generate semantic validators from declarative per-kind rules | 8 | 6 | 8 | 5 | Stronger parity but larger risk; exhaustive fixtures already cover positive acceptance |
| Localize account identity copy | 4 | 10 | 1 | 1 | Easy polish, but lower measured product value |

### Next highest-value opportunity

Extract authenticated synchronization from `App.tsx` into an independently testable orchestrator, define exact ordering/concurrency behavior, and prove automatic plus manual retry cannot race, duplicate, or strand durable writes.

## Active evaluation contract — serialized latest-snapshot synchronization

Status: active in Run 43.

Hypothesis:

If automatic and manual synchronization share one latest-snapshot coalescing orchestrator, overlapping triggers cannot race the outbox or CSRF lifecycle, and a state change that arrives mid-flush will still be synchronized immediately afterward.

Observed baseline:

- `synchronizePlatform` is a React callback containing operation assembly, flush, conflict adoption, and UI projection.
- The 700 ms automatic effect and AccountPanel manual retry both call it directly.
- There is no in-flight guard, mutex, queued-latest snapshot, or isolated concurrency test.
- Run 41 observed live session/queue churn during hot-update overlap; the exact production frequency is unmeasured, so concurrency correctness is the primary proxy.

Primary metric:

- Maximum simultaneous synchronization executions under three overlapping calls: potentially 3 → exactly 1; executed snapshots: A+B+C → A+C, with all callers settling after C.

Guardrails:

- Latest snapshot is never dropped.
- Intermediate pending snapshots may be coalesced only before execution.
- Immutable outbox operations are not cleared, reordered, or overwritten.
- Existing safe sync reasons and optimistic state-conflict adoption remain.
- Anonymous users still do not call cloud synchronization.
- No new dependency or API/storage format change.

Evaluation scenario:

- Block execution A, invoke B then C, measure active execution count/order, release A, and assert A then C plus shared settlement.
- Execute a real one-pass profile/event/state/attempt sync and assert outbox drains and state versions return.
- Exercise a bounded failure and assert it returns a safe pending issue rather than throwing.
- In the authenticated browser, trigger an ordinary state change and confirm the status settles at `云端已同步`.

Revert threshold:

Revert if two executions overlap, C is not executed, callers settle before C, any durable write disappears, conflict adoption changes, anonymous behavior regresses, or the real browser remains pending/error.

## Run 43 — One serialized, latest-snapshot cloud synchronization path

Date: 2026-08-15

### Improvement

Extracted authenticated learning-data synchronization from `App.tsx` into one independently tested execution module and one stable orchestrator shared by automatic sync and manual retry:

- only one synchronization execution may be active at a time;
- when multiple updates arrive during an active execution, intermediate snapshots are coalesced and the latest snapshot runs immediately afterward;
- every overlapping caller settles only after the latest queued snapshot has finished;
- state versions returned by the active execution become the expected versions for the trailing execution, avoiding false optimistic-concurrency conflicts;
- profile, immutable events, progress, practice, exam state, attempts, safe issue projection, and conflict adoption retain their existing contracts;
- anonymous users remain outside the cloud synchronization path.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Maximum concurrent sync executions under A/B/C overlap | Potentially 3 | 1 | Target met |
| Executed snapshots under A/B/C overlap | A + B + C | A + C | Latest-only coalescing proven |
| Caller settlement | Unspecified | All settle after C | Target met |
| Trailing expected state versions | Could reuse 0 | 0 then 1 | False-conflict guardrail proven |
| Full tests | 708/708 | 712/712 | No regression |
| Real authenticated browser | Cloud-synced baseline | `云端已同步`, no retry state | Guardrail proven |

- Red evidence: the focused suite first failed because no reusable synchronization module existed; the state-version test then exposed that serialization alone still reused stale version zero.
- Focused tests now prove one-active/latest-trailing ordering, durable profile/event/state/attempt flushing, version carry-forward, and bounded safe transport failure.
- Full tests pass: 171 files / 712 tests. Lint and both package typechecks pass.
- Web production build passes with 122 transformed modules. CSS remains 157.19/28.07 kB gzip; initial JavaScript is 366.05/115.19 kB gzip, a +0.94/+0.25 kB change from Run 42 for the extracted orchestration.
- Gateway health returns HTTP 200 with PostgreSQL storage, permissive local identity, and `deepseek-chat`.
- Real browser at `http://127.0.0.1:4174/#/today` shows `云端已同步`, no retry state, and 21 interactive controls.
- All 34 OpenSpec changes validate strictly and diff check passes.
- The Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The change removes a race class between automatic and manual synchronization while guaranteeing that the newest learner state is not lost and optimistic versions advance in order.

### Learned

- A single-flight mutex alone is insufficient for state synchronization; the latest pending snapshot and the server versions returned by the active execution must both feed the trailing execution.
- Extracting the side-effect sequence made the durable-write order and safe-failure behavior testable without React timing or a live service.
- Sharing one stable orchestrator is what prevents manual retry and debounce from creating separate concurrency domains.

### Discovered problems

- Every synchronization cycle still reconstructs operations for the complete historical event and attempt set; server idempotency protects correctness, but network, hashing, and CSRF exposure grow with learner history.
- Cross-tab synchronization is not serialized; two browser tabs can still operate independent in-memory orchestrators against the same account.
- Development hot reload can transiently retain a stale client/session pair and briefly show a retry state, although one ordinary retry now recovers safely.
- The learner-facing recap still lacks a precise `现在我明白了` closure, and the account panel still contains the English implementation label `SERVER IDENTITY`.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Server acknowledgement cursor for immutable history | 8 | 9 | 6 | 4 | Prevents sync cost and failure exposure from growing linearly with learning history |
| Post-recap `现在我明白了` closure | 7 | 8 | 4 | 2 | Most visible learner-loop gap after reliability is stable |
| Cross-tab synchronization lease | 6 | 6 | 6 | 5 | Completes concurrency safety but has lower observed frequency |
| Localize account identity copy | 4 | 10 | 1 | 1 | Small readability win with low product leverage |

### Next highest-value opportunity

Stop reconstructing and re-sending already acknowledged immutable events and attempts on every synchronization cycle. Define a local/server acknowledgement contract, prove unsent history is never skipped, and measure operations for an unchanged 100-event learner dropping from 100+ to zero after the first successful sync.

## Active evaluation contract — fingerprint-bound immutable sync acknowledgement

Status: active in Run 44.

Hypothesis:

If the client records a bounded acknowledgement only after the authoritative server accepts an immutable event or attempt, and binds it to the canonical payload fingerprint, unchanged history can stop replaying without allowing an unsent or changed payload to disappear.

Observed baseline:

- `executePlatformSync` iterates every `memory.events` and `practice.attempts` item on every run.
- The outbox removes an operation after a successful response but retains no durable acknowledgement that the underlying immutable record was accepted.
- Therefore an unchanged second synchronization reconstructs and sends every historical immutable item again.
- Server endpoints are idempotent and reject a conflicting replay, so correctness is protected at the cost of linearly growing client/network work.

Primary metric:

- Immutable API calls for an unchanged snapshot containing 100 events after one successful synchronization: 100 → 0.

Guardrails:

- A newly added event after the first synchronization is sent exactly once.
- A failed event or attempt is never acknowledged and remains retryable in the outbox.
- The same payload ID with different canonical content is not skipped.
- Acknowledgements are scoped by learner and immutable kind, bounded, and tolerant of corrupt or unavailable storage.
- Existing queued operations remain authoritative over acknowledgement metadata and may safely replay.
- Profiles, mutable states, conflict adoption, anonymous behavior, API contracts, and backups do not change.

Evaluation scenario:

- Synchronize a 100-event snapshot twice against a counting client and compare immutable calls.
- Add event 101 and prove only that event is sent.
- Fail an immutable write, retry, and prove it was not skipped.
- Change a payload under the same ID and prove it reaches the server instead of matching the old acknowledgement.
- Seed from an authoritative bootstrap and prove its events and attempts do not replay on the next normal synchronization.

Revert threshold:

Revert if any unsent or changed immutable record is skipped, a failed operation leaves the durable queue, corrupt acknowledgement data blocks synchronization, the ledger grows without a bound, or existing full-stack/browser behavior regresses.

## Run 44 — Fingerprint-bound acknowledgement for immutable learning history

Date: 2026-08-15

### Improvement

Added a local, bounded optimization ledger that records immutable events and attempts only after the authoritative service accepts their exact canonical payload:

- acknowledgements are scoped by learner, immutable kind, payload ID, and SHA-256 payload fingerprint;
- an unchanged acknowledged event or attempt is omitted when the next synchronization snapshot is assembled;
- a changed payload under the same ID no longer matches the old acknowledgement and is sent to the server for authoritative handling;
- failed writes are never acknowledged and remain in the durable outbox;
- already queued outbox operations still run even if acknowledgement metadata exists, preserving at-least-once delivery;
- authenticated bootstrap seeds exact server-owned immutable records before ordinary synchronization resumes;
- corrupt, unavailable, or cleared acknowledgement storage safely degrades to duplicate replay rather than data loss;
- the ledger is versioned, strictly parsed, cached per synchronization instance, and bounded to the 10,000 most recently acknowledged records.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Immutable calls on unchanged second sync with 100 events | 100 | 0 | Target met |
| Immutable calls after adding one new event | 2 reconstructed in fixture | 1 | Only new evidence sent |
| Failed immutable operation retried | Could replay through outbox | 2/2 attempts sent | Guardrail preserved |
| Changed content under the same payload ID | Unmeasured | 1 server call | Fingerprint guardrail proven |
| Bootstrap-owned event + attempt replayed | 2 | 0 | Target met |
| Acknowledgement growth | No ledger | Maximum 10,000 entries | Bound proven |
| Full tests | 712/712 | 724/724 | No regression |

- Red evidence: before implementation, the second unchanged 100-event synchronization made another 100 event calls; the new acknowledgement module did not exist, and the bootstrap/new-event guard scenarios failed.
- Focused acknowledgement, outbox, synchronization, server-authority, and client suites pass: 5 files / 35 tests.
- Full tests pass: 172 files / 724 tests. Lint and both package typechecks pass.
- Web production build passes with 123 transformed modules. CSS remains 157.19/28.07 kB gzip; initial JavaScript is 368.93/115.99 kB gzip, a +2.88/+0.80 kB change from Run 43 for hashing, parsing, and acknowledgement integration.
- Gateway health returns HTTP 200 at `/healthz` with PostgreSQL Mentor storage, permissive local identity, and `deepseek-chat`.
- The authenticated browser at `http://127.0.0.1:4174/#/today` loaded the AI diagnosis journey and showed `云端已同步`; the account dialog confirmed server-side progress synchronization.
- All 35 OpenSpec changes validate strictly and diff check passes.
- The Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. Immutable synchronization work for an unchanged learner no longer grows linearly on every cycle, while the loss-prevention rules remain asymmetric: uncertain metadata causes safe replay, never skipping.

### Learned

- An ID-only cursor is unsafe for immutable evidence because changed content under a reused ID must still reach the authoritative server; the acknowledgement must bind the canonical payload fingerprint.
- A durable outbox is more authoritative than optimization metadata. Existing queued work must run even when an acknowledgement exists.
- Bootstrap data is already authoritative and should seed acknowledgements before reactive synchronization can reconstruct it.
- Caching parsed acknowledgements removes repeated storage parsing, but storage metadata remains disposable and must never become the source of truth.

### Discovered problems

- The outbox currently keeps only the newest 1,000 operations with `slice(-1000)`; a learner with a very long offline history could silently lose older unsent immutable evidence before any server acknowledgement exists.
- The first large successful migration still persists acknowledgement metadata once per accepted outbox operation; batched receipts could reduce local writes.
- Separate browser tabs can overwrite acknowledgement metadata from stale in-memory ledgers. The result is safe replay, but it wastes work until cross-tab coordination exists.
- The learner-facing recap still lacks a precise `现在我明白了` closure, while the account panel still exposes the English implementation label `SERVER IDENTITY`.
- Formal Mentor quality and hidden-judge evidence gates remain below release thresholds.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Prevent outbox capacity from silently evicting unsent evidence | 9 | 9 | 5 | 5 | Current 1,000-item truncation is a concrete offline data-loss path |
| Batch successful acknowledgement persistence | 6 | 8 | 4 | 3 | Reduces first-migration local write amplification |
| Post-recap `现在我明白了` closure | 7 | 8 | 4 | 2 | Highest learner-visible learning-loop gap |
| Cross-tab synchronization lease | 6 | 6 | 6 | 5 | Avoids safe but wasteful cross-tab replay and conflicts |

### Next highest-value opportunity

Remove the outbox's silent `slice(-1000)` eviction behavior. Define explicit capacity/backpressure semantics, prove an unsent immutable operation can never be discarded merely because newer work arrives, and keep the UI actionable when local durable capacity is genuinely exhausted.

## Active evaluation contract — lossless durable outbox capacity

Status: active in Run 45.

Hypothesis:

If the outbox replaces silent truncation with a typed pre-mutation capacity signal and the synchronizer treats that signal as a batch boundary, snapshots larger than 1,000 writes can reach the server without evicting older unsent evidence or requiring the learner to understand queue internals.

Observed baseline:

- `read()` filters valid operations and immediately keeps only the newest 1,000.
- Both mutable and immutable enqueue paths also persist only `slice(-1000)`.
- Therefore operation 1 disappears silently when distinct operation 1,001 arrives.
- Simply throwing at capacity would make synchronization retry the same assembly failure before it can drain the existing queue.

Primary metrics:

- Unsent operations preserved after enqueue 1,001: 999 of the original 1,000 → all 1,000.
- Accepted immutable events from one 1,001-event snapshot: at most 1,000 represented in one queue → 1,001 sent in ordered batches.

Guardrails:

- Exact immutable duplicates and mutable replacements do not consume a new slot.
- Capacity failure mutates no persisted operation.
- Oversized legacy outboxes remain fully readable and drainable.
- A failed batch remains ordered and retryable.
- State versions, conflicts, acknowledgements, anonymous behavior, APIs, and learning-domain storage formats do not regress.
- No dependency is added.

Evaluation scenario:

- Fill the outbox with 1,000 distinct operations, attempt operation 1,001, and compare the exact ordered list before and after.
- Exercise exact duplicate and mutable replacement at capacity.
- Seed 1,001 valid operations directly and prove list/flush preserves all in order.
- Synchronize a 1,001-event snapshot and count authoritative event calls across batches.
- Fail the first capacity-triggered batch, retry with a healthy client, and prove all source events eventually arrive.

Revert threshold:

Revert if any existing queued operation disappears before authoritative acceptance, a full queue cannot make progress, a failed batch loses ordering/retryability, duplicate/mutable coalescing regresses, or full-stack/browser checks fail.

## Run 45 — Lossless durable outbox capacity and automatic batching

Date: 2026-08-15

### Improvement

Removed the outbox's silent oldest-operation eviction and replaced it with an explicit, lossless batching contract:

- reading an existing outbox no longer truncates valid persisted operations;
- a distinct operation at the 1,000-operation active capacity raises a typed signal before storage is mutated;
- exact immutable duplicates remain no-ops, and mutable profile/state streams still replace their prior snapshot without consuming another slot;
- platform synchronization catches only the typed capacity signal, drains the current ordered batch, retries the same blocked operation, and continues assembling the same source snapshot;
- versions and state conflicts are accumulated across every batch;
- a failed capacity-triggered drain returns the normal bounded pending state with its entire unsent batch still durable;
- the next retry reconstructs records that had not yet entered the full queue from authoritative browser learning state.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Original unsent operations preserved when distinct operation 1,001 arrives | 999/1,000 | 1,000/1,000 | No silent eviction |
| Events accepted from one 1,001-event snapshot | 998/1,001 | 1,001/1,001 | Target met |
| Oversized persisted operations readable | 1,000/1,001 | 1,001/1,001 | Recovery proven |
| Oversized persisted operations drained in order | 1,000/1,001 | 1,001/1,001 | Target met |
| Failed full batch retained before retry | Order/data could churn | 1,000/1,000 | Retry guardrail proven |
| Full tests | 724/724 | 729/729 | No regression |

- Red evidence: five new scenarios failed. Operation 1,001 did not signal capacity, read discarded one legacy operation, the full snapshot lost events 0–2, and offline retry produced a reordered/incomplete sequence.
- Focused outbox, synchronization, acknowledgement, and recovery suites pass: 4 files / 44 tests.
- Full tests pass: 172 files / 729 tests. Lint and both package typechecks pass.
- Web production build passes with 123 transformed modules. CSS remains 157.19/28.07 kB gzip; initial JavaScript is 369.32/116.16 kB gzip, a +0.39/+0.17 kB change from Run 44.
- Gateway health returns HTTP 200 at `/healthz` with PostgreSQL Mentor storage, permissive local identity, and `deepseek-chat`.
- The authenticated browser at `http://127.0.0.1:4174/#/today` shows `云端已同步`, no retry state, and the AI-arranged first training mission.
- All 36 OpenSpec changes validate strictly and diff check passes.
- The Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The outbox now honors its core durability invariant under both over-capacity and offline retry: newer work cannot remove older unsent evidence, and capacity creates an automatic batch boundary instead of a synchronization deadlock.

### Learned

- Replacing truncation with a hard error alone is insufficient; snapshot assembly must be able to drain the full queue before retrying the exact blocked operation.
- The outbox and the source learning stores have complementary roles: the outbox protects accepted enqueue work, while source state reconstructs records that could not yet enter a full batch.
- Mutable coalescing and immutable deduplication must run before capacity checks because neither consumes a new durable slot.
- Reading oversized legacy data without a limit is necessary for recovery even when new enqueue capacity remains bounded.

### Discovered problems

- A 1,001-event focused synchronization takes roughly three seconds in the test environment because every accepted operation rewrites the shrinking outbox and growing acknowledgement JSON; correctness is now strong but first-migration write amplification is measurable.
- Large synchronous `localStorage` serialization can still create main-thread pauses; IndexedDB or a server batch receipt is the longer-term storage boundary.
- Cross-tab synchronization can still cause safe duplicate work because each tab owns an independent orchestrator and acknowledgement cache.
- The learner-facing recap still lacks a precise `现在我明白了` closure after remediation, which is now the highest-value visible learning-loop gap.
- Formal Mentor quality and hidden-judge evidence gates remain below release thresholds.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Post-recap `现在我明白了` closure | 8 | 8 | 4 | 2 | Makes the teaching loop visibly finish with learner-owned understanding evidence |
| Batch acknowledgement/outbox checkpoints | 7 | 8 | 6 | 5 | Addresses measured large-migration write amplification without weakening retry safety |
| Cross-tab synchronization lease | 6 | 6 | 6 | 5 | Prevents safe duplicate work across tabs |
| Localize account identity copy | 4 | 10 | 1 | 1 | Immediate readability polish but less learning value |

### Next highest-value opportunity

Complete the learner-visible remediation loop with a bounded `现在我明白了` reflection: show the diagnosed misconception, require the learner to select or state the corrected mental model, bind the closure to the evidence-neutral recap, and use it only as a metacognitive event—not as mastery proof.

## Active evaluation contract — learner-owned recap closure

Status: active in Run 46.

Hypothesis:

If quick recap ends by asking the learner to distinguish the original misconception from the corrected mental model, the remediation journey becomes visibly complete without pretending that self-report equals mastery.

Observed baseline:

- Verified recovery opens a quick recap at the human-language explanation.
- Replay actions correctly emit zero achievement signals.
- The learner can return at any time, but there is no interaction or event answering “what do I understand differently now?”
- Opening recap and forming a corrected model are therefore indistinguishable.

Primary metric:

- Active learner-owned closure actions in verified recap: 0 → 1 bounded corrected-model confirmation bound to the exact recommendation/source pair.

Guardrails:

- Selecting the original misconception emits no signal.
- Confirmation emits at most one bounded event for the exact recovery context.
- No free text is stored or sent.
- Mastery score, confidence, evidence count, lesson completion, and transfer status do not change.
- Ordinary non-recap training remains unchanged.
- Existing event/API/storage versions and dependencies remain unchanged.

Evaluation scenario:

- Open a valid recovery recap, advance from explanation, select the misconception, and prove no signal plus an explanation-return path.
- Select the corrected model, confirm, and inspect the exact bounded signal and visible mastery boundary.
- Rerender/reload with that event and prove the recorded state restores without duplicate emission.
- Feed the closure event into mastery derivation and compare against the no-evidence baseline.
- Exercise the real browser recovery route from the handoff feedback path.

Revert threshold:

Revert if recap reflection changes mastery, emits on wrong selection, duplicates on revisit, accepts stale/mismatched recovery evidence, removes the return path, or regresses ordinary training and full-stack checks.

## Run 46 — Learner-owned “现在我明白了” recap closure

Date: 2026-08-15

### Improvement

Completed the visible end of the evidence-neutral remediation journey:

- after revisiting the human-language explanation, verified recap now asks “刚才哪里想岔了？”;
- the learner must distinguish the lesson's known misconception from its corrected checkpoint explanation;
- choosing the misconception records nothing and offers a direct return to the human-language explanation;
- choosing the corrected model enables one explicit “我现在明白了” action;
- confirmation is bound to the exact recommendation, interrupted return lesson, and recap source lesson through a fixed bounded reason;
- the recorded state restores after rerender or hard reload and removes the duplicate confirmation action;
- the completion receipt explicitly says it records cognitive correction, does not increase mastery, and still requires independent transfer;
- ordinary training, course completion, transfer evidence, event/API versions, and dependencies remain unchanged.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Learner-owned closure actions in verified recap | 0 | 1 | Target met |
| Signals emitted after selecting the original misconception | N/A | 0 | Guardrail proven |
| Bounded events emitted after corrected confirmation | N/A | 1 | Exact evidence binding proven |
| Duplicate confirmation action after persisted revisit | N/A | 0 | Guardrail proven |
| Mastery score/confidence/evidence from closure alone | 0.25 / 0 / 0 | 0.25 / 0 / 0 | Mastery-neutral |
| Full tests | 729/729 | 732/732 | No regression |

- Red evidence: the projection helper did not exist and the live recap had no corrected-model question or confirmation UI; two focused scenarios failed before implementation.
- Focused training cabin, handoff projection, mastery, learner-memory, migration, and Gateway validation suites pass: 6 files / 70 tests.
- Full tests pass: 172 files / 732 tests. Lint and both package typechecks pass.
- Web production build passes with 123 transformed modules. The training-cabin route chunk is 17.80/5.89 kB gzip; CSS is 159.56/28.46 kB gzip. The initial app chunk remains code-split at 360.73/113.39 kB gzip.
- Gateway health returns HTTP 200 at `/healthz` with PostgreSQL Mentor storage, permissive local identity, and `deepseek-chat`.
- Real authenticated browser verification followed the complete path: `给信息贴标签` handoff → `我不明白为什么` → `先复习上一项训练` → human-language explanation → original-misconception branch → corrected-model branch → `我现在明白了`. Hard reload restored `这次认知修正已记录`, removed the duplicate action, and Today settled at `云端已同步` without a retry state.
- All 37 OpenSpec changes validate strictly and diff check passes.
- The Mentor v2 quality gate remains honestly red: 4 scored, 0/100 eligible real teacher-adjudicated cases. It was not bypassed.

### Decision

KEEP. The remediation loop now ends with an active learner decision and a durable, visible receipt while preserving the product's core honesty: self-reported understanding is metacognition, not proof of mastery.

### Learned

- Evidence-neutral does not need to mean interaction-free. A bounded reflection can make learning visible without duplicating achievement evidence.
- Asking learners to distinguish two mental models is more diagnostic than a generic “看懂了” button and safer than grading free text with an uncalibrated model.
- Recommendation ID, interrupted lesson ID, and source lesson ID are all needed to prevent a stale reflection from closing the wrong learning loop.
- Restoring the receipt after reload is part of the user experience; otherwise the system appears to forget what the learner just clarified.

### Discovered problems

- Recovery recap still shows the ordinary cold-start diagnosis and full mission chrome beneath the recovery banner, which competes with the focused “repair one misunderstanding” purpose.
- A bounded choice proves recognition, not recall or generation; the following independent transfer remains essential.
- Recap reflection uses the general handoff-feedback event and is not a retained longitudinal milestone after very large histories.
- The account panel still exposes the English implementation label `SERVER IDENTITY`.
- Formal Mentor quality and hidden-judge evidence gates remain below release thresholds.

### Next candidates

| Candidate | Expected impact | Confidence | Effort | Risk | Priority rationale |
|---|---:|---:|---:|---:|---|
| Focus recovery recap on one misunderstanding | 7 | 9 | 3 | 2 | Removes irrelevant diagnosis/mission chrome from the newly completed visible loop |
| Batch acknowledgement/outbox checkpoints | 7 | 8 | 6 | 5 | Addresses measured large-migration write amplification |
| Retain latest recap closure longitudinally | 5 | 9 | 2 | 2 | Prevents the receipt disappearing after very long histories |
| Cross-tab synchronization lease | 6 | 6 | 6 | 5 | Prevents safe duplicate work across tabs |

### Next highest-value opportunity

Make recovery recap a focused repair experience rather than an ordinary training session with an extra banner: suppress the unrelated cold-start diagnosis and generic mission chrome, keep the exact misunderstanding, explanation, corrected-model closure, and return action above the fold, and measure time/clicks from recap entry to a recorded correction.

## Run 47 — GOAI submission package and visible brand coherence

Date: 2026-08-16

### Hypothesis

If the competition materials use the same product name, show the real learner-visible Agent loop, and separate implemented evidence from unverified learning-effect claims, a reviewer can understand the product's value and trust boundary without exploring the full repository.

### Change

- Unified the visible application brand to `汇森AI 算法教练` for the captured demo surfaces.
- Captured real browser evidence for Today planning, the five-stage training cabin, run-gated Mentor, tool evidence, transfer recap, capability model, practicum, and the formal red quality gate.
- Produced a 12-slide editable PPTX with speaker-note sources, matching PDF, A4 one-pager, 4:16 narrated 1080p MP4, SRT subtitles, short introduction, demo script, technical architecture, compliance boundary, reviewer runbook, and submission checklist.
- Kept `0/100` teacher-adjudicated Mentor evidence and `0/754` gold judge coverage visible instead of converting engineering proxies into learning-effect claims.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Ordered final-package files | 0 | 12 | Target met |
| Intro length | Not authored | 409 characters | Under 500-character limit |
| PPT/PDF pages | Not authored | 12 / 12 | Matched and rendered |
| PPT speaker-note source blocks | 0 | 12 | Every slide sourced |
| Video | Not authored | 256.12 s, 1920×1080, H.264 + AAC | Target range met |
| Old `TIA/TIAI/OD 学习教练` branding in submission sources | Uncontrolled | 0 matches | Brand coherent |
| Zero-byte final files | N/A | 0 | Packaging guardrail held |
| High-risk `sk-*` secret patterns | Not freshly scanned | 0 paths | Guardrail held |
| Full tests | 732/732 | 732/732 | No regression |

- Lint, web+gateway typecheck, web production build, and `git diff --check` pass.
- The presentation was rendered and visually inspected slide by slide; the one-pager was rendered twice, with an overlap corrected before acceptance.
- The video contains both video and audio streams; five key timestamps were extracted and visually inspected.

### Decision

KEEP. The product can now be reviewed as one coherent education Agent rather than as disconnected repository features, while all known validation gaps remain explicit.

### Remaining external blockers

- The configured GitHub remote returns HTTP 404 to an unauthenticated request; make it public or attach a code bundle before official submission.
- The submitter must confirm team information, current official upload fields, and complete the final upload.
- A human should still watch the full 4:16 video with speakers before upload; automated checks proved streams, duration, resolution, subtitles, and representative frames, not subjective audio quality.
- Mentor teacher-adjudicated quality remains 0/100 and learning effectiveness remains unverified by real learners.

### Next highest-value opportunity

Remove the external-access blocker first: publish a reviewer-safe repository snapshot or attach a reproducible code bundle, then run one complete human rehearsal using the final PDF, video, and reviewer runbook before the official submission.

## Active evaluation contract — competition business narrative

Status: active in Run 48.

### Hypothesis

If the submission opens with one real learner problem, one concrete product outcome, and one visible Agent task loop, judges will understand why the product matters before they encounter architecture, validation, or compliance details.

### Observed baseline

- The first minute explains the learning gap and product mechanism, but does not state who pays, what economic value is created, or what result is delivered.
- Five of twelve slides primarily explain Mentor mechanics, engineering, safety, or internal quality controls.
- The main deck and video expose the internal `导师质量实验室` and `0/100` teacher-adjudication gate as a foreground product feature.
- The six competition Agent capabilities are present across the materials but are not mapped to one reviewer-readable task loop.
- No real image/voice input is implemented; the current product combines text, code, runtime output, and learning events. Multimodal image/voice teaching must remain explicitly planned rather than presented as shipped.
- The video is technically valid at 256.12 seconds, but the founder reports that it lacks attraction and a clear commercial mainline.

### Primary proxy metric

- First-minute value comprehension rubric: the first 60 seconds must explicitly answer all four questions — who has the problem, what painful job they are trying to finish, what the Agent does that a question bank/chatbot does not, and what concrete result is delivered.

Baseline: 2/4.

Target: 4/4.

### Supporting targets

- Main-deck slides foregrounding learner journey, delivered outcome, or commercial value: at least 7/12.
- Main-deck/video appearances of the internal quality laboratory: 1 → 0.
- Explicit reviewer mapping for task understanding, workflow orchestration, tool calls, knowledge enhancement, multi-turn interaction, and result delivery: partial prose → 6/6 visible mapping.
- Commercial model and first paid use case: absent → one dedicated slide and one concise video beat.
- Multimodal truthfulness: every image/voice claim labeled either `当前已实现` or `复赛重点实现`; zero ambiguous shipped claims.
- Visible-copy style: remove internal phrases such as `质量门禁`, `状态投影`, and `教师裁决金标` from the main narrative unless a plain-language explanation is essential.

### Guardrails

- Do not invent users, revenue, retention, learning effects, deployment status, image/voice capabilities, or employer adoption.
- Keep technical architecture, data sources, privacy, risk, deployment, and education boundaries in the package, but move them behind the product story.
- Preserve the founder's core principle: the product helps a learner independently solve the next task rather than copying an answer.
- Keep the PPTX editable, the PDF visually aligned, the video at 1080p with audio and subtitles, and the final package internally consistent.
- Preserve unrelated working-tree changes.

### Evaluation method

- Review the rewritten deck and narration against the same four-question first-minute rubric.
- Count slide jobs, required Agent-capability mappings, commercial beats, internal-quality-lab appearances, and ambiguous multimodal claims.
- Render every PPT/PDF page and inspect at full size; inspect representative video timestamps and verify media streams, duration, resolution, subtitles, file consistency, and secret scans.

### Revert threshold

Revert the narrative revision if the first-minute rubric remains below 4/4, if any planned multimodal capability is presented as implemented, if technical/compliance requirements disappear from the package, if visual validation finds unresolved defects, or if the updated materials contradict the runnable product.

## Run 48 — competition-first product and business narrative

Date: 2026-08-16

### Improvement

Rebuilt the complete GOAI submission narrative around the competition's own AI+education language and one human problem:

- the cover now names `面向个性化学习与教学辅助的教育 Agent` and leads with `让 AI 看懂你为什么不会，再带你真正学会`;
- the opening uses the founder's real non-CS learning difficulty instead of beginning with architecture or quality controls;
- personalized learning planning, homework tutoring, learning diagnosis, and vocational/programming education are one learner journey rather than separate product columns;
- task understanding, workflow orchestration, tool calls, knowledge enhancement, multi-turn interaction, and result delivery are mapped explicitly to product actions;
- the deck now includes the first paid use case and a staged individual → school/training → enterprise business path without claiming customers or revenue;
- multimodal content is split into `当前已实现` text/code/runtime/learning context and `复赛重点实现` image/voice teaching;
- the internal Mentor quality laboratory and `0/100` screen were removed from the main deck and video, while the technical and compliance documents preserve the honest validation boundary;
- rebuilt the 12-slide editable PPTX, matching PDF, A4 one-pager, narration, subtitles, and 1080p video.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| First-minute value comprehension | 2/4 | 4/4 | Target met by 48.29 seconds |
| Learner/result/commercial slides | 7/12 target | 10/12 | Target met |
| Internal quality-lab appearances in main deck/video | 1 | 0 | Removed from product narrative |
| Required Agent capability mapping | Partial prose | 6/6 explicit | Target met |
| Dedicated commercial path | 0 | 1 slide + 1 video scene | Target met |
| Ambiguous image/voice shipped claims | Not addressed | 0 | Current/planned labels verified |
| Video duration | 256.12 s | 215.07 s | Shorter and within 180–220 s target |
| Intro | 409 characters | 444 characters | Under 500; all required fields present |
| Final package | 12 files | 12 files | No zero-byte files or secret patterns |

- PPTX: 12 slides and 12 notes; every slide contains a `[Sources]` block.
- PPTX XML contains all six Agent terms, both multimodal truth labels, and no `导师质量实验室` or `0 / 100` foreground copy.
- Deck PDF: 12 pages. One-pager: 1 page.
- Video: 1920×1080 H.264 at 30 fps with AAC audio and Chinese neural narration; ten representative scene frames were inspected.
- Slide montage and six full-size representative slides were inspected; the A4 one-pager was rendered and inspected.
- Exported layout JSON shows every slide element remains inside the 1280×720 canvas. The bundled `slides_test.py` wrapper failed after rendering all twelve temporary paths, so this run does not claim that helper passed; direct renders, element-bound checks, and visual inspection provide the actual layout evidence.
- `git diff --check` has no whitespace errors; existing repository-wide line-ending warnings remain.
- Product code was not changed in this run, so the prior 732-test/lint/typecheck/build baseline was not rerun or converted into a new product claim.

### Decision

KEEP. The submission now opens with a real user, uses the competition's own terminology, explains the commercial value before the architecture, and preserves truthfulness about multimodal and learning-effect evidence.

### Learned

- Internal quality systems are necessary evidence but poor opening product features; they belong in technical due diligence, not the learner story.
- The phrase `Agent` only becomes convincing when every required capability is connected to one visible task and one delivered result.
- Founder language is more memorable than abstract claims, provided it remains clearly personal experience rather than fabricated market research.
- Multimodal ambition is stronger when the current/planned boundary is explicit; overclaiming would weaken the whole submission.

### Remaining external blockers

- A human should listen to the full revised Chinese narration and rehearse the first 60 seconds before upload; automated checks cannot score warmth or persuasion.
- The configured GitHub remote still requires public access or an attached executable code bundle.
- Image and voice understanding remain a复赛 implementation plan, not a shipped feature.
- Real teacher judgment, learner transfer, retention, willingness-to-pay, and commercial adoption remain unverified.

### Next highest-value opportunity

Run one complete founder rehearsal using the revised PDF and video, record where the listener first understands the user, Agent difference, delivered result, and business value, then make only the smallest copy or pacing change needed before upload.

## Run 49 — warm editorial launch system and demo-first video

Date: 2026-08-16

### Improvement

Rebuilt the submission presentation system after the founder rejected the mixed dark/light/blue/orange visual language and the concept-first video structure:

- replaced the deck with one warm editorial system: warm paper `#F4F1EA`, ink `#142033`, cobalt `#3659E3`, and green `#20866F`; removed orange and full-black slides;
- standardized the editable 12-slide deck on Noto Sans SC, stronger headline hierarchy, larger product screenshots, and one message per slide;
- kept the main deck product/business-led while moving model use, Agent runtime, tool interfaces, knowledge base, data processing, deployment, authorization, privacy, risk, boundary, reproducibility, and roadmap into a separate technical whitepaper;
- rebuilt the video so the product appears on frame one and remains on screen for all eleven scenes; removed pre-roll concept slides and internal quality-laboratory screens;
- aligned the narration with one visible learner journey: personalized plan → training cabin → code run → Mentor evidence → learner modification → transfer → diagnosis → practicum → technical boundary → multimodal roadmap;
- refreshed the one-pager and cleaned the final package of render folders, inspection logs, and the superseded architecture note.

### Evaluation

| Measure | Before | After | Result |
|---|---:|---:|---|
| Visual systems in main deck | mixed dark/light/blue/orange | one warm editorial system | Target met |
| Orange foreground tokens | present | 0 | Target met |
| Full-black slides | present | 0 | Target met |
| Product appears in video | after concept pre-roll | first frame | Target met |
| Product UI video share | not measured / below target | 100% of 198.984 s | Target met |
| Static concept scenes | multiple | 0 s | Target met |
| Video duration | 215.07 s | 199.10 s | Within 180–210 s |
| Technical due-diligence document | 8 KB Markdown note | 14-page PDF + source Markdown | Target met |
| Package hygiene | render artifacts present | 13 ordered deliverables, no temp artifacts | Target met |

- Automated material acceptance passed: 12 PPT slides, no disallowed orange tokens, Noto Sans SC present, warm canvas across all slides, 12-page deck PDF, 199.1-second H.264/AAC video, subtitles at 0.0 seconds, 14-page whitepaper, all required competition terms, 100% product-scene manifest, and 0-second static concept maximum.
- Representative deck slides, the one-pager, whitepaper cover/content, and video frames at 1, 80, and 192 seconds were visually inspected.
- The whitepaper states the honest current boundary: teacher-adjudicated Mentor evidence remains 0/100, image/voice understanding is planned for复赛, and AI does not replace final educational evaluation.
- Product code was not changed in this run; repository-wide product tests were not rerun as a new claim.

### Decision

KEEP. The submission now behaves like a product launch rather than an engineering status report: the learner problem and product are immediately visible, while technical depth remains available as a separate review layer.

### Learned

- Competition judges should see the product before they are asked to remember the architecture.
- A single restrained visual system makes technical depth easier to trust; mixed themes make the same content feel unfinished.
- Technical truth is stronger when it is moved into a dedicated whitepaper instead of competing with the product story on every slide.
- Product screenshots need narrated intent; a screen alone is evidence of implementation, but the narration must explain the user decision and delivered result.

### Remaining external blockers

- The founder should still watch and listen to the full 3:19 video once before upload; automated checks can verify timing, streams, frames, and captions but not subjective voice warmth.
- The official submission form, team details, and repository/public code access remain external actions.
- Real teacher adjudication, learner transfer outcomes, seven-day retraining, and willingness-to-pay remain unverified and are not claimed.

### Next highest-value opportunity

Complete one founder-led submission rehearsal with a non-technical listener. Ask the listener to state, without prompts, who the product serves, what the Agent does, what result it delivers, and why it is different from a question bank. Only change material if one of those four answers is missing.

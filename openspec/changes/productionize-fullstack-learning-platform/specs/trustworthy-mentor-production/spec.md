## ADDED Requirements

### Requirement: Mentor conclusions are evidence bound
Every Mentor hypothesis, hint and verification SHALL reference one immutable attempt snapshot plus the tool results, tests, analysis and current-code diff that support it.

#### Scenario: Evidence is insufficient
- **WHEN** available tools cannot support a diagnosis above the configured evidence threshold
- **THEN** Mentor states the missing evidence, performs an allowed acquisition step or stops without asserting a cause

### Requirement: Mentor can plan, replan and stop
The runtime SHALL let the model choose only currently legal tools, validate arguments, observe results, revise its plan and stop for completion, policy, budget, uncertainty or learner-action reasons.

#### Scenario: Proposed tool is illegal in current mode
- **WHEN** the model selects a hidden-answer or code-edit tool during independent assessment
- **THEN** policy denies the action, records the denial and prevents the tool from executing

### Requirement: AI failure degrades honestly
The runtime SHALL enforce token, time, cost and retry budgets and SHALL use an explicitly labeled deterministic fallback or unavailable state when the provider fails.

#### Scenario: DeepSeek returns rate limit
- **WHEN** provider retries exhaust the bounded policy
- **THEN** the run records provider failure and cost, then returns a deterministic minimal intervention or a truthful unavailable result

### Requirement: Mentor quality blocks release
The production Mentor SHALL NOT be promoted until at least 100 eligible real teacher-adjudicated cases cover required languages, learner bands, error families and verdicts while all localization, cause, evidence, hint, leakage and false-conclusion thresholds pass.

#### Scenario: Synthetic regression is perfect but real set is incomplete
- **WHEN** synthetic metrics pass and eligible real cases remain below the minimum
- **THEN** the Mentor production release gate remains red

### Requirement: Mastery is not model-authored
The model SHALL propose evidence and teaching actions, but only deterministic projection from validated learning events, independent transfer checks and delayed reviews SHALL update authoritative mastery.

#### Scenario: Model claims learner mastered a skill
- **WHEN** no required transfer and delayed evidence exists
- **THEN** authoritative mastery remains unchanged and the unsupported claim is excluded from the learner record
